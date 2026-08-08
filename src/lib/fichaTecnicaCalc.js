// Cálculo da Ficha Técnica (PDF) — SEMPRE reflete a receita BASE (porcoes_base / rendimento_total),
// nunca o estado do escalador na tela. Mesmo caminho de cálculo usado na ficha (ReceitaAberta),
// apenas fixando fator = 1. Não grava nada — apenas deriva valores para exibição.
import { calcularModoPreparoComposto } from "@/lib/modoPreparoComposto";
import { sugerirPerCapita } from "@/lib/perCapitaData";

export function montarFichaTecnica({ receita, itens, ingMap, receitasBasicasMap, insumosReceita = [], esquecidos = [] }) {
  const porcoesBase = receita?.porcoes_base || 1;
  const temOrdemManual = itens.some((i) => (i.ordem || 0) > 0);

  const itensFicha = [...itens]
    .sort((a, b) => {
      if (temOrdemManual) return (a.ordem || 0) - (b.ordem || 0);
      if (a.tipo === "grupo" && b.tipo !== "grupo") return -1;
      if (a.tipo !== "grupo" && b.tipo === "grupo") return 1;
      return ((b.quantidade_por_porcao || 0) * porcoesBase) - ((a.quantidade_por_porcao || 0) * porcoesBase);
    })
    .map((item) => {
      if (item.tipo === "grupo") {
        return { ...item, isGrupo: true, custo: 0, qtdOriginal: 0, qtdNova: 0, qtdComprar: 0 };
      }
      if (item.tipo === "subreceita") {
        const rb = receitasBasicasMap[item.subreceita_id];
        const qtdOriginal = item.quantidade_por_porcao * porcoesBase;
        return { ...item, isSubreceita: true, receitaBase: rb, custo: 0, qtdOriginal, qtdNova: qtdOriginal, qtdComprar: qtdOriginal, isGrupo: false, isNA: false };
      }
      const ing = ingMap[item.ingrediente_id];
      const qtdOriginal = item.quantidade_por_porcao * porcoesBase;
      const fc = ing?.fator_correcao || 1;
      const qtdComprar = qtdOriginal * fc;
      const custo = qtdComprar * (ing?.preco_por_g_rs || 0);
      const isChildOfSubreceita = !!item.subreceita_parent_id;
      return { ...item, ing, qtdOriginal, qtdNova: qtdOriginal, qtdComprar, custo, isGrupo: false, isNA: false, isChildOfSubreceita };
    });

  // Reagrupa: filhos explodidos de sub-receita ficam abaixo do marcador
  const childrenByParent = {};
  itensFicha.forEach((item) => {
    if (item.subreceita_parent_id) {
      if (!childrenByParent[item.subreceita_parent_id]) childrenByParent[item.subreceita_parent_id] = [];
      childrenByParent[item.subreceita_parent_id].push(item);
    }
  });
  const itensFichaAgrupada = [];
  const seen = new Set();
  itensFicha.forEach((item) => {
    if (seen.has(item.id) || item.subreceita_parent_id) return;
    itensFichaAgrupada.push(item);
    seen.add(item.id);
    if (item.tipo === "subreceita" && childrenByParent[item.id]) {
      childrenByParent[item.id].forEach((child) => {
        itensFichaAgrupada.push(child);
        seen.add(child.id);
      });
    }
  });

  const temSubreceitas = itensFichaAgrupada.some((i) => i.tipo === "subreceita" && !i.subreceita_parent_id && i.subreceita_id);
  const blocosCompostos = temSubreceitas
    ? calcularModoPreparoComposto(itensFichaAgrupada, receitasBasicasMap, receita?.modo_preparo)
    : [];

  const pesoBruto = itensFicha.filter((i) => !i.isGrupo).reduce((sum, i) => sum + (i.qtdNova || 0), 0);
  const custoIngredientes = itensFicha.reduce((sum, i) => sum + i.custo, 0);
  const custoInsumos = insumosReceita.reduce((sum, i) => sum + (i.custo_total || 0), 0);
  const custoEsquecidos = esquecidos.reduce((sum, i) => sum + (i.custo_total || 0), 0);
  const custoTotal = custoIngredientes + custoInsumos + custoEsquecidos;

  // Indicadores: PC recomendado e nº de porções derivado (mesma lógica do escalador inicial)
  const cat = (receita?.categorias || []).length > 0 ? receita.categorias[0] : (receita?.categoria || "");
  const pcRecomendado = receita?.per_capita_g || sugerirPerCapita(receita?.nome, cat) || 0;
  const rendimentoTotal = receita?.rendimento_total || 0;
  const nPorcoes = pcRecomendado > 0 && rendimentoTotal > 0
    ? +(rendimentoTotal / pcRecomendado).toFixed(1)
    : porcoesBase;
  const custoPorPorcao = custoTotal / (nPorcoes || 1);

  // Linha de pesos: bruto x rendimento(PDP) x perda/ganho
  let perda = null;
  if (rendimentoTotal > 0 && pesoBruto > 0) {
    if (rendimentoTotal > pesoBruto) {
      perda = { tipo: "ganho", pct: ((rendimentoTotal - pesoBruto) / pesoBruto) * 100 };
    } else {
      perda = { tipo: "perda", pct: ((pesoBruto - rendimentoTotal) / pesoBruto) * 100 };
    }
  }

  return {
    itensFichaAgrupada,
    temSubreceitas,
    blocosCompostos,
    pesoBruto,
    custoIngredientes,
    custoInsumos,
    custoEsquecidos,
    custoTotal,
    porcoesBase,
    pcRecomendado,
    rendimentoTotal,
    nPorcoes,
    custoPorPorcao,
    perda,
  };
}