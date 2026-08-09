// Explode os ingredientes de UMA receita (incluindo sub-receitas, 1 nível) em peso BRUTO
// (quantidade × fator de correção), agregado por ingrediente_id. Usado pelo atalho
// "Adicionar de uma receita" do Carrinho. Nunca varre a base inteira — busca apenas
// os itens da receita selecionada (e de eventuais sub-receitas referenciadas por ela).
import { base44 } from "@/api/base44Client";

export async function explodirReceitaParaCarrinho(receita, ingMap) {
  const porcoes = receita.porcoes_base || 1;
  const itens = await base44.entities.IngredienteReceita.filter({ receita_id: receita.id }, "ordem", 200);
  const totais = {}; // ingrediente_id -> { gramas, nome }

  const add = (ingredienteId, gramas, nome) => {
    if (!ingredienteId || !gramas) return;
    if (!totais[ingredienteId]) totais[ingredienteId] = { gramas: 0, nome };
    totais[ingredienteId].gramas += gramas;
  };

  for (const item of itens) {
    if (item.tipo === "grupo") continue;
    if (item.tipo === "subreceita") {
      const subRec = await base44.entities.Receita.get(item.subreceita_id).catch(() => null);
      if (!subRec) continue;
      const subPorcoesBase = subRec.porcoes_base || 1;
      const subQtdTotal = (item.quantidade_por_porcao || 0) * porcoes;
      const subFator = subRec.rendimento_total > 0 ? subQtdTotal / subRec.rendimento_total : (subQtdTotal / subPorcoesBase);
      const subItens = await base44.entities.IngredienteReceita.filter({ receita_id: subRec.id }, "ordem", 200);
      for (const si of subItens) {
        if (si.tipo !== "ingrediente") continue;
        const ing = ingMap[si.ingrediente_id];
        if (!ing) continue;
        const siQtdBase = (si.quantidade_por_porcao || 0) * subPorcoesBase;
        const bruto = siQtdBase * subFator * (ing.fator_correcao || 1);
        add(si.ingrediente_id, bruto, ing.nome);
      }
    } else {
      const ing = ingMap[item.ingrediente_id];
      if (!ing) continue;
      const bruto = (item.quantidade_por_porcao || 0) * porcoes * (ing.fator_correcao || 1);
      add(item.ingrediente_id, bruto, ing.nome);
    }
  }

  return totais;
}