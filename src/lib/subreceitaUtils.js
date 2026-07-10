import { base44 } from "@/api/base44Client";

/**
 * Busca e explode os ingredientes de uma sub-receita com quantidades proporcionais.
 * @param {object} subreceita - Objeto da receita usada como sub-receita
 * @param {number} qtdPorPorcao - Quantidade por porção da sub-receita na receita pai
 * @returns {Promise<{children: Array, rendimentoEfetivo: number, rendimentoEstimado: boolean}>}
 */
export async function explodeSubreceita(subreceita, qtdPorPorcao) {
  const subItens = await base44.entities.IngredienteReceita.filter(
    { receita_id: subreceita.id }, "ordem", 200
  );
  const subPorcoesBase = subreceita.porcoes_base || 1;

  // Determine effective rendimento
  let rendimentoEfetivo = subreceita.rendimento_total;
  let rendimentoEstimado = false;
  if (!rendimentoEfetivo || rendimentoEfetivo <= 0) {
    // Fallback: sum of ingredient quantities * porcoes_base
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
    if (subItem.tipo === "subreceita") {
      children.push({
        tipo: "subreceita",
        subreceita_id: subItem.subreceita_id,
        subreceita_nome: subItem.subreceita_nome,
        quantidade_por_porcao: propQtd,
        pre_preparo: subItem.pre_preparo || "",
      });
    } else {
      children.push({
        tipo: "ingrediente",
        ingrediente_id: subItem.ingrediente_id || "",
        ingrediente_nome: subItem.ingrediente_nome || "",
        quantidade_por_porcao: propQtd,
        pre_preparo: subItem.pre_preparo || "",
        medida_caseira: subItem.medida_caseira || "",
      });
    }
  }
  return { children, rendimentoEfetivo, rendimentoEstimado };
}