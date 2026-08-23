// Regras canônicas de composição de IngredienteReceita — Fases 4–7.
// A quantidade gravada em IngredienteReceita é sempre líquida (PL) em g/ml.
// O Peso Bruto (PB) e o custo são derivados do FC efetivo.
import {
  getIngredienteIdMedida,
  getUtensilioIdMedida,
  getPesoPorMedidaG,
} from "@/lib/medidaCaseiraModel";

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
    return { valor: override, origem: "receita", temOverride: true };
  }

  const padrao = numeroPositivo(ingrediente?.fator_correcao);
  return {
    valor: padrao || 1,
    origem: padrao ? "ingrediente" : "fallback",
    temOverride: false,
  };
}

export function itemParticipaCompra(item) {
  return item?.custo_comportamento !== "reaproveitamento_processo";
}

export function calcularItemIngredienteReceita({ item, ingrediente, quantidadeLiquida }) {
  const pl = Math.max(0, Number(quantidadeLiquida) || 0);
  const fcInfo = resolverFatorCorrecao(item, ingrediente);
  const pb = pl * fcInfo.valor;
  const precoPorG = Math.max(0, Number(ingrediente?.preco_por_g_rs) || 0);
  const custoIgnorado = !itemParticipaCompra(item);

  return {
    pesoLiquido: pl,
    pesoBruto: pb,
    custo: custoIgnorado ? 0 : pb * precoPorG,
    precoPorG,
    custoIgnorado,
    fc: fcInfo.valor,
    fcOrigem: fcInfo.origem,
    fcOverride: fcInfo.temOverride,
  };
}

export function resolverUnidadeQuantidade(item, receita) {
  if (item?.unidade_quantidade === "ml" || item?.unidade_quantidade === "g") {
    return item.unidade_quantidade;
  }
  return receita?.unidade_base === "ml" ? "ml" : "g";
}

// Compatibilidade pública: consumidores existentes podem manter estes imports,
// enquanto a fonte de verdade passa a ser medidaCaseiraModel.js.
export function getMedidaIngredienteId(medida) {
  return getIngredienteIdMedida(medida);
}

export function getMedidaUtensilioId(medida) {
  return getUtensilioIdMedida(medida);
}

export function getMedidaPesoG(medida) {
  return getPesoPorMedidaG(medida);
}

export function resolverMedidaCaseiraItem(item, ingrediente, medidaById = {}, medidaByIngrediente = {}) {
  if (item?.medida_caseira_id && medidaById[item.medida_caseira_id]) {
    return medidaById[item.medida_caseira_id];
  }
  if (!ingrediente?.id) return null;
  return medidaByIngrediente[ingrediente.id] || null;
}
