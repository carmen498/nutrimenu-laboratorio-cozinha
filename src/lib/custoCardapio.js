// Cálculo de custo/preço de venda do Cardápio — fonte única usada por CardapioAberto
// e pelo Orçamento, para garantir que ambos derivem exatamente o mesmo valor.
// Nunca lê os campos cache CardapioReceita.custo_total/quantidade_total_g; sempre deriva
// de Receita.custo_total + rendimento atual + per_capita_g × convidados atuais (AO VIVO).
import { custoEscalado } from "@/lib/custoReceita";

// Quantidade real (g, ou kg quando buffet) de um prato: sempre per_capita_g × convidados
// atuais — nunca o campo quantidade_total_g salvo no banco, que pode estar desatualizado.
export function quantidadeAoVivo(cr, num) {
  return (Number(cr.per_capita_g) || 0) * (Number(num) || 0);
}

export function custoAoVivo(cr, receitaMap, ingredientesPorReceita, num) {
  const rec = receitaMap[cr.receita_id];
  if (!rec) return 0;
  const ingr = ingredientesPorReceita[cr.receita_id] || [];
  return custoEscalado(rec, ingr, quantidadeAoVivo(cr, num));
}

export function calcularCustoCardapio({ receitas, receitaMap, ingredientesPorReceita, insumos, num, markup }) {
  const receitasView = (receitas || []).map(r => ({
    ...r,
    quantidade_total_g: quantidadeAoVivo(r, num),
    custo_total: custoAoVivo(r, receitaMap, ingredientesPorReceita, num),
  }));
  const custoReceitas = receitasView.reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
  const custoInsumos = (insumos || []).reduce((s, i) => s + (Number(i.custo_total) || 0), 0);
  const total = custoReceitas + custoInsumos;
  const porUnidade = num > 0 ? total / num : 0;
  const precoVenda = markup > 0 ? porUnidade * (1 + markup / 100) : 0;
  const lucro = precoVenda - porUnidade;
  return { receitasView, custoReceitas, custoInsumos, total, porUnidade, precoVenda, lucro };
}