// Concilia pagamentos antigos ou uma transação específica com o status real da Orders API.
// A função é administrativa, limitada e idempotente: nunca confia no status enviado pelo cliente.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from "base44:runtime";
import { ativarCompraPagamento } from "../../shared/ativarCompraPagamento.ts";
import { revogarCompraEstorno } from "../../shared/revogarCompraEstorno.ts";
import { resolverStatusOrderMercadoPago } from "../../shared/statusMercadoPago.ts";

async function consultarOrder(orderId: string, tokens: string[]) {
  for (const token of tokens) {
    if (!token) continue;
    const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data) return data;
    if (![401, 403, 404].includes(response.status)) break;
  }
  return null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { pagamentoId, limite = 25, dry_run = false } = await req.json().catch(() => ({}));
    const limiteSeguro = Math.min(Math.max(Number(limite) || 25, 1), 100);
    let pagamentos: any[] = [];

    if (pagamentoId) {
      const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(() => null);
      if (!pagamento) return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      pagamentos = [pagamento];
    } else {
      pagamentos = await base44.asServiceRole.entities.Pagamento.list("-created_date", limiteSeguro);
    }

    const ambiente = String(secrets.get("AMBIENTE") || "").trim().toLowerCase();
    const prod = String(secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD") || "").trim();
    const sandbox = String(secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX") || "").trim();
    const tokens = ambiente === "producao" ? [prod, sandbox] : [sandbox, prod];
    const resumo = { consultados: 0, atualizados: 0, reparados: 0, pendentes: 0, naoEncontrados: 0, semOrderId: 0 };
    const detalhes: any[] = [];

    for (const pagamento of pagamentos) {
      if (!pagamento.mercadopago_order_id) {
        resumo.semOrderId++;
        continue;
      }
      resumo.consultados++;
      const order = await consultarOrder(pagamento.mercadopago_order_id, tokens);
      if (!order) {
        resumo.naoEncontrados++;
        detalhes.push({ pagamentoId: pagamento.id, resultado: "order_nao_encontrada" });
        continue;
      }

      const statusReal = resolverStatusOrderMercadoPago(order);
      if (statusReal === "pending") {
        resumo.pendentes++;
        detalhes.push({ pagamentoId: pagamento.id, statusAnterior: pagamento.status, statusReal });
        continue;
      }

      const mudou = pagamento.status !== statusReal;
      if (!dry_run && mudou) {
        await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: statusReal });
        resumo.atualizados++;
      }

      if (!dry_run && statusReal === "approved") {
        await ativarCompraPagamento(base44, { ...pagamento, status: "approved" });
        if (!mudou) resumo.reparados++;
      } else if (!dry_run && statusReal === "estornado") {
        await revogarCompraEstorno(base44, { ...pagamento, status: "estornado" });
        if (!mudou) resumo.reparados++;
      }

      detalhes.push({ pagamentoId: pagamento.id, statusAnterior: pagamento.status, statusReal, alterado: mudou });
    }

    return Response.json({ ok: true, dry_run: dry_run === true, resumo, detalhes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}