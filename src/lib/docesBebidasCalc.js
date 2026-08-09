// Fórmulas de Doces & Bebidas do Evento — fonte única de verdade, usada pela
// Etapa 4 (DocesBebidasSection) e pelo Dossiê do Evento, garantindo paridade
// exata entre tela e relatório. NÃO ALTERAR as fórmulas abaixo.

export function calcQtdRaw(item, totalPessoas) {
  const pct = item.percentual || 0;
  const media = item.media || 0;
  return totalPessoas * pct / 100 * media;
}

export function calcQtdConvertida(totalRaw, unidade) {
  return unidade === "un" ? totalRaw : totalRaw / 1000;
}

export function calcRsTotal(item, totalPessoas) {
  const cu = item.custo_unitario;
  if (!cu) return null;
  const raw = calcQtdRaw(item, totalPessoas);
  const qtd = calcQtdConvertida(raw, item.unidade);
  return qtd * cu;
}

// Quantidade final automática (calculada), arredondada para exibição/edição
export function qtdFinalAutomatica(item, totalPessoas) {
  const conv = calcQtdConvertida(calcQtdRaw(item, totalPessoas), item.unidade);
  return item.unidade === "un" ? Math.ceil(conv) : Math.round(conv * 10) / 10;
}

// Quantidade final efetiva: usa o ajuste manual quando existir, senão a automática
export function qtdFinalEfetiva(item, totalPessoas) {
  return item.quantidade_ajustada != null ? item.quantidade_ajustada : qtdFinalAutomatica(item, totalPessoas);
}

// R$ total considerando a quantidade final (ajustada ou automática)
export function calcRsTotalFinal(item, totalPessoas) {
  const cu = item.custo_unitario;
  if (!cu) return null;
  return qtdFinalEfetiva(item, totalPessoas) * cu;
}

export function unidadeCustoLabel(unidade) {
  if (unidade === "ml") return "L";
  if (unidade === "un") return "un";
  return "kg";
}