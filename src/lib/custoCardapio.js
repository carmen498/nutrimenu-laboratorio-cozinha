// Fase 10 — custo/preço do Cardápio derivado do Motor de Custos Canônico.
// CardapioReceita.custo_total e Receita.custo_total permanecem apenas como cache
// de compatibilidade; quando há contexto comercial, o custo é recalculado pela
// composição + FC + preço efetivo do usuário.
import { custoEscalado } from "@/lib/custoReceita";
import { calcularInsumosCardapioEscalados } from "@/lib/escalonamentoCustos";

export function quantidadeAoVivo(cr, num) {
  return (Number(cr?.per_capita_g) || 0) * (Number(num) || 0);
}

export function custoAoVivo(cr, receitaMap, ingredientesPorReceita, num, contexto = null) {
  const rec = receitaMap?.[cr?.receita_id];
  if (!rec) return 0;
  const receitaId = cr.receita_id;
  const ingredientes = ingredientesPorReceita?.[receitaId] || [];
  const quantidade = quantidadeAoVivo(cr, num);

  // Sem contexto canônico explicitamente carregado, preservar o fallback de
  // compatibilidade pelo cache da Receita em vez de recalcular com mapas vazios
  // e transformar um custo existente em zero.
  if (!contexto?.ingredienteMap) {
    return custoEscalado(rec, ingredientes, quantidade, null);
  }

  return custoEscalado(rec, ingredientes, quantidade, {
    ingredienteMap: contexto.ingredienteMap,
    insumosReceita: contexto.insumosPorReceita?.[receitaId] || [],
    esquecidos: contexto.esquecidosPorReceita?.[receitaId] || [],
    unidadesFinais: Number(num) || 1,
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
  contextoCanonicoCarregado = false,
}) {
  const contexto = contextoCanonicoCarregado
    ? { ingredienteMap, insumosPorReceita, esquecidosPorReceita }
    : null;
  const receitasView = (receitas || []).map((r) => ({
    ...r,
    quantidade_total_g: quantidadeAoVivo(r, num),
    custo_total: custoAoVivo(r, receitaMap, ingredientesPorReceita, num, contexto),
  }));
  const custoReceitas = receitasView.reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
  const insumosCalculados = calcularInsumosCardapioEscalados(insumos, num);
  const insumosView = insumosCalculados.itens.map((item) => ({
    ...item,
    quantidade_escalada: item.quantidadeEscalada,
    custo_escalado: item.custoEscalado,
  }));
  const custoInsumos = insumosCalculados.custoTotal;
  const total = custoReceitas + custoInsumos;
  const porUnidade = Number(num) > 0 ? total / Number(num) : 0;
  const precoVenda = Number(markup) > 0 ? porUnidade * (1 + Number(markup) / 100) : 0;
  const lucro = precoVenda - porUnidade;
  return { receitasView, insumosView, custoReceitas, custoInsumos, total, porUnidade, precoVenda, lucro, insumosSemPreco: insumosCalculados.itensSemPreco };
}
