import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

// Fase 6 — normalização não destrutiva de IngredienteReceita.
//
// Promove para modelo_versao=2 somente registros cuja referência canônica já
// existe. Campos *_nome e medida_caseira são preservados como cache legado.
// Registros sem ingrediente_id/subreceita_id válidos NÃO são apagados nem
// associados automaticamente: entram em `a_revisar`.

const TIPOS = new Set(['ingrediente', 'grupo', 'subreceita']);

const inferirTipo = (item: any) => {
  if (TIPOS.has(item?.tipo)) return item.tipo;
  if (item?.subreceita_id) return 'subreceita';
  if (item?.titulo_grupo) return 'grupo';
  return 'ingrediente';
};

const numeroNaoNegativo = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [itens, ingredientes, receitas] = await Promise.all([
      base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 10000),
      base44.asServiceRole.entities.Ingrediente.list('nome', 5000),
      base44.asServiceRole.entities.Receita.list('nome', 5000),
    ]);

    const ingredienteIds = new Set((ingredientes || []).map((i: any) => i.id));
    const receitaMap = new Map((receitas || []).map((r: any) => [r.id, r]));

    const updates: any[] = [];
    const aRevisar: any[] = [];
    const contagem = { ingrediente: 0, grupo: 0, subreceita: 0 };

    for (const item of itens || []) {
      const tipo = inferirTipo(item);
      const pai: any = receitaMap.get(item.receita_id);
      const problemas: string[] = [];

      if (!pai) problemas.push('receita_id_invalido');
      if (tipo === 'ingrediente' && (!item.ingrediente_id || !ingredienteIds.has(item.ingrediente_id))) {
        problemas.push('ingrediente_id_ausente_ou_invalido');
      }
      if (tipo === 'subreceita' && (!item.subreceita_id || !receitaMap.has(item.subreceita_id))) {
        problemas.push('subreceita_id_ausente_ou_invalido');
      }
      if (tipo === 'grupo' && !String(item.titulo_grupo || '').trim()) {
        problemas.push('grupo_sem_titulo');
      }

      if (problemas.length > 0) {
        aRevisar.push({
          id: item.id,
          receita_id: item.receita_id || null,
          tipo,
          ingrediente_nome: item.ingrediente_nome || null,
          subreceita_nome: item.subreceita_nome || null,
          problemas,
        });
        continue;
      }

      const patch: any = {
        id: item.id,
        modelo_versao: 2,
        tipo,
      };

      if (tipo === 'grupo') {
        patch.titulo_grupo = String(item.titulo_grupo || '').trim().toUpperCase();
        patch.ingrediente_id = '';
        patch.subreceita_id = '';
        patch.quantidade_por_porcao = 0;
        patch.fator_correcao_override = 0;
        patch.medida_caseira_id = '';
      } else {
        patch.quantidade_por_porcao = numeroNaoNegativo(item.quantidade_por_porcao, 0);
        patch.unidade_quantidade = item.unidade_quantidade === 'ml' || item.unidade_quantidade === 'g'
          ? item.unidade_quantidade
          : (pai?.unidade_base === 'ml' ? 'ml' : 'g');
        patch.proporcional = item.proporcional !== false;

        if (tipo === 'ingrediente') {
          patch.subreceita_id = '';
          patch.fator_correcao_override = Number(item.fator_correcao_override) > 0
            ? Number(item.fator_correcao_override)
            : 0;
        } else {
          patch.ingrediente_id = '';
          patch.fator_correcao_override = 0;
          patch.medida_caseira_id = '';
        }
      }

      contagem[tipo as keyof typeof contagem] += 1;

      const mudou = Object.entries(patch).some(([chave, valor]) => {
        if (chave === 'id') return false;
        return item[chave] !== valor;
      });
      if (mudou) updates.push(patch);
    }

    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.IngredienteReceita.bulkUpdate(updates.slice(i, i + 500));
    }

    let receitasInvalidadas = 0;
    if (updates.length > 0) {
      const itemMap = new Map((itens || []).map((item: any) => [item.id, item]));
      const receitaIds = [...new Set(updates.map((u: any) => itemMap.get(u.id)?.receita_id).filter(Boolean))];
      const invalidacao = await invalidarCustosPorDependencias({
        entities: base44.asServiceRole.entities,
        receitaIds,
        motivo: 'normalizacao_composicao_receita',
        origem: 'normalizar_ingrediente_receita',
      });
      receitasInvalidadas = invalidacao.receitas_invalidadas || 0;
    }

    return Response.json({
      total_processado: (itens || []).length,
      total_normalizado: updates.length,
      receitas_invalidadas: receitasInvalidadas,
      total_a_revisar: aRevisar.length,
      normalizaveis_por_tipo: contagem,
      a_revisar: aRevisar.slice(0, 500),
      truncado: aRevisar.length > 500,
      observacao: 'Campos de cache legado foram preservados; nenhuma referência ausente foi inventada.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
