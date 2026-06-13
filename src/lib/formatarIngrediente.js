const PADRAO_INGREDIENTES = {
  "açúcar": "refinado",
  "açucar": "refinado",
  "óleo": "soja",
  "oleo": "soja",
  "tomate": "in natura maduro",
  "cebola": "branca",
  "farinha": "trigo",
};

export function formatarNomeIngrediente(nome) {
  if (!nome) return "";
  const key = nome.toLowerCase().trim();
  const padrao = PADRAO_INGREDIENTES[key];
  if (padrao) return `${nome} (padrão: ${padrao})`;
  return nome;
}