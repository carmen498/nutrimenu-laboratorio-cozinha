// Fonte única de verdade para a Ficha do Cardápio — usada tanto pela TELA de
// pré-visualização (FichaCardapio.jsx) quanto pelo PDF exportado (fichaCardapioPDF.js).
// Garante que tela e arquivo mostrem sempre os mesmos valores, na mesma ordem.
// Nunca inclui custos, %, markup ou cores — documento de PRODUÇÃO.

function fmtKg(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtG(v) {
  return Math.round(v || 0).toLocaleString("pt-BR");
}

export function montarFichaCardapio({ cardapio, num, receitasView, insumos, tagNomes = [] }) {
  const dataCardapio = cardapio.data ? cardapio.data.split("-").reverse().join("/") : null;
  const linhaDiscreta = [dataCardapio, tagNomes.length ? tagNomes.join(", ") : null].filter(Boolean).join(" · ");

  let totalG = 0;
  const linhas = (receitasView || []).map((r) => {
    const qtdG = Number(r.quantidade_total_g) || 0;
    totalG += qtdG;
    const pcG = num > 0 ? qtdG / num : 0;
    return {
      id: r.id,
      nome: r.receita_nome || "",
      pcGFmt: `${fmtG(pcG)} g`,
      porcoes: num,
      kgFmt: `${fmtKg(qtdG / 1000)} kg`,
    };
  });

  const gPorPessoa = num > 0 ? totalG / num : 0;

  const insumosLista = (insumos || []).map((ins) => ({
    id: ins.id,
    nome: ins.nome || "",
    qtdLabel: `${ins.quantidade || 0} ${ins.unidade || "un"}`,
  }));

  return {
    nome: cardapio.nome?.toUpperCase?.() || cardapio.nome || "",
    numPessoas: num,
    dataCardapio,
    linhaDiscreta,
    linhas,
    totalKgFmt: `${fmtKg(totalG / 1000)} kg`,
    gPorPessoaFmt: `${fmtG(gPorPessoa)} g`,
    insumos: insumosLista,
    observacoes: cardapio.observacoes || "",
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
  };
}