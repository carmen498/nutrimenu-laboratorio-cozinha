// Fonte única de verdade para o Orçamento (documento comercial do cliente).
// Recebe APENAS o preço de venda já calculado (nunca custo, markup ou %) — garante
// que nenhum dado interno possa vazar para a tela ou para o PDF do Orçamento.

function fmtRs(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function montarOrcamento({ cardapio, num, receitasView, receitaMap, precoPorUnidade, totalVenda, validadeDias = 10 }) {
  const dataEvento = cardapio.data ? cardapio.data.split("-").reverse().join("/") : null;
  const unidadeLabel = cardapio.tipo === "buffet" ? "kg" : "pessoas";

  const pratos = (receitasView || []).map((r) => ({
    id: r.id,
    nome: r.receita_nome || "",
    descritivo: receitaMap[r.receita_id]?.descritivo_menu || "",
  }));

  return {
    nome: cardapio.nome?.toUpperCase?.() || cardapio.nome || "",
    numPessoas: num,
    unidadeLabel,
    dataEvento,
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
    validadeDias,
    pratos,
    observacoesComerciais: cardapio.observacoes_orcamento || "",
    precoPorPessoaFmt: fmtRs(precoPorUnidade),
    totalFmt: fmtRs(totalVenda),
  };
}