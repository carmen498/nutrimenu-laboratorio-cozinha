// Webhook do Mercado Pago — recebe notificações de pagamento.
// Endpoint público, sem autenticação de usuário (chamado pelo Mercado Pago).
//
// Valida o header "x-signature" (HMAC-SHA256) contra o manifest
// "id:{data.id};request-id:{x-request-id};ts:{ts};" usando MERCADOPAGO_WEBHOOK_SECRET,
// conforme especificação do Mercado Pago.
//
// TODO: depois de validar a assinatura, buscar o pagamento na API do Mercado Pago
// pelo ID recebido (nunca confiar nos dados do corpo da notificação) e atualizar
// o registro interno correspondente (entidade Pagamento).

import { secrets } from "base44:runtime";

async function validarAssinatura(req: Request, dataId: string | null): Promise<boolean> {
  const secret = secrets.get("MERCADOPAGO_WEBHOOK_SECRET");
  if (!secret) return false;

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId ?? ""};request-id:${xRequestId ?? ""};ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHex === v1;
}

export default async function(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => null);

    const dataId = url.searchParams.get("data.id") || body?.data?.id || null;

    const assinaturaValida = await validarAssinatura(req, dataId);
    if (!assinaturaValida) {
      console.log("Assinatura inválida na notificação do Mercado Pago — descartando.");
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }

    console.log("Notificação recebida do Mercado Pago:", JSON.stringify(body));

    return Response.json({ received: true });
  } catch (error) {
    console.log("Erro ao processar notificação do Mercado Pago:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}