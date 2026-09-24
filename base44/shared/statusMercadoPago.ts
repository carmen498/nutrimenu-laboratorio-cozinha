// Normaliza os estados retornados pela Orders API do Mercado Pago para os
// estados internos da entidade Pagamento. A Orders API usa, entre outros,
// processed / failed / canceled / expired / refunded / charged_back /
// partially_refunded; as transações associadas usam estados equivalentes.
// Estados não finais permanecem pending.

export type StatusPagamentoInterno = "pending" | "approved" | "rejected" | "cancelled" | "estornado" | "contestado" | "estornado_parcial";

export function resolverStatusOrderMercadoPago(order: any): StatusPagamentoInterno {
  const orderStatus = String(order?.status || "").toLowerCase();
  const txStatus = String(order?.transactions?.payments?.[0]?.status || "").toLowerCase();

  // Reembolso deve prevalecer sobre qualquer estado anterior de processamento.
  if (orderStatus === "refunded" || txStatus === "refunded") return "estornado";
  // Contestação (chargeback) revoga o acesso, igual ao estorno.
  if (orderStatus === "charged_back" || txStatus === "charged_back") return "contestado";
  // Estorno parcial: registra, NÃO revoga — admin decide manualmente.
  if (orderStatus === "partially_refunded" || txStatus === "partially_refunded") return "estornado_parcial";

  // Uma order expirada/cancelada não poderá mais ser paga; internamente usamos
  // "cancelled" por compatibilidade com os registros existentes.
  if (["canceled", "cancelled", "expired"].includes(orderStatus)) return "cancelled";
  if (["canceled", "cancelled", "expired"].includes(txStatus)) return "cancelled";

  // A Orders API usa "failed" para falha definitiva. Mantemos "rejected" como
  // nomenclatura interna histórica do app.
  if (["failed", "rejected"].includes(orderStatus)) return "rejected";
  if (["failed", "rejected"].includes(txStatus)) return "rejected";

  // Reembolso pode estar refletido apenas no valor, não no status da order.
  // Algumas orders retornam status "processed" mesmo após estorno, com o valor
  // devolvido em total_refunded_amount / amount_refunded.
  const valorRefundOrder = Number(order?.total_refunded_amount ?? 0);
  const valorRefundTx = Number(order?.transactions?.payments?.[0]?.amount_refunded ?? 0);
  if (valorRefundOrder > 0 || valorRefundTx > 0) {
    const valorTotal = Number(order?.total_amount ?? order?.transactions?.payments?.[0]?.total_amount ?? 0);
    if (valorTotal > 0 && (valorRefundOrder >= valorTotal || valorRefundTx >= valorTotal)) return "estornado";
    return "estornado_parcial";
  }

  if (orderStatus === "processed" || txStatus === "processed") return "approved";

  return "pending";
}

export function resolverStatusPaymentMercadoPago(payment: any): StatusPagamentoInterno {
  const status = String(payment?.status || "").toLowerCase();
  if (status === "refunded") return "estornado";
  if (status === "charged_back") return "contestado";
  if (status === "partially_refunded") return "estornado_parcial";
  // Reembolso pode estar refletido apenas no valor, não no status.
  const valorRefund = Number(payment?.amount_refunded ?? 0);
  if (valorRefund > 0) {
    const valorTotal = Number(payment?.transaction_amount ?? 0);
    if (valorTotal > 0 && valorRefund >= valorTotal) return "estornado";
    return "estornado_parcial";
  }
  if (status === "approved") return "approved";
  if (["cancelled", "canceled", "expired"].includes(status)) return "cancelled";
  if (["rejected", "failed"].includes(status)) return "rejected";
  return "pending";
}