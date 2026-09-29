// Reenvio administrativo do e-mail "pagamento_aprovado" para um Pagamento já
// existente. Não cria pagamento novo, não mexe no acesso (ativarGuiaZR é
// idempotente — retorna early se o AcessoGuiaTecnicoZR já existe). Chama o
// mesmo pipeline do webhook, inclusive o renderTemplateEmail real, para
// confirmar que o fix do fallback está no ar.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ativarCompraPagamento } from "../../shared/ativarCompraPagamento.ts";

const VERSAO_CODIGO = "reenviar-email-v1-2026-09-29";

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => null);
    const paymentId = body?.payment_id || body?.pagamento_id;
    if (!paymentId) {
      return Response.json({ error: "payment_id é obrigatório" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const pagamento = await base44.asServiceRole.entities.Pagamento.get(paymentId).catch(() => null);
    if (!pagamento) {
      return Response.json({ error: "pagamento não encontrado" }, { status: 404 });
    }

    await ativarCompraPagamento(base44, pagamento);

    const logs = await base44.asServiceRole.entities.LogEmail.filter({
      usuario_id: pagamento.usuario_id,
      tipo: "pagamento_aprovado",
    }, "-created_date", 5);

    return Response.json({
      received: true,
      versao: VERSAO_CODIGO,
      pagamento_id: pagamento.id,
      usuario_id: pagamento.usuario_id,
      log_email: logs?.[0] || null,
    });
  } catch (error) {
    return Response.json({ error: error?.message || "erro" }, { status: 500 });
  }
}