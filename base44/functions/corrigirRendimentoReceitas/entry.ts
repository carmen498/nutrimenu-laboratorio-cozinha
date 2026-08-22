import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Fase 5 — normalização segura de rendimento.
//
// Esta função NÃO substitui mais rendimento_total pela soma dos ingredientes.
// Um PDP menor que o peso pré-preparo pode representar perda real de cocção.
// O objetivo agora é somente:
// 1) calcular/salvar o snapshot do peso líquido pré-preparo;
// 2) migrar o rendimento legado para peso_pos_preparo_total sem alterar seu valor;
// 3) classificar valores legados como "a_validar";
// 4) marcar receitas sem PDP como "pendente".

const positivo = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const receitas = await base44.asServiceRole.entities.Receita.list('-nome', 2000);
    const itens = await base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 5000);

    const itensPorReceita: Record<string, any[]> = {};
    for (const item of itens || []) {
      if (!item?.receita_id) continue;
      if (!itensPorReceita[item.receita_id]) itensPorReceita[item.receita_id] = [];
      itensPorReceita[item.receita_id].push(item);
    }

    const updates: any[] = [];

    for (const r of receitas || []) {
      const receitaItens = itensPorReceita[r.id] || [];
      const porcoesBase = positivo(r.porcoes_base) || 1;
      const parentsComFilhos = new Set(
        receitaItens.map((i) => i.subreceita_parent_id).filter(Boolean)
      );

      const pesoPre = receitaItens.reduce((sum, item) => {
        if (!item || item.tipo === 'grupo') return sum;
        if (item.tipo === 'subreceita' && parentsComFilhos.has(item.id)) return sum;
        return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
      }, 0);

      const pdpCanonico = positivo(r.peso_pos_preparo_total);
      const pdpLegado = positivo(r.rendimento_total);
      const pdp = pdpCanonico || pdpLegado;

      const update: Record<string, unknown> = {
        id: r.id,
        peso_pre_preparo_total: pesoPre,
      };

      if (pdp > 0) {
        update.peso_pos_preparo_total = pdp;
        update.rendimento_total = pdp; // compatibilidade
        update.rendimento_origem = r.rendimento_origem || (pdpCanonico ? 'medido' : 'legado');
        update.rendimento_status = r.rendimento_status || (pdpCanonico ? 'a_validar' : 'a_validar');
      } else {
        update.rendimento_origem = r.rendimento_origem || 'estimado';
        update.rendimento_status = 'pendente';
      }

      const mudou =
        Number(r.peso_pre_preparo_total || 0) !== Number(update.peso_pre_preparo_total || 0) ||
        (pdp > 0 && Number(r.peso_pos_preparo_total || 0) !== Number(update.peso_pos_preparo_total || 0)) ||
        (update.rendimento_origem && r.rendimento_origem !== update.rendimento_origem) ||
        r.rendimento_status !== update.rendimento_status;

      if (mudou) updates.push(update);
    }

    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.Receita.bulkUpdate(updates.slice(i, i + 500));
    }

    return Response.json({
      total_processado: receitas.length,
      total_normalizado: updates.length,
      total_corrigido: 0,
      observacao: 'Nenhum PDP foi substituído pela soma dos ingredientes.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
