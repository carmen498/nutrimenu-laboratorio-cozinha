import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Fase 10.2.1 — Curadoria assistida das pendências remanescentes de custo.
// LISTAR sugere candidatos sem alterar dados.
// SIMULAR congela o impacto e devolve uma assinatura.
// APLICAR exige a mesma assinatura + confirmar=true e registra a decisão.

const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const positivo = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const txt = (v: any) => v == null ? '' : String(v).trim();
const norm = (v: any) => txt(v)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const STOP = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'COM', 'SEM', 'E', 'AO', 'AOS', 'A', 'O']);
const tokens = (v: any) => norm(v)
  .split(' ')
  .filter((t) => t.length > 1 && !STOP.has(t))
  .map((t) => (t.length > 3 && t.endsWith('S') ? t.slice(0, -1) : t));

async function listarTudo(entity: any, sort = 'created_date', pageSize = 500) {
  const out: any[] = [];
  let skip = 0;
  while (true) {
    const page = await entity.list(sort, pageSize, skip);
    if (!page?.length) break;
    out.push(...page);
    if (page.length < pageSize) break;
    skip += page.length;
  }
  return out;
}

function agruparPorReceita(rows: any[]) {
  const map = new Map<string, any[]>();
  for (const row of rows || []) {
    const id = txt(row?.receita_id);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(row);
  }
  return map;
}

function itemFonteEditavel(item: any, itemMap: Map<string, any>) {
  let atual = item;
  const vistos = new Set<string>();
  for (let depth = 0; depth < 12 && atual?.subreceita_parent_id; depth++) {
    const sourceId = txt(atual?.subreceita_origem_item_id);
    if (!sourceId || vistos.has(sourceId)) return null;
    vistos.add(sourceId);
    atual = itemMap.get(sourceId);
    if (!atual) return null;
  }
  return atual?.tipo === 'ingrediente' ? atual : null;
}

function precoEfetivo(ingrediente: any, ownerId: string, prefMap: Map<string, any>, legacyMap: Map<string, any>) {
  let preco = positivo(ingrediente?.preco_por_g_rs);
  if (!ownerId || !ingrediente?.id) return preco;
  const key = `${ownerId}|${ingrediente.id}`;
  const legacy = positivo(legacyMap.get(key)?.preco_por_g_rs);
  if (legacy > 0) preco = legacy;
  const pref = positivo(prefMap.get(key)?.preco_por_g_rs);
  if (pref > 0) preco = pref;
  return preco;
}

function scoreCandidato(nomeBusca: string, candidato: any, categoriaOrigem = '') {
  const a = norm(nomeBusca);
  const b = norm(candidato?.nome);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let comuns = 0;
  for (const t of ta) if (tb.has(t)) comuns++;
  if (!comuns) return 0;
  const uniao = new Set([...ta, ...tb]).size || 1;
  let score = (comuns / uniao) * 60;
  if (a.includes(b) || b.includes(a)) score += 22;
  if (categoriaOrigem && txt(candidato?.categoria) === categoriaOrigem) score += 8;
  if (positivo(candidato?.preco_por_g_rs) > 0) score += 3;
  return score;
}

function sugestoes(nome: string, ingredientes: any[], categoria = '', excluirId = '') {
  return ingredientes
    .filter((i: any) => i?.id && i.id !== excluirId && txt(i.nome))
    .map((i: any) => ({ i, score: scoreCandidato(nome, i, categoria) }))
    .filter((r: any) => r.score >= 12)
    .sort((a: any, b: any) => b.score - a.score || txt(a.i.nome).localeCompare(txt(b.i.nome)))
    .slice(0, 8)
    .map(({ i, score }: any) => ({
      id: i.id,
      nome: i.nome,
      categoria: i.categoria || null,
      preco_por_g_rs: positivo(i.preco_por_g_rs) || null,
      preco_por_kg_rs: positivo(i.preco_por_g_rs) ? Number((positivo(i.preco_por_g_rs) * 1000).toFixed(2)) : null,
      preco_embalagem_rs: positivo(i.preco_embalagem_rs) || null,
      peso_embalagem_g: positivo(i.peso_embalagem_g) || null,
      score: Number(score.toFixed(1)),
    }));
}

