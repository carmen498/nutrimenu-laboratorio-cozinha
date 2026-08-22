// Fase 10 — custo/preço do Cardápio derivado do Motor de Custos Canônico.
// CardapioReceita.custo_total e Receita.custo_total permanecem apenas como cache
// de compatibilidade; quando há contexto comercial, o custo é recalculado pela
// composição + FC + preço efetivo do usuário.
import { custoEscalado } from "@/lib/custoReceita";

export function quantidadeAoVivo(cr, num) {
  return (Number(cr?.per_capita_g) || 0) * (Number(num) || 0);
}

export function custoAoVivo(cr, receitaMap, ingredientesPorReceita, num, contexto = {}) {
  const rec = receitaMap?.[cr?.receita_id];
  if (!rec) return 0;
  const receitaId = cr.receita_id;
  const ingredientes = ingredientesPorReceita?.[receitaId] || [];
  return custoEscalado(rec, ingredientes, quantidadeAoVivo(cr, num), {
    ingredienteMap: contexto.ingredienteMap || {},
    insumosReceita: contexto.insumosPorReceita?.[receitaId] || [],
    esquecidos: contexto.esquecidosPorReceita?.[receitaId] || [],
  });
}

export function calcularCustoCardapio({
  receitas,
  receitaMap,
  ingredientesPorReceita,
  insumos,
  num,
  markup,
  ingredienteMap = {},
  insumosPorReceita = {},
  esquecidosPorReceita = {},
}) {
  const contexto = { ingredienteMap, insumosPorReceita, esquecidosPorReceita };
  const receitasView = (receitas || []).map((r) => ({
    ...r,
    quantidade_total_g: quantidadeAoVivo(r, num),
    custo_total: custoAoVivo(r, receitaMap, ingredientesPorReceita, num, contexto),
  }));
  const custoReceitas = receitasView.reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
  const custoInsumos = (insumos || []).reduce((s, i) => s + (Number(i.custo_total) || 0), 0);
  const total = custoReceitas + custoInsumos;
  const porUnidade = Number(num) > 0 ? total / Number(num) : 0;
  const precoVenda = Number(markup) > 0 ? porUnidade * (1 + Number(markup) / 100) : 0;
  const lucro = precoVenda - porUnidade;
  return { receitasView, custoReceitas, custoInsumos, total, porUnidade, precoVenda, lucro };
}
