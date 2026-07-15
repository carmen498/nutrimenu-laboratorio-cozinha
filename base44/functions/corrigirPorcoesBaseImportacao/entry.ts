import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Correção de um bug antigo do importador de texto: porcoes_base recebeu o
// valor do campo PORÇÃO do arquivo (Sopas) ou a soma dos próprios insumos
// (Aves importadas em lote), em vez de 1, deixando per_capita_g vazio/errado
// e inflando rendimento_total.
//
// NÃO altera ingredientes, quantidades ou preços — apenas porcoes_base,
// per_capita_g e rendimento_total.
// Grupo A (Sopas): lista fechada de 8 receitas.
// Grupo B (Aves): QUALQUER receita da categoria "Aves" cuja porcoes_base
// bata com a assinatura do bug (porcoes_base > 100 E ≈ soma dos ingredientes)
// — nunca toca em receitas de Aves fora desse padrão.
// Idempotente: só grava se algum campo-alvo ainda estiver diferente do valor correto.

const SOPAS = [
  'CALDO VERDE',
  'SOPA DE PALMITO',
  'SOPA CREME DE QUEIJO',
  'SOPA CREME DE MORANGA',
  'SOPA CREME DE ERVILHAS',
  'SOPA CREME DE VERDURAS',
  'SOPA CREME DE ALHO-PORÓ',
  'CONSOMÊ DE LEGUMES',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [sopas, avesTodas, itens, logsRendimento] = await Promise.all([
      base44.asServiceRole.entities.Receita.filter({ nome: { $in: SOPAS } }),
      base44.asServiceRole.entities.Receita.filter({ categorias: 'Aves' }),
      base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 5000),
      base44.asServiceRole.entities.CorrecaoRendimentoLog.list('-created_date', 500),
    ]);

    const somaPorReceita = {};
    for (const i of itens) {
      if (i.tipo === 'grupo') continue;
      somaPorReceita[i.receita_id] = (somaPorReceita[i.receita_id] || 0) + (Number(i.quantidade_por_porcao) || 0);
    }

    // Grupo B: a assinatura original do bug (porcoes_base > 100) já foi apagada
    // por uma correção anterior de rendimento_total — hoje toda a categoria
    // Aves está com porcoes_base = 1. O rastro confiável que resta é o
    // CorrecaoRendimentoLog: só as receitas importadas em lote com o bug
    // precisaram ter seu rendimento_total recalculado por aquela correção.
    // Receitas de Aves cadastradas corretamente desde o início não aparecem
    // nesse log e permanecem intocadas aqui.
    const idsComRendimentoCorrigido = new Set(logsRendimento.map((l) => l.receita_id));
    const avesCorrompidas = avesTodas.filter((r) => idsComRendimentoCorrigido.has(r.id));

    const updates = [];
    const logs = [];

    const processar = (r, perCapitaAlvo) => {
      const somaIngredientes = somaPorReceita[r.id] || 0;

      const porcoesBaseAtual = r.porcoes_base ?? null;
      const perCapitaAtual = r.per_capita_g ?? null;
      const rendimentoAtual = r.rendimento_total ?? null;

      const porcoesBaseAlvo = 1;
      const rendimentoAlvo = somaIngredientes;

      const mudaPorcoes = Number(porcoesBaseAtual) !== porcoesBaseAlvo;
      const mudaPerCapita = Number(perCapitaAtual) !== perCapitaAlvo;
      const mudaRendimento = Math.abs((Number(rendimentoAtual) || 0) - rendimentoAlvo) >= 0.01;

      if (!mudaPorcoes && !mudaPerCapita && !mudaRendimento) return; // já correta — idempotência

      updates.push({ id: r.id, porcoes_base: porcoesBaseAlvo, per_capita_g: perCapitaAlvo, rendimento_total: rendimentoAlvo });
      logs.push({
        receita_id: r.id,
        receita_nome: r.nome || '',
        porcoes_base_anterior: porcoesBaseAtual,
        porcoes_base_novo: porcoesBaseAlvo,
        per_capita_g_anterior: perCapitaAtual,
        per_capita_g_novo: perCapitaAlvo,
        rendimento_total_anterior: rendimentoAtual,
        rendimento_total_novo: rendimentoAlvo,
      });
    };

    for (const r of sopas) processar(r, 400);
    for (const r of avesCorrompidas) processar(r, 150);

    if (updates.length > 0) {
      await base44.asServiceRole.entities.Receita.bulkUpdate(updates);
      await base44.asServiceRole.entities.CorrecaoPorcoesBaseLog.bulkCreate(logs);
    }

    return Response.json({
      total_sopas: sopas.length,
      total_aves_identificadas: avesCorrompidas.length,
      total_corrigido: updates.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});