async function sha256(valor: string) {
  const bytes = new TextEncoder().encode(valor);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function bulk(entity: any, rows: any[]) {
  const unicos = new Map<string, any>();
  for (const row of rows || []) if (row?.id) unicos.set(row.id, row);
  const values = [...unicos.values()];
  for (let i = 0; i < values.length; i += 200) await entity.bulkUpdate(values.slice(i, i + 200));
  return values.length;
}

function contextoReceita(receita: any) {
  const ownerId = receita?.is_base === false
    ? (txt(receita?.usuario_dono_id) || txt(receita?.created_by_id))
    : '';
  return { ownerId, contexto: receita?.is_base === false ? 'proprietario' : 'global' };
}

async function carregar(base44: any) {
  const sr = base44.asServiceRole.entities;
  const [receitas, ingredientes, itens, preferencias, precosLegados] = await Promise.all([
    listarTudo(sr.Receita, 'created_date'),
    listarTudo(sr.Ingrediente, 'created_date'),
    listarTudo(sr.IngredienteReceita, 'created_date'),
    listarTudo(sr.IngredienteUsuario, '-updated_date'),
    listarTudo(sr.PrecoIngredienteCliente, '-updated_date'),
  ]);
  const receitaMap = new Map(receitas.map((r: any) => [r.id, r]));
  const ingredienteMap = new Map(ingredientes.map((i: any) => [i.id, i]));
  const itemMap = new Map(itens.map((i: any) => [i.id, i]));
  const itensPorReceita = agruparPorReceita(itens);
  const prefMap = new Map<string, any>();
  for (const p of preferencias) {
    const key = `${txt(p.user_id)}|${txt(p.ingrediente_id)}`;
    if (txt(p.user_id) && txt(p.ingrediente_id) && !prefMap.has(key)) prefMap.set(key, p);
  }
  const legacyMap = new Map<string, any>();
  for (const p of precosLegados) {
    const key = `${txt(p.user_id)}|${txt(p.ingrediente_id)}`;
    if (txt(p.user_id) && txt(p.ingrediente_id) && !legacyMap.has(key)) legacyMap.set(key, p);
  }
  return { sr, receitas, ingredientes, itens, receitaMap, ingredienteMap, itemMap, itensPorReceita, prefMap, legacyMap };
}

function addGrupo(map: Map<string, any>, key: string, base: any, receita: any, item: any, fonte: any) {
  if (!map.has(key)) {
    map.set(key, {
      ...base,
      grupo_chave: key,
      ocorrencias: 0,
      receita_ids: new Set<string>(),
      source_item_ids: new Set<string>(),
      item_ids: new Set<string>(),
      exemplos: [],
      requer_sincronizacao_subreceitas: false,
    });
  }
  const g = map.get(key)!;
  g.ocorrencias++;
  if (receita?.id) g.receita_ids.add(receita.id);
  if (item?.id) g.item_ids.add(item.id);
  if (fonte?.id) g.source_item_ids.add(fonte.id);
  if (item?.subreceita_parent_id) g.requer_sincronizacao_subreceitas = true;
  if (receita?.nome && g.exemplos.length < 6 && !g.exemplos.includes(receita.nome)) g.exemplos.push(receita.nome);
}

function construirGrupos(ctx: any) {
  const { receitas, ingredientes, ingredienteMap, itemMap, itensPorReceita, prefMap, legacyMap } = ctx;
  const incompletas = receitas.filter((r: any) => r?.custo_cache_status === 'incompleto');
  const preco = new Map<string, any>();
  const referencia = new Map<string, any>();
  const outros = new Map<string, any>();
  const receitasSemIssue = new Set<string>();

  for (const receita of incompletas) {
    const { ownerId, contexto } = contextoReceita(receita);
    const componentes = itensPorReceita.get(receita.id) || [];
    const filhosPorParent = new Set(componentes.map((i: any) => txt(i?.subreceita_parent_id)).filter(Boolean));
    let issues = 0;
    let temComposicao = false;

    for (const item of componentes) {
      if (!item || item.tipo === 'grupo') continue;
      const qtd = positivo(item.quantidade_por_porcao);
      if (qtd > 0) temComposicao = true;
      if (item.tipo === 'subreceita') {
        if (txt(item.id) && !filhosPorParent.has(txt(item.id))) {
          issues++;
          addGrupo(outros, 'outro|subreceita_sem_cache', {
            tipo_pendencia: 'outro', nome: 'Sub-receita sem cache', motivo: 'subreceita_sem_cache',
          }, receita, item, null);
        }
        continue;
      }
      if (item.tipo !== 'ingrediente' || qtd <= 0) continue;
      if (item.custo_comportamento === 'reaproveitamento_processo') continue;

      const ingredienteId = txt(item.ingrediente_id);
      const ingrediente = ingredienteId ? ingredienteMap.get(ingredienteId) : null;
      const nomeCache = txt(item.ingrediente_nome);
      const nomeDivergente = Boolean(ingrediente && nomeCache && norm(nomeCache) !== norm(ingrediente.nome));
      const fonte = itemFonteEditavel(item, itemMap);

      if (!ingrediente || nomeDivergente) {
        issues++;
        const nome = nomeCache || ingrediente?.nome || 'Referência sem nome';
        const key = `ref|${norm(nome) || 'SEM_NOME'}`;
        addGrupo(referencia, key, {
          tipo_pendencia: 'referencia_ingrediente',
          nome,
          categoria: ingrediente?.categoria || null,
          ingrediente_origem_id: ingrediente?.id || ingredienteId || null,
          ingrediente_origem_nome: ingrediente?.nome || null,
          motivo: !ingrediente ? 'ingrediente_nao_encontrado' : 'ingrediente_nome_id_divergente',
          contexto,
        }, receita, item, fonte);
        continue;
      }

      const efetivo = precoEfetivo(ingrediente, ownerId, prefMap, legacyMap);
      if (efetivo <= 0) {
        issues++;
        const key = `preco|${contexto}|${ownerId || '*'}|${ingrediente.id}`;
        addGrupo(preco, key, {
          tipo_pendencia: 'ingrediente_sem_preco',
          nome: ingrediente.nome,
          categoria: ingrediente.categoria || null,
          ingrediente_origem_id: ingrediente.id,
          ingrediente_origem_nome: ingrediente.nome,
          contexto,
          owner_id: ownerId || null,
          preco_por_g_rs: positivo(ingrediente.preco_por_g_rs) || null,
          preco_por_kg_rs: positivo(ingrediente.preco_por_g_rs) ? Number((positivo(ingrediente.preco_por_g_rs) * 1000).toFixed(2)) : null,
          preco_embalagem_rs: positivo(ingrediente.preco_embalagem_rs) || null,
          peso_embalagem_g: positivo(ingrediente.peso_embalagem_g) || null,
          preco_medio_nacional_rs_kg: positivo(ingrediente.preco_medio_nacional) || null,
        }, receita, item, fonte);
      }
    }

    if (!temComposicao) {
      issues++;
      addGrupo(outros, 'outro|receita_sem_composicao_custeavel', {
        tipo_pendencia: 'outro', nome: 'Receita sem composição custeável', motivo: 'receita_sem_composicao_custeavel',
      }, receita, null, null);
    }
    if (issues === 0) receitasSemIssue.add(receita.id);
  }

  const serializar = (map: Map<string, any>) => [...map.values()].map((g: any) => ({
    ...g,
    ocorrencias: g.ocorrencias,
    receitas: g.receita_ids.size,
    receita_ids: [...g.receita_ids],
    source_item_ids: [...g.source_item_ids],
    item_ids: [...g.item_ids],
    sugestoes: g.tipo_pendencia === 'outro' ? [] : sugestoes(g.nome, ingredientes, g.categoria || '', g.ingrediente_origem_id || ''),
  })).sort((a: any, b: any) => b.receitas - a.receitas || b.ocorrencias - a.ocorrencias || txt(a.nome).localeCompare(txt(b.nome)));

  return {
    incompletas,
    grupos: {
      precos: serializar(preco),
      referencias: serializar(referencia),
      outros: serializar(outros),
    },
    receitas_sem_issue_live: [...receitasSemIssue],
  };
}

function encontrarGrupo(fila: any, chave: string) {
  return [...fila.grupos.precos, ...fila.grupos.referencias, ...fila.grupos.outros].find((g: any) => g.grupo_chave === chave) || null;
}

function receitaIdsCatalogoParaIngrediente(ctx: any, ingredienteId: string) {
  const ids = new Set<string>();
  for (const item of ctx.itens) {
    if (txt(item.ingrediente_id) === ingredienteId && txt(item.receita_id)) ids.add(txt(item.receita_id));
  }
  return [...ids];
}

function receitasDependentesDaFonte(ctx: any, sourceItemIds: string[]) {
  const sourceSet = new Set(sourceItemIds);
  const sourceReceitas = new Set<string>();
  for (const id of sourceItemIds) {
    const item = ctx.itemMap.get(id);
    if (item?.receita_id) sourceReceitas.add(txt(item.receita_id));
  }
  const ids = new Set<string>(sourceReceitas);
  for (const item of ctx.itens) {
    if (sourceSet.has(txt(item.subreceita_origem_item_id)) && txt(item.receita_id)) ids.add(txt(item.receita_id));
    const linhagem = txt(item.subreceita_linhagem);
    if (linhagem && [...sourceReceitas].some((rid) => linhagem.split('>').includes(rid)) && txt(item.receita_id)) ids.add(txt(item.receita_id));
  }
  return [...ids];
}

async function simular(ctx: any, fila: any, grupo: any, args: any) {
  if (!grupo) throw new Error('Grupo de curadoria não encontrado ou já resolvido. Atualize a fila.');
  const decisao = txt(args?.decisao);
  const permitidas = new Set(['definir_preco_mestre', 'reapontar_ingrediente', 'reaproveitamento_processo', 'manter_pendente']);
  if (!permitidas.has(decisao)) throw new Error('Decisão inválida.');
  if (grupo.tipo_pendencia === 'outro' && decisao !== 'manter_pendente') throw new Error('Este grupo só pode ser mantido pendente nesta fase.');

  let destino: any = null;
  let precoPorG = 0;
  let impactoCatalogoIds = [...grupo.receita_ids];
  const sourceIds = [...new Set(grupo.source_item_ids || [])];
  const dependentes = receitasDependentesDaFonte(ctx, sourceIds);
  for (const id of dependentes) if (!impactoCatalogoIds.includes(id)) impactoCatalogoIds.push(id);

  if (decisao === 'reapontar_ingrediente') {
    if (grupo.tipo_pendencia !== 'referencia_ingrediente' && grupo.tipo_pendencia !== 'ingrediente_sem_preco') {
      throw new Error('Reapontamento não é permitido para este tipo de pendência.');
    }
    destino = ctx.ingredienteMap.get(txt(args?.ingrediente_destino_id));
    if (!destino) throw new Error('Ingrediente de destino não encontrado.');
    if (!sourceIds.length) throw new Error('Nenhum item fonte editável foi encontrado neste grupo.');
  }

  if (decisao === 'definir_preco_mestre') {
    if (grupo.tipo_pendencia !== 'ingrediente_sem_preco') throw new Error('Preço mestre só pode ser definido para grupo sem preço.');
    const origem = ctx.ingredienteMap.get(txt(grupo.ingrediente_origem_id));
    if (!origem) throw new Error('Ingrediente mestre do grupo não encontrado.');
    const precoKg = positivo(args?.preco_por_kg_rs);
    const precoEmb = positivo(args?.preco_embalagem_rs);
    const pesoEmb = positivo(args?.peso_embalagem_g);
    if ((precoEmb > 0) !== (pesoEmb > 0)) throw new Error('Preço e peso/volume da embalagem devem ser informados juntos.');
    const derivadoEmb = precoEmb > 0 && pesoEmb > 0 ? precoEmb / pesoEmb : 0;
    precoPorG = precoKg > 0 ? precoKg / 1000 : derivadoEmb;
    if (precoPorG <= 0) throw new Error('Informe preço de referência em R$/kg (ou R$/L), ou preço + peso/volume da embalagem.');
    if (precoKg > 0 && derivadoEmb > 0) {
      const diferenca = Math.abs(precoPorG - derivadoEmb) / Math.max(precoPorG, derivadoEmb);
      if (diferenca > 0.02) throw new Error('R$/kg e preço/peso da embalagem divergem mais de 2%. Corrija os valores antes de aplicar.');
    }
    impactoCatalogoIds = receitaIdsCatalogoParaIngrediente(ctx, origem.id);
  }

  if (decisao === 'reaproveitamento_processo') {
    if (grupo.tipo_pendencia !== 'ingrediente_sem_preco') throw new Error('Reaproveitamento de processo só pode ser classificado em grupo de ingrediente sem preço.');
    if (!sourceIds.length) throw new Error('Nenhum item fonte editável foi encontrado neste grupo.');
  }

  const snapshotParts = sourceIds.sort().map((id) => {
    const item = ctx.itemMap.get(id);
    return `${id}@${txt(item?.updated_date)}@${txt(item?.ingrediente_id)}@${txt(item?.custo_comportamento)}`;
  });
  if (grupo.ingrediente_origem_id) {
    const origem = ctx.ingredienteMap.get(txt(grupo.ingrediente_origem_id));
    snapshotParts.push(`origem:${txt(origem?.id)}@${txt(origem?.updated_date)}@${num(origem?.preco_por_g_rs)}`);
  }
  if (destino) snapshotParts.push(`destino:${destino.id}@${txt(destino.updated_date)}`);
  snapshotParts.push(`decisao:${decisao}`);
  snapshotParts.push(`preco:${precoPorG}`);
  const assinatura = await sha256(`${grupo.grupo_chave}|${snapshotParts.join('|')}`);

  return {
    grupo_chave: grupo.grupo_chave,
    tipo_pendencia: grupo.tipo_pendencia,
    nome: grupo.nome,
    decisao,
    ingrediente_origem_id: grupo.ingrediente_origem_id || null,
    ingrediente_destino: destino ? { id: destino.id, nome: destino.nome, categoria: destino.categoria || null, preco_por_g_rs: positivo(destino.preco_por_g_rs) || null } : null,
    preco_por_g_rs: precoPorG > 0 ? Number(precoPorG.toFixed(8)) : null,
    preco_por_kg_rs: precoPorG > 0 ? Number((precoPorG * 1000).toFixed(2)) : null,
    destino_sem_preco: destino ? precoEfetivo(destino, txt(grupo.owner_id), ctx.prefMap, ctx.legacyMap) <= 0 : false,
    impacto_ocorrencias: grupo.ocorrencias,
    impacto_receitas: grupo.receitas,
    impacto_total_catalogo: new Set(impactoCatalogoIds).size,
    receita_ids_recalcular: [...new Set(impactoCatalogoIds)],
    source_item_ids: sourceIds,
    requer_sincronizacao_subreceitas: Boolean(grupo.requer_sincronizacao_subreceitas),
    assinatura,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = { id: 'fase10.2.1-readonly' };
    const args = { acao: 'simular', grupo_chave: 'preco|global|*|6a6cca92349b5ca52f0bcf3f', decisao: 'reapontar_ingrediente', ingrediente_destino_id: '6a55525e9450b98b184e351a' };
    const acao = 'simular';
    const ctx = await carregar(base44);
    const fila = construirGrupos(ctx);

    if (acao === 'listar') {
      return Response.json({
        total_incompletas: fila.incompletas.length,
        total_grupos: fila.grupos.precos.length + fila.grupos.referencias.length + fila.grupos.outros.length,
        grupos_preco: fila.grupos.precos.length,
        grupos_referencia: fila.grupos.referencias.length,
        grupos_outros: fila.grupos.outros.length,
        receitas_prontas_recalculo: fila.receitas_sem_issue_live.length,
        grupos: fila.grupos,
      });
    }

    const grupo = encontrarGrupo(fila, txt(args?.grupo_chave));
    const simulacao = await simular(ctx, fila, grupo, args);
    if (acao === 'simular') return Response.json({ simulacao });
    if (acao !== 'aplicar') return Response.json({ error: 'Ação inválida.' }, { status: 400 });
    return Response.json({ error: 'read_only_validation' }, { status: 405 });
    if (args?.confirmar !== true) return Response.json({ error: 'Aplicação exige confirmar=true após simulação.' }, { status: 400 });
    if (!txt(args?.assinatura) || txt(args.assinatura) !== simulacao.assinatura) {
      return Response.json({ error: 'A fila mudou desde a simulação. Atualize e simule novamente.' }, { status: 409 });
    }

    const agora = new Date().toISOString();
    let atualizados = 0;
    if (simulacao.decisao === 'definir_preco_mestre') {
      const origem = ctx.ingredienteMap.get(txt(simulacao.ingrediente_origem_id));
      const precoEmb = positivo(args?.preco_embalagem_rs);
      const pesoEmb = positivo(args?.peso_embalagem_g);
      const patch: any = {
        id: origem.id,
        preco_por_g_rs: simulacao.preco_por_g_rs,
        preco_atualizado_em: agora,
        fonte_preco: 'Manual',
        preco_estimado: false,
      };
      if (precoEmb > 0 && pesoEmb > 0) {
        patch.preco_embalagem_rs = precoEmb;
        patch.peso_embalagem_g = pesoEmb;
      }
      await ctx.sr.Ingrediente.bulkUpdate([patch]);
      atualizados = 1;
    } else if (simulacao.decisao === 'reapontar_ingrediente') {
      const destino = ctx.ingredienteMap.get(txt(args?.ingrediente_destino_id));
      atualizados = await bulk(ctx.sr.IngredienteReceita, simulacao.source_item_ids.map((id: string) => ({
        id,
        ingrediente_id: destino.id,
        ingrediente_nome: destino.nome,
        modelo_versao: 2,
      })));
    } else if (simulacao.decisao === 'reaproveitamento_processo') {
      atualizados = await bulk(ctx.sr.IngredienteReceita, simulacao.source_item_ids.map((id: string) => ({
        id,
        custo_comportamento: 'reaproveitamento_processo',
        modelo_versao: 2,
      })));
    }

    // Invalida explicitamente os caches afetados. Além de impedir uso de custo
    // antigo se o recálculo seguinte falhar, atualizar Receita muda updated_date
    // e faz a assinatura da Fase 8 detectar alterações nas sub-receitas fonte.
    let cachesInvalidados = 0;
    if (simulacao.decisao !== 'manter_pendente') {
      cachesInvalidados = await bulk(ctx.sr.Receita, (simulacao.receita_ids_recalcular || []).map((id: string) => ({
        id,
        custo_cache_status: 'a_recalcular',
      })));
    }

    const status = simulacao.decisao === 'manter_pendente' ? 'mantida_pendente' : 'aplicada';
    await ctx.sr.CuradoriaCustoPendencia.create({
      grupo_chave: simulacao.grupo_chave,
      tipo_pendencia: simulacao.tipo_pendencia,
      nome_pendencia: simulacao.nome,
      decisao: simulacao.decisao,
      ingrediente_origem_id: simulacao.ingrediente_origem_id || null,
      ingrediente_destino_id: simulacao.ingrediente_destino?.id || null,
      preco_por_g_rs: simulacao.preco_por_g_rs || null,
      preco_embalagem_rs: positivo(args?.preco_embalagem_rs) || null,
      peso_embalagem_g: positivo(args?.peso_embalagem_g) || null,
      impacto_ocorrencias: simulacao.impacto_ocorrencias,
      impacto_receitas: simulacao.impacto_receitas,
      impacto_total_catalogo: simulacao.impacto_total_catalogo,
      assinatura_simulacao: simulacao.assinatura,
      status,
      observacao: txt(args?.observacao) || null,
      executado_por_id: user.id,
      executado_em: agora,
      detalhes: JSON.stringify({
        ingrediente_destino_nome: simulacao.ingrediente_destino?.nome || null,
        requer_sincronizacao_subreceitas: simulacao.requer_sincronizacao_subreceitas,
        receita_ids_recalcular: simulacao.receita_ids_recalcular.slice(0, 100),
        itens_fonte_atualizados: atualizados,
        caches_invalidados: cachesInvalidados,
      }),
    });

    return Response.json({
      aplicado: true,
      status,
      atualizados,
      caches_invalidados: cachesInvalidados,
      ...simulacao,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
