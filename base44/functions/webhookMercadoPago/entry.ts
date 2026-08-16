// Webhook do Mercado Pago — recebe notificações de pagamento.
// Endpoint público, sem autenticação de usuário (chamado pelo Mercado Pago).
//
// Valida o header "x-signature" (HMAC-SHA256) contra o manifest
// "id:{data.id};request-id:{x-request-id};ts:{ts};" usando MERCADOPAGO_WEBHOOK_SECRET,
// conforme especificação do Mercado Pago.
//
// Depois de validar a assinatura, busca a order na API do Mercado Pago pelo ID
// recebido (nunca confia nos dados do corpo da notificação) e atualiza o registro
// interno correspondente (entidade Pagamento) e, se aprovado, a assinatura do usuário.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";

const DIAS_PLANO: Record<string, number> = { diario: 1, mensal: 30, anual: 365 };

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
    const tipoNotificacao = body?.type || body?.topic || url.searchParams.get("type") || null;
    const corpoBruto = JSON.stringify(body).slice(0, 2000);

    // Log persistido de toda notificação recebida — o console.log não é acessível
    // retroativamente, então este é o único jeito de diagnosticar depois o que
    // o Mercado Pago realmente enviou e em qual ponto o processamento parou.
    const base44Log = createClientFromRequest(req);
    async function registrarLog(campos: Record<string, unknown>) {
      await base44Log.asServiceRole.entities.LogWebhookMercadoPago.create({
        data_id: dataId || "",
        tipo_notificacao: tipoNotificacao,
        corpo_bruto: corpoBruto,
        ...campos,
      }).catch((e: any) => console.log("Falha ao gravar LogWebhookMercadoPago:", e.message));
    }

    const assinaturaValida = await validarAssinatura(req, dataId);
    if (!assinaturaValida) {
      console.log("Assinatura inválida na notificação do Mercado Pago — descartando.");
      await registrarLog({ assinatura_valida: false, resultado: "assinatura_invalida" });
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }

    console.log("Notificação recebida do Mercado Pago:", JSON.stringify(body));

    if (!dataId) {
      await registrarLog({ assinatura_valida: true, resultado: "sem_data_id" });
      return Response.json({ received: true });
    }

    const base44 = createClientFromRequest(req);

    const ambiente = secrets.get("AMBIENTE");
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");

    // Busca a order na API do Mercado Pago — nunca confia nos dados do corpo da notificação.
    const orderResponse = await fetch(`https://api.mercadopago.com/v1/orders/${dataId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await orderResponse.json().catch(() => null);

    if (!orderResponse.ok || !order) {
      console.log("Não foi possível buscar a order no Mercado Pago:", JSON.stringify(order));
      await registrarLog({ assinatura_valida: true, resultado: "order_nao_encontrada" });
      return Response.json({ error: "order_not_found" }, { status: 200 });
    }

    const pagamentoId = order.external_reference;
    if (!pagamentoId) {
      console.log("Order sem external_reference — nada a atualizar.");
      await registrarLog({ assinatura_valida: true, resultado: "sem_data_id" });
      return Response.json({ received: true });
    }

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(() => null);
    if (!pagamento) {
      console.log("Pagamento interno não encontrado para external_reference:", pagamentoId);
      await registrarLog({ assinatura_valida: true, resultado: "pagamento_interno_nao_encontrado", pagamento_id: pagamentoId });
      return Response.json({ received: true });
    }

    const paymentStatus = order.transactions?.payments?.[0]?.status;
    let novoStatus: string | null = null;
    if (order.status === "processed") {
      novoStatus = "approved";
    } else if (order.status === "canceled" || paymentStatus === "cancelled") {
      novoStatus = "cancelled";
    } else if (paymentStatus === "rejected") {
      novoStatus = "rejected";
    }

    if (!novoStatus) {
      console.log("Status da order ainda não é final:", order.status);
      await registrarLog({ assinatura_valida: true, resultado: "status_nao_final", pagamento_id: pagamentoId });
      return Response.json({ received: true });
    }

    const eraAprovadoAntes = pagamento.status === "approved";
    let dataExpiracaoFormatada: string | null = null;

    if (novoStatus === "approved") {
      if (pagamento.status !== "approved") {
        await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "approved" });
      }

      const dias = DIAS_PLANO[pagamento.plano] ?? 30;
      const agora = new Date();
      const expiracao = new Date(agora.getTime() + dias * 86400000);
      dataExpiracaoFormatada = expiracao.toISOString().split("T")[0];

      await base44.asServiceRole.entities.User.update(pagamento.usuario_id, {
        status_assinatura: "ativo",
        plano_atual: pagamento.plano,
        data_inicio: agora.toISOString().split("T")[0],
        data_expiracao: dataExpiracaoFormatada,
      });
    } else {
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: novoStatus });
    }

    // Dispara o e-mail transacional de pagamento aprovado/recusado/estornado, apenas se
    // o template correspondente estiver com status "ativo" (Comunicação > Transacionais).
    // "cancelled" só é tratado como estorno quando o pagamento já estava aprovado antes.
    let tipoEmail: string | null = null;
    if (novoStatus === "approved") tipoEmail = "pagamento_aprovado";
    else if (novoStatus === "rejected") tipoEmail = "pagamento_recusado";
    else if (novoStatus === "cancelled" && eraAprovadoAntes) tipoEmail = "pagamento_estornado";

    if (tipoEmail) {
      const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
      if (usuario?.email) {
        const nome = usuario.nome_completo || usuario.full_name || "";
        const DEFAULTS: Record<string, { assunto: string; corpo: string }> = {
          pagamento_aprovado: {
            assunto: "Pagamento aprovado",
            corpo: `<p>Olá {{nome}}, seu pagamento foi aprovado com sucesso!</p><p>Seu plano no Laboratório de Cozinha já está ativo. Bom uso!</p>`,
          },
          pagamento_recusado: {
            assunto: "Não conseguimos aprovar seu pagamento",
            corpo: `<p>Olá {{nome}}, não conseguimos aprovar o pagamento da sua assinatura.</p><p>Verifique os dados do cartão ou tente outra forma de pagamento para continuar com acesso ao Laboratório de Cozinha.</p>`,
          },
          pagamento_estornado: {
            assunto: "Seu pagamento foi estornado",
            corpo: `<p>Olá {{nome}}, informamos que o valor do seu pagamento foi estornado.</p><p>O reembolso será processado pelo Mercado Pago e deve aparecer no seu extrato em alguns dias, conforme o prazo do seu banco ou operadora de cartão.</p><p>Se tiver dúvidas, é só nos chamar.</p>`,
          },
        };
        const { assunto: defaultAssunto, corpo: defaultCorpo } = DEFAULTS[tipoEmail];

        const { assunto, html, ativo } = await renderTemplateEmail(base44, tipoEmail, nome, defaultAssunto, defaultCorpo);

        if (ativo) {
          const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
          await base44.asServiceRole.entities.LogEmail.create({
            destinatario_email: usuario.email,
            tipo: tipoEmail,
            enviado_em: new Date().toISOString(),
            status: resultado.ok ? "enviado" : "falhou",
          });
        } else {
          console.log(`Template "${tipoEmail}" está em rascunho — e-mail não enviado.`);
        }
      }
    }

    await registrarLog({ assinatura_valida: true, resultado: "processado", pagamento_id: pagamentoId, status_resolvido: novoStatus });

    return Response.json({ received: true, status: novoStatus });
  } catch (error) {
    console.log("Erro ao processar notificação do Mercado Pago:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}