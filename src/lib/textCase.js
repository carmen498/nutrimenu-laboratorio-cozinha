// Padronização de caixa de nomes ao salvar (Receitas, Refeições,
// Cardápios, Eventos, Sub-títulos de grupo e Ingredientes).
// Campos descritivos, preparos, tags, medidas e utensílios não passam por estas funções.

// Receitas, Refeições, Cardápios, Eventos e Sub-títulos de grupo: MAIÚSCULAS.
export function toUpperName(str) {
  return (str || "").toString().trim().toUpperCase();
}

// Ingredientes: Inicial maiúscula (ex: "Batata inglesa").
export function toSentenceCaseName(str) {
  const s = (str || "").toString().trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}