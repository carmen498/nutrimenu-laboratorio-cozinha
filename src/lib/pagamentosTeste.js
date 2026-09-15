// Identifica e filtra pagamentos de teste do Mercado Pago.
// O modo de teste do MP gera order IDs com prefixo ORDTST — marcador
// confiável que não depende do campo is_sample (que nunca foi populado).

export function isPagamentoTeste(p) {
  return String(p?.mercadopago_order_id || "").startsWith("ORDTST");
}

export function filtrarPagamentosReais(pagamentos, mostrarTestes) {
  if (mostrarTestes) return pagamentos;
  return (pagamentos || []).filter((p) => !isPagamentoTeste(p));
}