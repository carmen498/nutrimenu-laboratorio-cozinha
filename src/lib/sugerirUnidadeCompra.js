// ── Sugere unidade de compra padrão para novos ingredientes ──
// Baseado no nome do ingrediente — nunca usa a quantidade da receita.

const PALAVRAS_LIQUIDO = [
  "óleo", "oleo", "azeite", "vinagre", "leite", "creme de leite", "creme de",
  "água", "agua", "caldo", "suco", "molho", "shoyu", "mel", "melado",
  "essência", "essencia", "extrato", "bebida", "refrigerante", "vinho",
  "cerveja", "cachaça", "cachaca", "licor", "rum", "vodca", "whisky",
  "champanhe", "espumante", "saquê", "saque", "conhaque", "aguardente",
  "leite de coco", "leite condensado",
];

const PALAVRAS_UNIDADE = [
  "ovo", "ovos", "gema", "clara", "limão", "limao", "laranja",
  "maçã", "maca", "banana", "abacate", "manga", "maracujá", "maracuja",
  "pêssego", "pessego", "ameixa", "coco", "kiwi", "melão", "melao",
  "melancia", "abacaxi", "morango", "uva", "cereja", "framboesa", "mirtilo",
  "unidade", "unidades", "dente", "dentes", "folha", "folhas",
  "tablete", "envelope", "sachê", "sache", "lata", "latas",
  "pão", "pao", "bengala", "filão", "filao",
];

/**
 * @param {string} nome - Nome do ingrediente
 * @returns {{ unidade_compra: string, peso_embalagem_g: number }}
 */
export function sugerirUnidadeCompra(nome) {
  if (!nome) return { unidade_compra: "KG", peso_embalagem_g: 1000 };
  const lower = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Liquids sold by liter
  if (PALAVRAS_LIQUIDO.some(p => lower.includes(p))) {
    return { unidade_compra: "LT", peso_embalagem_g: 1000 };
  }

  // Items sold by unit
  if (PALAVRAS_UNIDADE.some(p => lower.includes(p))) {
    return { unidade_compra: "UN", peso_embalagem_g: 100 };
  }

  // Butter/margarine sold in 200g or 500g, but default to KG
  if (/\b(manteiga|margarina)\b/.test(lower)) {
    return { unidade_compra: "KG", peso_embalagem_g: 500 };
  }

  // Default: solids by kg
  return { unidade_compra: "KG", peso_embalagem_g: 1000 };
}