// Helpers para consolidar dados de pagamento (Mercado Pago) por usuário na Administração.

export const STATUS_PAGAMENTO_LABEL = {
  pending: "Aguardando pagamento",
  approved: "Aprovado",
  rejected: "Expirado",
  cancelled: "Cancelado",
  estornado: "Estornado",
};

export const STATUS_PAGAMENTO_CLASSNAME = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-orange-100 text-orange-700 border-orange-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  estornado: "bg-red-100 text-red-700 border-red-200",
};

export const SITUACOES_PAGAMENTO = ["pending", "approved", "rejected", "cancelled", "estornado"];

export const FORMA_PAGAMENTO_LABEL = { cartao: "Cartão", pix: "Pix" };

export function formatarMoeda(valor) {
  if (valor == null || isNaN(valor)) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Agrupa a lista de Pagamento por usuario_id, cada grupo ordenado do mais recente para o mais antigo.
export function agruparPagamentosPorUsuario(pagamentos) {
  const mapa = new Map();
  for (const p of pagamentos) {
    if (!p.usuario_id) continue;
    if (!mapa.has(p.usuario_id)) mapa.set(p.usuario_id, []);
    mapa.get(p.usuario_id).push(p);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  }
  return mapa;
}

export function getUltimoPagamento(pagamentosPorUsuario, usuarioId) {
  const lista = pagamentosPorUsuario.get(usuarioId);
  return lista && lista.length > 0 ? lista[0] : null;
}