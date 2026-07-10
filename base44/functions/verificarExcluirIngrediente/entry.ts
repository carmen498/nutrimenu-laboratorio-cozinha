import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ingredienteId = body.ingrediente_id;
    const acao = body.acao || 'verificar';

    if (!ingredienteId) {
      return Response.json({ error: 'ingrediente_id obrigatório' }, { status: 400 });
    }

    // Find all recipe lines using this ingredient
    const lines = await base44.asServiceRole.entities.IngredienteReceita.filter({ ingrediente_id: ingredienteId });
    const receitaIds = [...new Set(lines.map(l => l.receita_id))];

    // Get recipe names
    const receitas = [];
    for (const recId of receitaIds) {
      try {
        const recs = await base44.asServiceRole.entities.Receita.filter({ id: recId });
        if (recs[0]) receitas.push({ id: recId, nome: recs[0].nome });
      } catch {}
    }

    if (acao === 'excluir') {
      // Delete all recipe lines referencing this ingredient
      if (lines.length > 0) {
        await base44.asServiceRole.entities.IngredienteReceita.deleteMany({ ingrediente_id: ingredienteId });
      }
      // Mark affected recipes as revisar
      for (const recId of receitaIds) {
        try {
          await base44.asServiceRole.entities.Receita.update(recId, { revisar: true });
        } catch {}
      }
      // Delete the ingredient
      await base44.asServiceRole.entities.Ingrediente.delete(ingredienteId);

      return Response.json({
        success: true,
        receitasAfetadas: receitas.length,
        receitas: receitas
      });
    }

    return Response.json({
      receitas: receitas,
      total: receitas.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});