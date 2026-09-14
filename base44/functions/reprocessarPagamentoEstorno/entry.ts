// Reprocessa manualmente um estorno já confirmado no Mercado Pago.
// Só administradores podem chamar. A order é sempre reconsultada.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { finalizarEstornoConfirmado } from "../../shared/processarDesistencia.ts";
import { resolverStatusOrderMercadoPago } from "../../shared/statusMercadoPago.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pagamentoId } = await req.json().catch(() => ({}));
    if (!pagamentoId) return Response.json({ error: "pagamentoId é obrigatório" }, { status: 400 });

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(() => null);
    if (!pagamento) return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
    if (!pagamento.mercadopago_order_id) {
      return Response.json({ error: "Pagamento sem mercadopago_order_id" }, { status: 400 });
    }

    const ambiente = String(secrets.get("AMBIENTE") || "").trim().toLowerCase();
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/orders/${pagamento.mercadopago_order_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await mpResponse.json().catch(() => null);
    if (!mpResponse.ok || !order) {
      return Response.json({ error: "Não foi possível consultar a order no Mercado Pago" }, { status: 400 });
    }
    if (resolverStatusOrderMercadoPago(order) !== "estornado") {
      return Response.json({ error: `Order ainda não está estornada no Mercado Pago (status: ${order.status || "desconhecido"})` }, { status: 409 });
    }

    const finalizacao = await finalizarEstornoConfirmado(
      base44,
      pagamento,
      null,
      "reprocessamento_manual",
    );
    return Response.json({
      ok: true,
      pagamentoId: pagamento.id,
      novo_status_pagamento: "estornado",
      pedido_desistencia_id: finalizacao.pedido_id,
      acessos_revogados: finalizacao.revogacao,
      email: finalizacao.email,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
