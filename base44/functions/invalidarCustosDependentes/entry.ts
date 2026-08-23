import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Fase 10.3 — invalidação automática dos caches de custo.
//
// Entradas canônicas:
// - receita_ids: receitas cuja composição/rendimento/insumo mudou;
// - ingrediente_ids: ingredientes mestre cujo preço/FC mudou (admin-only).
//
// A função propaga a invalidação para receitas-pai que usam a receita alterada
// como sub-receita. `incompleto` e `legado` preservam seu status semântico, mas
// recebem custo_cache_invalido=true. Apenas `atual` vira `a_recalcular`.

const txt = (v: any) => v == null ? '' : String(v).trim();
const uniq = (values: any[]) => [...new Set((values || []).map(txt).filter(Boolean))];

async function listarFiltrado(entity: any, query: any, sort = 'created_date', pageSize = 500) {
  const out: any[] = [];
  let skip = 0;
  while (true) {
    const page = await entity.filter(query, sort, pageSize, skip);
    if (!page?.length) break;
    out.push(...page);
    if (page.length < pageSize) break;
    skip += page.length;
  }
  return out;
}

async function bulk(entity: any, rows: any[]) {
  const unique = new Map<string, any>();
  for (const row of rows || []) if (row?.id) unique.set(row.id, row);
  const values = [...unique.values()];
  for (let i = 0; i < values.length; i += 200) {
    await entity.bulkUpdate(values.slice(i, i + 200));
  }
  return values.length;
}

function ownerId(receita: any) {
  return txt(receita?.usuario_dono_id) || txt(receita?.created_by_id);
}

function podeInvalidarReceita(user: any, receita: any) {
  if (!receita) return false;
  if (user?.role === 'admin') return true;
  return receita?.is_base === false && ownerId(receita) === txt(user?.id);
}

function proximoStatus(status: any) {
  const atual = txt(status);
  if (atual === 'atual') return 'a_recalcular';
  if (atual === 'a_recalcular' || atual === 'incompleto' || atual === 'legado') return atual;
  return 'a_recalcular';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const receitaIdsEntrada = uniq(body?.receita_ids || []);
    const ingredienteIds = uniq(body?.ingrediente_ids || []);
    const motivo = txt(body?.motivo) || 'alteracao_dependencia_custo';
    const origem = txt(body?.origem) || 'aplicacao';

    if (!receitaIdsEntrada.length && !ingredienteIds.length) {
      return Response.json({ error: 'Informe receita_ids e/ou ingrediente_ids.' }, { status: 400 });
    }
    if (ingredienteIds.length && user.role !== 'admin') {
      return Response.json({ error: 'Somente administradores podem invalidar por ingrediente mestre.' }, { status: 403 });
    }

    const sr = base44.asServiceRole.entities;
    const receitaCache = new Map<string, any>();
    const getReceita = async (id: string) => {
      if (!id) return null;
      if (!receitaCache.has(id)) {
        const row = await sr.Receita.get(id).catch(() => null);
        receitaCache.set(id, row);
      }
      return receitaCache.get(id) || null;
    };

    // Raízes explícitas precisam estar no escopo editável do usuário.
    for (const id of receitaIdsEntrada) {
      const receita = await getReceita(id);
      if (!podeInvalidarReceita(user, receita)) {
        return Response.json({ error: `Receita sem permissão para invalidação: ${id}` }, { status: 403 });
      }
    }

    const profundidade = new Map<string, number>();
    const fila: string[] = [];
    const adicionar = async (id: string, depth: number) => {
      if (!id) return;
      const receita = await getReceita(id);
      if (!receita) return;
      if (!podeInvalidarReceita(user, receita)) return;
      const anterior = profundidade.get(id);
      if (anterior != null && anterior <= depth) return;
      profundidade.set(id, depth);
      fila.push(id);
    };

    for (const id of receitaIdsEntrada) await adicionar(id, 0);

    // Mudança de preço/FC mestre: qualquer receita que contenha o ingrediente,
    // inclusive por cache atômico de sub-receita, é diretamente afetada.
    if (ingredienteIds.length) {
      for (const ingredienteId of ingredienteIds) {
        const refs = await listarFiltrado(sr.IngredienteReceita, { ingrediente_id: ingredienteId }, 'created_date');
        for (const ref of refs) await adicionar(txt(ref?.receita_id), 0);
      }
    }

    // Propagação reversa: receita alterada -> marcadores que a usam -> pais -> avós...
    let cursor = 0;
    while (cursor < fila.length) {
      const sourceId = fila[cursor++];
      const depth = profundidade.get(sourceId) || 0;
      const marcadores = await listarFiltrado(
        sr.IngredienteReceita,
        { tipo: 'subreceita', subreceita_id: sourceId },
        'created_date'
      );
      for (const marker of marcadores) {
        await adicionar(txt(marker?.receita_id), depth + 1);
      }
    }

    const agora = new Date().toISOString();
    const updates: any[] = [];
    const statusAntes: Record<string, number> = {};
    const statusDepois: Record<string, number> = {};

    for (const [id, depth] of profundidade.entries()) {
      const receita = await getReceita(id);
      if (!receita) continue;
      const antes = txt(receita?.custo_cache_status) || 'sem_status';
      const depois = proximoStatus(receita?.custo_cache_status);
      statusAntes[antes] = (statusAntes[antes] || 0) + 1;
      statusDepois[depois] = (statusDepois[depois] || 0) + 1;
      updates.push({
        id,
        custo_cache_status: depois,
        custo_cache_invalido: true,
        custo_cache_invalidado_em: agora,
        custo_cache_invalidacao_motivo: motivo,
        custo_cache_invalidacao_origem: origem,
        custo_cache_invalidacao_profundidade: depth,
      });
    }

    const atualizados = await bulk(sr.Receita, updates);

    return Response.json({
      ok: true,
      receitas_raiz: receitaIdsEntrada.length,
      ingredientes_raiz: ingredienteIds.length,
      receitas_invalidadas: atualizados,
      propagadas: [...profundidade.values()].filter((d) => d > 0).length,
      profundidade_maxima: Math.max(0, ...profundidade.values()),
      status_antes: statusAntes,
      status_depois: statusDepois,
      receita_ids: [...profundidade.keys()],
      invalidado_em: agora,
      motivo,
      origem,
    });
  } catch (error: any) {
    console.error('invalidarCustosDependentes', error);
    return Response.json({ error: error?.message || 'Erro ao invalidar custos.' }, { status: 500 });
  }
});
