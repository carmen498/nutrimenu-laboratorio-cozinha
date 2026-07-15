import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Correção pontual e restrita a 11 receitas corrompidas por um bug antigo do
// importador de texto: porcoes_base recebeu o valor do campo PORÇÃO do arquivo
// (Sopas) ou a soma dos insumos (Aves), em vez de 1, deixando per_capita_g
// vazio e inflando rendimento_total (que havia sido recalculado como
// soma_ingredientes × porcoes_base por uma correção anterior).
//
// NÃO altera ingredientes, quantidades ou preços — apenas porcoes_base,
// per_capita_g (só no grupo A) e rendimento_total, e SOMENTE nestas 11 receitas.
// Idempotente: só grava se algum dos campos-alvo ainda estiver diferente do valor correto.

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

const AVES = ['FRICASSÊ DE FRANGO', 'BOBO DE FRANGO', 'FRANGO ASSADO'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const alvoNomes = [...SOPAS, ...AVES];
    const receitas = await base44.asServiceRole.entities.Receita.filter({ nome: { $in: alvoNomes } });
    const itens = await base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 5000);

    const somaPorReceita = {};
    for (const i of itens) {
      if (i.tipo === 'grupo') continue;
      somaPorReceita[i.receita_id] = (somaPorReceita[i.receita_id] || 0) + (Number(i.quantidade_por_porcao) || 0);
    }

    const updates = [];
    const logs = [];

    for (const r of receitas) {
      const isSopa = SOPAS.includes(r.nome);
      const isAve = AVES.includes(r.nome);
      if (!isSopa && !isAve) continue;

      const somaIngredientes = somaPorReceita[r.id] || 0;

      const porcoesBaseAtual = r.porcoes_base ?? null;
      const perCapitaAtual = r.per_capita_g ?? null;
      const rendimentoAtual = r.rendimento_total ?? null;

      const porcoesBaseAlvo = 1;
      const perCapitaAlvo = isSopa ? 400 : perCapitaAtual; // Aves: não preencher
      const rendimentoAlvo = somaIngredientes;

      const mudaPorcoes = Number(porcoesBaseAtual) !== porcoesBaseAlvo;
      const mudaPerCapita = isSopa && Number(perCapitaAtual) !== perCapitaAlvo;
      const mudaRendimento = Math.abs((Number(rendimentoAtual) || 0) - rendimentoAlvo) >= 0.01;

      if (!mudaPorcoes && !mudaPerCapita && !mudaRendimento) continue; // já correta — idempotência

      const update = { id: r.id, porcoes_base: porcoesBaseAlvo, rendimento_total: rendimentoAlvo };
      if (isSopa) update.per_capita_g = perCapitaAlvo;

      updates.push(update);
      logs.push({
        receita_id: r.id,
        receita_nome: r.nome || '',
        porcoes_base_anterior: porcoesBaseAtual,
        porcoes_base_novo: porcoesBaseAlvo,
        per_capita_g_anterior: perCapitaAtual,
        per_capita_g_novo: isSopa ? perCapitaAlvo : perCapitaAtual,
        rendimento_total_anterior: rendimentoAtual,
        rendimento_total_novo: rendimentoAlvo,
      });
    }

    if (updates.length > 0) {
      await base44.asServiceRole.entities.Receita.bulkUpdate(updates);
      await base44.asServiceRole.entities.CorrecaoPorcoesBaseLog.bulkCreate(logs);
    }

    return Response.json({ total_receitas_alvo: receitas.length, total_corrigido: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});