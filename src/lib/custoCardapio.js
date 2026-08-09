// Cálculo de custo/preço de venda do Cardápio — fonte única usada por CardapioAberto
// e pelo Orçamento, para garantir que ambos derivem exatamente o mesmo valor.
// Nunca lê o campo cache CardapioReceita.custo_total; sempre deriva de
// Receita.custo_total + rendimento atual (custo AO VIVO).
import { custoEscalado } from "@/lib/custoReceita";

export function custoAoVivo(cr, receitaMap, ingredientesPorReceita) {
  const rec = receitaMap[cr.receita_id];
  if (!rec) return 0;
  const ingr = ingredientesPorReceita[cr.receita_id] || [];
  return custoEscalado(rec, ingr, Number(cr.quantidade_total_g) || 0);
}

export function calcularCustoCardapio({ receitas, receitaMap, ingredientesPorReceita, insumos, num, markup }) {
  const receitasView = (receitas || []).map(r => ({ ...r, custo_total: custoAoVivo(r, receitaMap, ingredientesPorReceita) }));
  const custoReceitas = receitasView.reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
  const custoInsumos = (insumos || []).reduce((s, i) => s + (Number(i.custo_total) || 0), 0);
  const total = custoReceitas + custoInsumos;
  const porUnidade = num > 0 ? total / num : 0;
  const precoVenda = markup > 0 ? porUnidade * (1 + markup / 100) : 0;
  const lucro = precoVenda - porUnidade;
  return { receitasView, custoReceitas, custoInsumos, total, porUnidade, precoVenda, lucro };
}