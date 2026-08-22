import { base44 } from "@/api/base44Client";
import { resolverRendimentoReceita } from "@/lib/rendimentoReceita";

/**
 * Busca e explode os ingredientes de uma sub-receita com quantidades proporcionais.
 * Fase 4: preserva unidade, FC específico e medida caseira vinculada.
 * Fase 5: escala pela fonte canônica de rendimento/PDP.
 */
export async function explodeSubreceita(subreceita, qtdPorPorcao) {
  const subItens = await base44.entities.IngredienteReceita.filter(
    { receita_id: subreceita.id }, "ordem", 200
  );
  const subPorcoesBase = subreceita.porcoes_base || 1;
  const rendimentoInfo = resolverRendimentoReceita(subreceita, subItens);
  const rendimentoEfetivo = rendimentoInfo.pesoPosPreparoEfetivo > 0
    ? rendimentoInfo.pesoPosPreparoEfetivo
    : 1;
  const rendimentoEstimado = rendimentoInfo.rendimentoEstimado;

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
