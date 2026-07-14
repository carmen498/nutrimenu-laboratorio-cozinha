// Cálculo de custo de receitas para uso em Cardápio, Evento e Relatórios.
// NÃO grava nada — apenas deriva valores para exibição/cálculo.
//
// Muitas receitas (ex: Receitas Base/Molhos) têm rendimento_total = 0 (não preenchido).
// Nesses casos, usar rendimento_total diretamente (ou um fallback fixo de 1g) infla o
// custo em ~1000x quando a quantidade é informada em gramas. Este helper calcula um
// rendimento efetivo: usa rendimento_total quando > 0, senão estima pela soma das
// quantidades dos ingredientes da receita (mesma lógica usada para sub-receitas).

export function rendimentoEfetivo(receita, ingredientesReceita = []) {
  const direto = Number(receita?.rendimento_total) || 0;
  if (direto > 0) return direto;
  const porcoesBase = Number(receita?.porcoes_base) || 1;
  const soma = (ingredientesReceita || [])
    .filter((i) => i.tipo !== "grupo")
    .reduce((s, i) => s + (Number(i.quantidade_por_porcao) || 0) * porcoesBase, 0);
  return soma > 0 ? soma : 0;
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