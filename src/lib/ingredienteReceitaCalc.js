// Regras canônicas de composição de IngredienteReceita — Fase 4.
// A quantidade gravada em IngredienteReceita é sempre líquida (PL) em g/ml.
// O Peso Bruto (PB) e o custo são derivados do FC efetivo.

const numeroPositivo = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * FC efetivo do item:
 * 1) fator_correcao_override do IngredienteReceita, quando > 0;
 * 2) fator_correcao padrão do Ingrediente, quando > 0;
 * 3) fallback 1.
 */
export function resolverFatorCorrecao(item, ingrediente) {
  const override = numeroPositivo(item?.fator_correcao_override);
  if (override) {
    return {
      valor: override,
      origem: "receita",
      temOverride: true,
    };
  }

  const padrao = numeroPositivo(ingrediente?.fator_correcao);
  return {
    valor: padrao || 1,
    origem: padrao ? "ingrediente" : "fallback",
    temOverride: false,
  };
}

/**
 * Calcula PL, PB e custo de um item já com a quantidade líquida desejada.
 */
export function calcularItemIngredienteReceita({ item, ingrediente, quantidadeLiquida }) {
  const pl = Math.max(0, Number(quantidadeLiquida) || 0);
  const fcInfo = resolverFatorCorrecao(item, ingrediente);
  const pb = pl * fcInfo.valor;
  const precoPorG = Math.max(0, Number(ingrediente?.preco_por_g_rs) || 0);

  return {
    pesoLiquido: pl,
    pesoBruto: pb,
    custo: pb * precoPorG,
    precoPorG,
    fc: fcInfo.valor,
    fcOrigem: fcInfo.origem,
    fcOverride: fcInfo.temOverride,
  };
}

/**
 * Resolve a unidade canônica do item sem quebrar receitas antigas.
 */
export function resolverUnidadeQuantidade(item, receita) {
  if (item?.unidade_quantidade === "ml" || item?.unidade_quantidade === "g") {
    return item.unidade_quantidade;
  }
  return receita?.unidade_base === "ml" ? "ml" : "g";
}

/**
 * Compatibilidade MedidaCaseira Fase 4.
 */
export function getMedidaIngredienteId(medida) {
  return medida?.ingrediente_id || medida?.alimento || null;
}

export function getMedidaUtensilioId(medida) {
  return medida?.utensilio_id || medida?.utensilio || null;
}

export function getMedidaPesoG(medida) {
  const quantidade = numeroPositivo(medida?.quantidade_utensilio) || 1;
  const pesoCanonico = numeroPositivo(medida?.peso_g);
  if (pesoCanonico) return pesoCanonico / quantidade;

  const legado = numeroPositivo(medida?.referencia_g) || numeroPositivo(medida?.equivalencia_g);
  return legado || null;
}

/**
 * Prefere a medida explicitamente vinculada ao IngredienteReceita.
 * Se não houver vínculo, usa a primeira medida disponível para o ingrediente.
 */
export function resolverMedidaCaseiraItem(item, ingrediente, medidaById = {}, medidaByIngrediente = {}) {
  if (item?.medida_caseira_id && medidaById[item.medida_caseira_id]) {
    return medidaById[item.medida_caseira_id];
  }
  if (!ingrediente?.id) return null;
  return medidaByIngrediente[ingrediente.id] || null;
}
