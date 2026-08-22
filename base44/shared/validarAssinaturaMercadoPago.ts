// Módulo compartilhado: valida o header "x-signature" (HMAC-SHA256) de notificações do
// Mercado Pago contra o manifest "id:{data.id};request-id:{x-request-id};ts:{ts};",
// usando o secret MERCADOPAGO_WEBHOOK_SECRET. Extraído do webhookMercadoPago para poder
// ser reutilizado por funções de teste/diagnóstico sem duplicar a lógica.
import { secrets } from "base44:runtime";

export async function validarAssinatura(req: Request, dataId: string | null): Promise<{ valida: boolean; diagnostico: Record<string, unknown> }> {
  const secretBruto = secrets.get("MERCADOPAGO_WEBHOOK_SECRET");
  const secret = (secretBruto || "").trim();

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const diagnostico: Record<string, unknown> = {
    secret_configurado: !!secretBruto,
    secret_tinha_espacos_extras: !!secretBruto && secretBruto !== secret,
    secret_tamanho: secret.length,
    x_signature_recebido: xSignature,
    x_request_id_recebido: xRequestId,
    data_id_usado_no_manifest: dataId,
  };

  if (!secret) return { valida: false, diagnostico };
  if (!xSignature) return { valida: false, diagnostico };

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  diagnostico.ts_extraido = ts || null;
  diagnostico.v1_recebido = v1 || null;
  if (!ts || !v1) return { valida: false, diagnostico };

  // IMPORTANTE: o Mercado Pago exige o data.id em minúsculas no manifest — não documentado
  // claramente, mas confirmado tanto por exemplos oficiais (ex: "ORD01JQ..." -> "ord01jq...")
  // quanto por testes reais feitos aqui: sem o toLowerCase() a assinatura nunca bate.
  const manifest = `id:${(dataId ?? "").toLowerCase()};request-id:${xRequestId ?? ""};ts:${ts};`;
  diagnostico.manifest_usado = manifest;

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
  diagnostico.v1_calculado_por_nos = computedHex;

  // Comparação em tempo constante, alinhada à recomendação do SDK oficial.
  // O tamanho pode falhar cedo (não é segredo); bytes de mesmo tamanho são
  // sempre comparados por completo para não vazar o primeiro ponto divergente.
  const hexToBytes = (hex: string): Uint8Array | null => {
    if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  };

  const esperado = hexToBytes(computedHex);
  const recebido = hexToBytes(v1);
  if (!esperado || !recebido || esperado.length !== recebido.length) {
    return { valida: false, diagnostico };
  }

  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado[i] ^ recebido[i];
  return { valida: diff === 0, diagnostico };
}