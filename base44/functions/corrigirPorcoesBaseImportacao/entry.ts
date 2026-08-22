import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Correção de um bug antigo do importador de texto: porcoes_base recebeu o
// valor do campo PORÇÃO do arquivo (Sopas) ou a soma dos próprios insumos
// (Aves importadas em lote), em vez de 1.
//
// Fase 5: quando esta rotina corrige um rendimento comprovadamente corrompido
// pelo importador, também sincroniza o modelo canônico de rendimento. O valor
// corrigido é classificado como IMPORTADO / A VALIDAR — nunca como medição real.

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
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [sopas, avesTodas, itens, logsRendimento] = await Promise.all([
      base44.asServiceRole.entities.Receita.filter({ nome: { $in: SOPAS } }),
      base44.asServiceRole.entities.Receita.filter({ categorias: 'Aves' }),
      base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 5000),
      base44.asServiceRole.entities.CorrecaoRendimentoLog.list('-created_date', 500),
    ]);

    const itensPorReceita = {};
    for (const i of itens) {
      if (!i?.receita_id) continue;
      if (!itensPorReceita[i.receita_id]) itensPorReceita[i.receita_id] = [];
      itensPorReceita[i.receita_id].push(i);
    }

    // O rastro confiável das Aves afetadas é o histórico da correção antiga.
    const idsComRendimentoCorrigido = new Set(logsRendimento.map((l) => l.receita_id));
    const avesCorrompidas = avesTodas.filter((r) => idsComRendimentoCorrigido.has(r.id));

    const updates = [];
    const logs = [];

    const processar = (r, perCapitaAlvo) => {
      const receitaItens = itensPorReceita[r.id] || [];
      const parentsComFilhos = new Set(
        receitaItens.map((i) => i.subreceita_parent_id).filter(Boolean)
      );

      // Com porcoes_base corrigido para 1, esta é a base líquida pré-preparo.
      const pesoPreAlvo = receitaItens.reduce((sum, item) => {
        if (!item || item.tipo === 'grupo') return sum;
        if (item.tipo === 'subreceita' && parentsComFilhos.has(item.id)) return sum;
        return sum + (Number(item.quantidade_por_porcao) || 0);
      }, 0);

      const porcoesBaseAtual = r.porcoes_base ?? null;
      const perCapitaAtual = r.per_capita_g ?? null;
      const rendimentoAtual = r.rendimento_total ?? null;

      const porcoesBaseAlvo = 1;
      // Esta rotina conhece apenas a correção estrutural da importação; não possui
      // uma pesagem pós-preparo real. Mantém o valor histórico corrigido como
      // estimativa importada e exige validação posterior.
      const rendimentoAlvo = pesoPreAlvo;

      const mudaPorcoes = Number(porcoesBaseAtual) !== porcoesBaseAlvo;
      const mudaPerCapita = Number(perCapitaAtual) !== perCapitaAlvo;
      const mudaRendimento = Math.abs((Number(rendimentoAtual) || 0) - rendimentoAlvo) >= 0.01;
      const mudaCanonico =
        Math.abs((Number(r.peso_pre_preparo_total) || 0) - pesoPreAlvo) >= 0.01 ||
        Math.abs((Number(r.peso_pos_preparo_total) || 0) - rendimentoAlvo) >= 0.01 ||
        r.rendimento_origem !== 'importado' ||
        r.rendimento_status !== 'a_validar';

      if (!mudaPorcoes && !mudaPerCapita && !mudaRendimento && !mudaCanonico) return;

      updates.push({
        id: r.id,
        porcoes_base: porcoesBaseAlvo,
        per_capita_g: perCapitaAlvo,
        peso_pre_preparo_total: pesoPreAlvo,
        peso_pos_preparo_total: rendimentoAlvo,
        rendimento_total: rendimentoAlvo,
        rendimento_origem: 'importado',
        rendimento_status: 'a_validar',
      });
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
      observacao: 'Rendimentos corrigidos pela importação foram marcados como a_validar, não como medidos.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
