// Cálculo da Lista de Compras de UMA receita (fluxo "Gerar lista de compras" na ficha).
// Modelo correto: fator = (porções desejadas × PC recomendado) ÷ rendimento_total da receita.
// Cada ingrediente é resolvido SEMPRE pelo ingrediente_id gravado em IngredienteReceita —
// nunca por nome/sinônimo — usando o cadastro atual (ingMap) para nome, FC e preço/g.
// Não toca em custo_total/custo_por_porcao da receita nem no escalador da ficha.
import { sugerirPerCapita } from "@/lib/perCapitaData";

export function montarListaComprasReceita({ receita, itens, ingMap, porcoesDesejadas }) {
  const porcoesBase = receita?.porcoes_base || 1;
  const temOrdemManual = itens.some((i) => (i.ordem || 0) > 0);

  const cat = (receita?.categorias || []).length > 0 ? receita.categorias[0] : (receita?.categoria || "");
  const pcRecomendado = receita?.per_capita_g || sugerirPerCapita(receita?.nome, cat) || 0;
  const rendimentoTotal = receita?.rendimento_total || 0;
  const fator = rendimentoTotal > 0 ? (porcoesDesejadas * pcRecomendado) / rendimentoTotal : 0;

  const ordenados = [...itens].sort((a, b) => {
    if (temOrdemManual) return (a.ordem || 0) - (b.ordem || 0);
    if (a.tipo === "grupo" && b.tipo !== "grupo") return -1;
    if (a.tipo !== "grupo" && b.tipo === "grupo") return 1;
    return ((b.quantidade_por_porcao || 0) * porcoesBase) - ((a.quantidade_por_porcao || 0) * porcoesBase);
  });

  // Apenas linhas de ingrediente real são compráveis (marcadores de grupo/sub-receita
  // não têm quantidade própria; ingredientes explodidos de sub-receita já vêm como tipo "ingrediente").
  const itensLista = ordenados
    .filter((item) => item.tipo === "ingrediente")
    .map((item) => {
      const ing = ingMap[item.ingrediente_id];
      const qtdBase = (item.quantidade_por_porcao || 0) * porcoesBase;
      const qtdEscalada = qtdBase * fator;
      if (!ing) {
        return {
          id: item.id,
          ingrediente_id: item.ingrediente_id,
          nome: item.ingrediente_nome || "Ingrediente não encontrado",
          naoEncontrado: true,
          quantidade: qtdEscalada,
          unidade_compra: null,
          peso_embalagem_g: 0,
          preco_por_g: 0,
          custo: 0,
        };
      }
      const comprar = qtdEscalada * (ing.fator_correcao || 1);
      const custo = comprar * (ing.preco_por_g_rs || 0);
      return {
        id: item.id,
        ingrediente_id: item.ingrediente_id,
        nome: ing.nome,
        naoEncontrado: false,
        quantidade: comprar,
        unidade_compra: ing.unidade_compra,
        peso_embalagem_g: ing.peso_embalagem_g || 0,
        preco_por_g: ing.preco_por_g_rs || 0,
        custo,
      };
    });

  return {
    pcRecomendado,
    rendimentoTotal,
    fator,
    quantidadeTotalG: porcoesDesejadas * pcRecomendado,
    itensLista,
  };
}