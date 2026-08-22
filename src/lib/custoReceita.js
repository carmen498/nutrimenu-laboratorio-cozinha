// Cálculo de custo de receitas para uso em Cardápio, Evento e Relatórios.
// NÃO grava nada — apenas deriva valores para exibição/cálculo.
//
// Fase 5: o rendimento efetivo passa a preferir o PDP canônico
// (peso_pos_preparo_total), mantendo rendimento_total como fallback legado.
// Quando nenhum PDP foi informado, usa o peso líquido pré-preparo apenas como
// estimativa operacional — sem classificá-lo como rendimento medido.
import { resolverRendimentoReceita } from "@/lib/rendimentoReceita";

export function rendimentoEfetivo(receita, ingredientesReceita = []) {
  return resolverRendimentoReceita(receita, ingredientesReceita).pesoPosPreparoEfetivo || 0;
}

export function custoPorGrama(receita, ingredientesReceita = []) {
  const custoTotal = Number(receita?.custo_total) || 0;
  if (custoTotal <= 0) return 0;
  const rend = rendimentoEfetivo(receita, ingredientesReceita);
  return rend > 0 ? custoTotal / rend : 0;
}

export function custoPorKgPronto(receita, ingredientesReceita = []) {
  return custoPorGrama(receita, ingredientesReceita) * 1000;
}

export function custoEscalado(receita, ingredientesReceita = [], quantidadeGramas = 0) {
  return custoPorGrama(receita, ingredientesReceita) * (Number(quantidadeGramas) || 0);
}
