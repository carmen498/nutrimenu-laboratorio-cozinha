// Função administrativa para reprocessar manualmente um pagamento cujo webhook original
// foi rejeitado (ex: assinatura inválida antes da correção do MERCADOPAGO_WEBHOOK_SECRET).
// Só admins podem chamar. Sempre reconsulta o recurso na API do Mercado Pago antes de
// ativar — nunca confia apenas no que o solicitante informou.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { ativarPlanoEEnviarEmail } from "../../shared/ativarAssinaturaPagamento.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pagamentoId } = await req.json().catch(() => ({}));
    if (!pagamentoId) {
      return Response.json({ error: "pagamentoId é obrigatório" }, { status: 400 });
    }

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(() => null);
    if (!pagamento) {
      return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }
    if (!pagamento.mercadopago_order_id) {
      return Response.json({ error: "Pagamento sem mercadopago_order_id" }, { status: 400 });
    }

    if (pagamento.status === "approved") {
      return Response.json({ ok: true, ja_estava_aprovado: true, pagamentoId });
    }

    const ambiente = secrets.get("AMBIENTE");
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");

    // Reconsulta a order real no Mercado Pago para confirmar que está de fato aprovada
    // antes de ativar qualquer coisa — nunca confia apenas no pedido do admin.
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/orders/${pagamento.mercadopago_order_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await mpResponse.json().catch(() => null);

    if (!mpResponse.ok || !order) {
      return Response.json({ error: "Não foi possível consultar a order no Mercado Pago", detalhe: order }, { status: 400 });
    }

    if (order.status !== "processed") {
      return Response.json({ error: `Order ainda não está aprovada no Mercado Pago (status: ${order.status})` }, { status: 400 });
    }

    await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "approved" });
    await ativarPlanoEEnviarEmail(base44, pagamento);

    const usuarioAtualizado = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);

    return Response.json({
      ok: true,
      pagamentoId: pagamento.id,
      status_order_mp: order.status,
      usuario_id: pagamento.usuario_id,
      plano_atual: usuarioAtualizado?.plano_atual,
      status_assinatura: usuarioAtualizado?.status_assinatura,
      data_expiracao: usuarioAtualizado?.data_expiracao,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}