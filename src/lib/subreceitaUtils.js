import { base44 } from "@/api/base44Client";

/**
 * Busca e explode os ingredientes de uma sub-receita com quantidades proporcionais.
 * Fase 4: além da quantidade, preserva os metadados canônicos do item de origem
 * (unidade, FC específico e medida caseira vinculada).
 *
 * @param {object} subreceita - Objeto da receita usada como sub-receita
 * @param {number} qtdPorPorcao - Quantidade por porção da sub-receita na receita pai
 * @returns {Promise<{children: Array, rendimentoEfetivo: number, rendimentoEstimado: boolean}>}
 */
export async function explodeSubreceita(subreceita, qtdPorPorcao) {
  const subItens = await base44.entities.IngredienteReceita.filter(
    { receita_id: subreceita.id }, "ordem", 200
  );
  const subPorcoesBase = subreceita.porcoes_base || 1;

  let rendimentoEfetivo = subreceita.rendimento_total;
  let rendimentoEstimado = false;
  if (!rendimentoEfetivo || rendimentoEfetivo <= 0) {
    rendimentoEfetivo = subItens
      .filter(i => i.tipo !== "grupo")
      .reduce((sum, i) => sum + (i.quantidade_por_porcao || 0) * subPorcoesBase, 0);
    rendimentoEstimado = true;
  }
  if (!rendimentoEfetivo || rendimentoEfetivo <= 0) rendimentoEfetivo = 1;

  const children = [];
  for (const subItem of subItens) {
    if (subItem.tipo === "grupo") continue;
    const propQtd = (subItem.quantidade_por_porcao || 0) * subPorcoesBase * qtdPorPorcao / rendimentoEfetivo;

    const comuns = {
      quantidade_por_porcao: propQtd,
      unidade_quantidade: subItem.unidade_quantidade || (subreceita.unidade_base === "ml" ? "ml" : "g"),
      pre_preparo: subItem.pre_preparo || "",
      proporcional: subItem.proporcional !== false,
    };

    if (subItem.tipo === "subreceita") {
      children.push({
        ...comuns,
        tipo: "subreceita",
        subreceita_id: subItem.subreceita_id,
        subreceita_nome: subItem.subreceita_nome,
      });
    } else {
      children.push({
        ...comuns,
        tipo: "ingrediente",
        ingrediente_id: subItem.ingrediente_id || "",
        ingrediente_nome: subItem.ingrediente_nome || "",
        fator_correcao_override: Number(subItem.fator_correcao_override) > 0
          ? Number(subItem.fator_correcao_override)
          : 0,
        medida_caseira_id: subItem.medida_caseira_id || "",
        quantidade_medida_caseira: subItem.quantidade_medida_caseira,
        medida_caseira: subItem.medida_caseira || "",
      });
    }
  }
  return { children, rendimentoEfetivo, rendimentoEstimado };
}
