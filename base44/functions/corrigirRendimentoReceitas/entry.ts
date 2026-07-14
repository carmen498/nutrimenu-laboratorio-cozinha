import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Corrige em lote o campo rendimento_total das receitas cujo valor está
// zerado ou é menor que a soma dos pesos (g) dos próprios ingredientes.
// NÃO altera ingredientes, quantidades, preços ou PC — apenas rendimento_total.
// Idempotente: uma receita só é tocada se rendimento_total ainda estiver
// zerado ou abaixo da soma dos ingredientes; se já estiver correta, é ignorada.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const receitas = await base44.asServiceRole.entities.Receita.list('-nome', 2000);
    const itens = await base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 5000);

    const somaPorReceita = {};
    for (const i of itens) {
      if (i.tipo === 'grupo') continue;
      somaPorReceita[i.receita_id] = (somaPorReceita[i.receita_id] || 0) + (Number(i.quantidade_por_porcao) || 0);
    }

    const updates = [];
    const logs = [];

    for (const r of receitas) {
      const rendimentoAtual = Number(r.rendimento_total) || 0;
      const porcoesBase = Number(r.porcoes_base) || 1;
      const somaBase = somaPorReceita[r.id] || 0;
      const soma = somaBase * porcoesBase;

      if (soma <= 0) continue; // sem ingredientes suficientes para calcular, não mexe
      const precisaCorrigir = rendimentoAtual <= 0 || rendimentoAtual < soma;
      if (!precisaCorrigir) continue;
      if (Math.abs(rendimentoAtual - soma) < 0.01) continue; // já correta, idempotência

      updates.push({ id: r.id, rendimento_total: soma });
      logs.push({
        receita_id: r.id,
        receita_nome: r.nome || '',
        rendimento_anterior: rendimentoAtual,
        rendimento_novo: soma,
      });
    }

    // bulkUpdate/bulkCreate aceitam até 500 registros por chamada
    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.Receita.bulkUpdate(updates.slice(i, i + 500));
    }
    for (let i = 0; i < logs.length; i += 500) {
      await base44.asServiceRole.entities.CorrecaoRendimentoLog.bulkCreate(logs.slice(i, i + 500));
    }

    return Response.json({ total_processado: receitas.length, total_corrigido: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});