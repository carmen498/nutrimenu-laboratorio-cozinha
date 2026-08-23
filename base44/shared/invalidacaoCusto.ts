// Fase 10.3 — núcleo backend compartilhado de invalidação de custos.

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

function proximoStatus(status: any) {
  const atual = txt(status);
  if (atual === 'atual') return 'a_recalcular';
  if (atual === 'a_recalcular' || atual === 'incompleto' || atual === 'legado') return atual;
  return 'a_recalcular';
}

export async function invalidarCustosPorDependencias({
  entities,
  receitaIds = [],
  ingredienteIds = [],
  motivo = 'alteracao_dependencia_custo',
  origem = 'backend',
  podeInvalidar = () => true,
}: any = {}) {
  if (!entities?.Receita || !entities?.IngredienteReceita) {
    throw new Error('Entidades de Receita/IngredienteReceita são obrigatórias para invalidar custos.');
  }

  const receitasEntrada = uniq(receitaIds);
  const ingredientesEntrada = uniq(ingredienteIds);
  const receitaCache = new Map<string, any>();
  const getReceita = async (id: string) => {
    if (!id) return null;
    if (!receitaCache.has(id)) {
      receitaCache.set(id, await entities.Receita.get(id).catch(() => null));
    }
    return receitaCache.get(id) || null;
  };

  const profundidade = new Map<string, number>();
  const fila: string[] = [];
  const adicionar = async (id: string, depth: number) => {
    if (!id) return;
    const receita = await getReceita(id);
    if (!receita || !podeInvalidar(receita)) return;
    const anterior = profundidade.get(id);
    if (anterior != null && anterior <= depth) return;
    profundidade.set(id, depth);
    fila.push(id);
  };

  for (const id of receitasEntrada) await adicionar(id, 0);

  for (const ingredienteId of ingredientesEntrada) {
    const refs = await listarFiltrado(entities.IngredienteReceita, { ingrediente_id: ingredienteId }, 'created_date');
    for (const ref of refs) await adicionar(txt(ref?.receita_id), 0);
  }

  let cursor = 0;
  while (cursor < fila.length) {
    const sourceId = fila[cursor++];
    const depth = profundidade.get(sourceId) || 0;
    const marcadores = await listarFiltrado(
      entities.IngredienteReceita,
      { tipo: 'subreceita', subreceita_id: sourceId },
      'created_date'
    );
    for (const marker of marcadores) await adicionar(txt(marker?.receita_id), depth + 1);
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
    const patch = {
      id,
      custo_cache_status: depois,
      custo_cache_invalido: true,
      custo_cache_invalidado_em: agora,
      custo_cache_invalidacao_motivo: motivo,
      custo_cache_invalidacao_origem: origem,
      custo_cache_invalidacao_profundidade: depth,
    };
    updates.push(patch);
    receitaCache.set(id, { ...receita, ...patch });
  }

  const atualizados = await bulk(entities.Receita, updates);
  return {
    receitas_raiz: receitasEntrada.length,
    ingredientes_raiz: ingredientesEntrada.length,
    receitas_invalidadas: atualizados,
    propagadas: [...profundidade.values()].filter((d) => d > 0).length,
    profundidade_maxima: Math.max(0, ...profundidade.values()),
    status_antes: statusAntes,
    status_depois: statusDepois,
    receita_ids: [...profundidade.keys()],
    invalidado_em: agora,
    motivo,
    origem,
  };
}
