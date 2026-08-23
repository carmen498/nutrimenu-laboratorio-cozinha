import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ingredienteId = body.ingrediente_id;
    const acao = body.acao || 'verificar';

    if (!ingredienteId) {
      return Response.json({ error: 'ingrediente_id obrigatório' }, { status: 400 });
    }

    // Esta função usa service role para enxergar todas as referências do catálogo.
    // Por isso, tanto a verificação quanto a exclusão são exclusivas de admin.
    const lines = await base44.asServiceRole.entities.IngredienteReceita.filter({ ingrediente_id: ingredienteId });
    const receitaIds = [...new Set(lines.map(l => l.receita_id))];

    const receitas = [];
    for (const recId of receitaIds) {
      try {
        const recs = await base44.asServiceRole.entities.Receita.filter({ id: recId });
        if (recs[0]) receitas.push({ id: recId, nome: recs[0].nome });
      } catch {}
    }

    if (acao === 'excluir') {
      if (lines.length > 0) {
        await base44.asServiceRole.entities.IngredienteReceita.deleteMany({ ingrediente_id: ingredienteId });
      }

      for (const recId of receitaIds) {
        try {
          await base44.asServiceRole.entities.Receita.update(recId, { revisar: true });
        } catch {}
      }

      let receitasInvalidadas = 0;
      if (receitaIds.length > 0) {
        const invalidacao = await invalidarCustosPorDependencias({
          entities: base44.asServiceRole.entities,
          receitaIds,
          motivo: 'ingrediente_mestre_excluido_da_composicao',
          origem: 'verificar_excluir_ingrediente',
        });
        receitasInvalidadas = invalidacao.receitas_invalidadas || 0;
      }

      await base44.asServiceRole.entities.Ingrediente.delete(ingredienteId);

      return Response.json({
        success: true,
        receitasAfetadas: receitas.length,
        receitasInvalidadas,
        receitas,
      });
    }

    return Response.json({
      receitas,
      total: receitas.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});