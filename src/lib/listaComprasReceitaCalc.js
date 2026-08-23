// Cálculo da Lista de Compras de UMA receita (fluxo "Gerar lista de compras" na ficha).
// Modelo: fator = (porções desejadas × PC recomendado) ÷ rendimento_total da receita.
// Cada ingrediente é resolvido pelo ingrediente_id gravado em IngredienteReceita.
// O FC efetivo respeita o override da receita antes do FC padrão do ingrediente.
import { sugerirPerCapita } from "@/lib/perCapitaData";
import { calcularItemIngredienteReceita, itemParticipaCompra } from "@/lib/ingredienteReceitaCalc";

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

  // Apenas linhas de ingrediente real são compráveis. Ingredientes explodidos de
  // sub-receita já chegam como tipo="ingrediente" e preservam seus overrides.
  const itensLista = ordenados
    .filter((item) => item.tipo === "ingrediente" && itemParticipaCompra(item))
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
          fc: 1,
          fcOrigem: "fallback",
        };
      }

      const calculado = calcularItemIngredienteReceita({
        item,
        ingrediente: ing,
        quantidadeLiquida: qtdEscalada,
      });

      return {
        id: item.id,
        ingrediente_id: item.ingrediente_id,
        nome: ing.nome,
        naoEncontrado: false,
        quantidade: calculado.pesoBruto,
        peso_liquido: calculado.pesoLiquido,
        fc: calculado.fc,
        fcOrigem: calculado.fcOrigem,
        fcOverride: calculado.fcOverride,
        unidade_compra: ing.unidade_compra,
        peso_embalagem_g: ing.peso_embalagem_g || 0,
        preco_por_g: ing.preco_por_g_rs || 0,
        custo: calculado.custo,
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
