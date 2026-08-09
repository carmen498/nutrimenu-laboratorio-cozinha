// Padronização de caixa de nomes ao salvar (Receitas, Cardápios/Eventos,
// Sub-títulos de grupo, Ingredientes). Mantém acentos e grafias — apenas a
// caixa muda.

// Receitas, Cardápios/Eventos e Sub-títulos de grupo: MAIÚSCULAS.
export function toUpperName(str) {
  return (str || "").toString().toUpperCase();
}

// Ingredientes: Inicial maiúscula (ex: "Batata inglesa").
export function toSentenceCaseName(str) {
  const s = (str || "").toString().trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}