import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import {
  construirIndiceNomes,
  construirIndiceSinonimos,
  construirIndiceAliasesSeguros,
  classificarDivergenciaIngrediente,
  normIngrediente,
} from '../../shared/divergenciaIngrediente.ts';
import {
  sugestoesDivergencia,
  validarDecisaoDivergencia,
} from '../../shared/curadoriaDivergenciaIngrediente.ts';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

// Fase 10.4.2 — curadoria humana das divergências ID × nome não resolvidas
// deterministicamente na Fase 10.4.1. Sugestões nunca são autoaplicadas.
// SIMULAR congela o estado por SHA-256; APLICAR revalida o mesmo snapshot.

const txt = (v: any) => v == null ? '' : String(v).trim();
const dataRow = (r: any) => txt(r?.updated_date) || txt(r?.updated_at) || txt(r?.created_date);

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

function prioridade(receitas: number) {
  if (receitas >= 20) return 'alta';
  if (receitas >= 5) return 'media';
  return 'baixa';
}

function grupoChave(fonte: any, motivo: string) {
  return `idnome|${normIngrediente(fonte?.ingrediente_nome) || 'SEM_NOME'}|${txt(fonte?.ingrediente_id) || 'SEM_ID'}|${motivo}`;
}

function addGrupo(map: Map<string, any>, key: string, base: any, item: any, fonte: any, receitaMap: Map<string, any>) {
  if (!map.has(key)) {
    map.set(key, {
      ...base,
      grupo_chave: key,
      ocorrencias: 0,
      source_item_ids: new Set<string>(),
      occurrence_item_ids: new Set<string>(),
      receita_ids: new Set<string>(),
      source_receita_ids: new Set<string>(),
      exemplos: [],
      source_links: new Map<string, any>(),
      requer_sincronizacao_subreceitas: false,
    });
  }
  const g = map.get(key)!;
  g.ocorrencias++;
  if (item?.id) g.occurrence_item_ids.add(item.id);
  if (item?.receita_id) g.receita_ids.add(item.receita_id);
  if (fonte?.id) g.source_item_ids.add(fonte.id);
  if (fonte?.receita_id) g.source_receita_ids.add(fonte.receita_id);
  if (item?.subreceita_parent_id) g.requer_sincronizacao_subreceitas = true;
  const nomeReceita = receitaMap.get(item?.receita_id)?.nome;
  if (nomeReceita && g.exemplos.length < 8 && !g.exemplos.includes(nomeReceita)) g.exemplos.push(nomeReceita);
  if (fonte?.id) {
    if (!g.source_links.has(fonte.id)) g.source_links.set(fonte.id, {
      source_item_id: fonte.id,
      source_receita_id: fonte.receita_id || null,
      occurrence_item_ids: new Set<string>(),
      receita_ids: new Set<string>(),
      derivado: false,
    });
    const link = g.source_links.get(fonte.id);
    if (item?.id) link.occurrence_item_ids.add(item.id);
    if (item?.receita_id) link.receita_ids.add(item.receita_id);
    if (item?.subreceita_parent_id) link.derivado = true;
  }
}

function serializarGrupo(g: any, ingredientes: any[], estado: any = null) {
  const sourceLinks = [...g.source_links.values()].map((l: any) => ({
    ...l,
    occurrence_item_ids: [...l.occurrence_item_ids],
    receita_ids: [...l.receita_ids],
  }));
  const receitas = g.receita_ids.size;
  return {
    ...g,
    source_item_ids: [...g.source_item_ids],
    occurrence_item_ids: [...g.occurrence_item_ids],
    receita_ids: [...g.receita_ids],
    source_receita_ids: [...g.source_receita_ids],
    source_links: sourceLinks,
    receitas,
    prioridade: estado?.prioridade || prioridade(receitas),
    workflow_status: estado?.workflow_status || 'nao_analisado',
    workflow_observacao: estado?.observacao || null,
    workflow_decisao: estado?.decisao || null,
    workflow_destino_id: estado?.ingrediente_destino_id || null,
    sugestoes: sugestoesDivergencia(
      g.nome_cache,
      ingredientes,
      g.categoria || '',
      g.ingrediente_origem_id || '',
      g.candidatos_exatos || [],
    ),
  };
}

async function carregar(base44: any) {
  const sr = base44.asServiceRole.entities;
  const [receitas, ingredientes, itens, sinonimos, estados] = await Promise.all([
    listarTudo(sr.Receita, 'created_date'),
    listarTudo(sr.Ingrediente, 'nome'),
    listarTudo(sr.IngredienteReceita, 'created_date'),
    listarTudo(sr.SinonimosIngredientes, 'sinonimo'),
    listarTudo(sr.CuradoriaDivergenciaIngrediente, '-updated_date'),
  ]);
  const receitaMap = new Map(receitas.map((r: any) => [r.id, r]));
  const ingredienteMap = new Map(ingredientes.map((i: any) => [i.id, i]));
  const itemMap = new Map(itens.map((i: any) => [i.id, i]));
  const estadoMap = new Map<string, any>();
  for (const e of estados) if (txt(e.grupo_chave) && !estadoMap.has(e.grupo_chave)) estadoMap.set(e.grupo_chave, e);
  const nomeIndex = construirIndiceNomes(ingredientes);
  const sinonimoIndex = construirIndiceSinonimos(sinonimos);
  const aliasSeguroIndex = construirIndiceAliasesSeguros(nomeIndex);
  const grupos = new Map<string, any>();

  for (const item of itens) {
    if (!item || item.tipo !== 'ingrediente') continue;
    const mestreOcorrencia = ingredienteMap.get(txt(item.ingrediente_id));
    if (!mestreOcorrencia || !txt(item.ingrediente_nome)) continue;
    if (normIngrediente(item.ingrediente_nome) === normIngrediente(mestreOcorrencia.nome)) continue;
    const fonte = itemFonteEditavel(item, itemMap);
    if (!fonte) continue;
    const mestreFonte = ingredienteMap.get(txt(fonte.ingrediente_id));
    if (!mestreFonte) continue;
    const classificacao = classificarDivergenciaIngrediente({
      item: fonte,
      ingredienteAtual: mestreFonte,
      ingredienteMap,
      nomeIndex,
      sinonimoIndex,
      aliasSeguroIndex,
    });
    if (!classificacao.divergente || classificacao.acao !== 'manual') continue;

    const key = grupoChave(fonte, classificacao.motivo);
    addGrupo(grupos, key, {
      nome_cache: fonte.ingrediente_nome || item.ingrediente_nome || mestreFonte.nome,
      ingrediente_origem_id: fonte.ingrediente_id,
      ingrediente_origem_nome: mestreFonte.nome,
      categoria: mestreFonte.categoria || null,
      tipo_conflito: classificacao.motivo,
      candidatos_exatos: classificacao.candidatos || [],
    }, item, fonte, receitaMap);
  }

  const gruposSerializados = [...grupos.values()]
    .map((g: any) => serializarGrupo(g, ingredientes, estadoMap.get(g.grupo_chave)))
    .sort((a: any, b: any) => b.ocorrencias - a.ocorrencias || String(a.nome_cache).localeCompare(String(b.nome_cache), 'pt-BR'));
  return { sr, receitas, ingredientes, itens, estados, receitaMap, ingredienteMap, itemMap, estadoMap, grupos, gruposSerializados };
}

async function sha256(valor: string) {
  const bytes = new TextEncoder().encode(valor);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sincronizarFila(ctx: any, user: any) {
  const { sr, gruposSerializados, estadoMap } = ctx;
  const vivos = new Set(gruposSerializados.map((g: any) => g.grupo_chave));
  let criados = 0;
  let atualizados = 0;
  let resolvidos = 0;
  for (const g of gruposSerializados) {
    const estado = estadoMap.get(g.grupo_chave);
    const detalhe = JSON.stringify({ exemplos: g.exemplos, candidatos_exatos: g.candidatos_exatos, source_item_ids: g.source_item_ids });
    if (!estado) {
      await sr.CuradoriaDivergenciaIngrediente.create({
        grupo_chave: g.grupo_chave,
        nome_cache: g.nome_cache,
        ingrediente_origem_id: g.ingrediente_origem_id,
        ingrediente_origem_nome: g.ingrediente_origem_nome,
        tipo_conflito: g.tipo_conflito,
        workflow_status: 'nao_analisado',
        prioridade: prioridade(g.receitas),
        ocorrencias: g.ocorrencias,
        receitas: g.receitas,
        executado_por_id: user.id,
        executado_em: new Date().toISOString(),
        detalhes: detalhe,
      });
      criados++;
    } else {
      const status = estado.workflow_status === 'resolvido' ? 'nao_analisado' : (estado.workflow_status || 'nao_analisado');
      await sr.CuradoriaDivergenciaIngrediente.update(estado.id, {
        nome_cache: g.nome_cache,
        ingrediente_origem_id: g.ingrediente_origem_id,
        ingrediente_origem_nome: g.ingrediente_origem_nome,
        tipo_conflito: g.tipo_conflito,
        workflow_status: status,
        prioridade: estado.prioridade || prioridade(g.receitas),
        ocorrencias: g.ocorrencias,
        receitas: g.receitas,
        detalhes: detalhe,
      });
      atualizados++;
    }
  }
  for (const estado of ctx.estados || []) {
    if (!txt(estado.grupo_chave) || vivos.has(estado.grupo_chave) || estado.workflow_status === 'resolvido') continue;
    await sr.CuradoriaDivergenciaIngrediente.update(estado.id, {
      workflow_status: 'resolvido',
      decisao: estado.decisao || 'resolvido_fora_da_curadoria',
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
    });
    resolvidos++;
  }
  return { grupos_vivos: gruposSerializados.length, criados, atualizados, resolvidos };
}

async function atualizarWorkflow(ctx: any, user: any, body: any) {
  const permitido = new Set(['nao_analisado', 'em_analise', 'decisao_pendente', 'mantido_pendente']);
  if (!permitido.has(body?.workflow_status)) throw new Error('Status de workflow inválido.');
  const grupo = ctx.gruposSerializados.find((g: any) => g.grupo_chave === body?.grupo_chave);
  if (!grupo) throw new Error('Grupo não está mais presente na fila viva.');
  let estado = ctx.estadoMap.get(grupo.grupo_chave);
  if (!estado) {
    estado = await ctx.sr.CuradoriaDivergenciaIngrediente.create({
      grupo_chave: grupo.grupo_chave,
      nome_cache: grupo.nome_cache,
      ingrediente_origem_id: grupo.ingrediente_origem_id,
      ingrediente_origem_nome: grupo.ingrediente_origem_nome,
      tipo_conflito: grupo.tipo_conflito,
      workflow_status: body.workflow_status,
      prioridade: prioridade(grupo.receitas),
      ocorrencias: grupo.ocorrencias,
      receitas: grupo.receitas,
      observacao: txt(body?.observacao) || null,
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
    });
  } else {
    await ctx.sr.CuradoriaDivergenciaIngrediente.update(estado.id, {
      workflow_status: body.workflow_status,
      observacao: txt(body?.observacao) || estado.observacao || null,
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
    });
  }
  return { grupo_chave: grupo.grupo_chave, workflow_status: body.workflow_status };
}

async function simularGrupo(ctx: any, body: any) {
  const grupo = ctx.gruposSerializados.find((g: any) => g.grupo_chave === body?.grupo_chave);
  if (!grupo) throw new Error('Grupo não está mais presente na fila viva. Atualize a lista.');
  const erro = validarDecisaoDivergencia({
    decisao: body?.decisao,
    ingredienteDestinoId: body?.ingrediente_destino_id,
    ingredienteOrigemId: grupo.ingrediente_origem_id,
    observacao: body?.observacao,
  });
  if (erro) throw new Error(erro);

  const todosSourceIds = new Set(grupo.source_item_ids || []);
  const solicitados = Array.isArray(body?.source_item_ids) && body.source_item_ids.length
    ? [...new Set(body.source_item_ids.map(txt).filter(Boolean))]
    : [...todosSourceIds];
  if (!solicitados.length || solicitados.some((id: string) => !todosSourceIds.has(id))) {
    throw new Error('Escopo de fontes inválido para este grupo.');
  }

  const origem = ctx.ingredienteMap.get(grupo.ingrediente_origem_id);
  if (!origem) throw new Error('Ingrediente mestre de origem não encontrado.');
  const destino = body.decisao === 'reapontar_ingrediente'
    ? ctx.ingredienteMap.get(txt(body.ingrediente_destino_id))
    : (body.decisao === 'confirmar_id_atual' ? origem : null);
  if (body.decisao !== 'manter_pendente' && !destino) throw new Error('Ingrediente mestre de destino não encontrado.');

  const sourceRows = solicitados.map((id: string) => ctx.itemMap.get(id)).filter(Boolean);
  if (sourceRows.length !== solicitados.length) throw new Error('Uma ou mais fontes mudaram ou foram removidas. Atualize a fila.');
  const links = (grupo.source_links || []).filter((l: any) => solicitados.includes(l.source_item_id));
  const receitaIds = new Set<string>();
  const occurrenceIds = new Set<string>();
  let requerSync = false;
  for (const row of sourceRows) if (row.receita_id) receitaIds.add(row.receita_id);
  for (const link of links) {
    for (const id of link.receita_ids || []) receitaIds.add(id);
    for (const id of link.occurrence_item_ids || []) occurrenceIds.add(id);
    if (link.derivado) requerSync = true;
  }

  const snapshot = {
    grupo_chave: grupo.grupo_chave,
    decisao: body.decisao,
    observacao: txt(body.observacao),
    origem: { id: origem.id, nome: origem.nome, updated: dataRow(origem) },
    destino: destino ? { id: destino.id, nome: destino.nome, updated: dataRow(destino) } : null,
    fontes: sourceRows
      .map((r: any) => ({ id: r.id, updated: dataRow(r), receita_id: r.receita_id, ingrediente_id: r.ingrediente_id, ingrediente_nome: r.ingrediente_nome }))
      .sort((a: any, b: any) => a.id.localeCompare(b.id)),
  };
  const assinatura = await sha256(JSON.stringify(snapshot));
  return {
    grupo_chave: grupo.grupo_chave,
    nome_cache: grupo.nome_cache,
    tipo_conflito: grupo.tipo_conflito,
    decisao: body.decisao,
    ingrediente_origem: { id: origem.id, nome: origem.nome },
    ingrediente_destino: destino ? { id: destino.id, nome: destino.nome } : null,
    impacto_fontes: sourceRows.length,
    impacto_ocorrencias: occurrenceIds.size || sourceRows.length,
    impacto_receitas: receitaIds.size,
    source_item_ids: solicitados,
    receita_ids: [...receitaIds],
    requer_sincronizacao_subreceitas: requerSync,
    escopo_total_grupo: solicitados.length === todosSourceIds.size,
    assinatura,
    snapshot,
  };
}

async function upsertEstadoPosDecisao(ctx: any, user: any, grupo: any, simulacao: any, body: any, status: string) {
  const atual = ctx.estadoMap.get(grupo.grupo_chave);
  const payload = {
    nome_cache: grupo.nome_cache,
    ingrediente_origem_id: grupo.ingrediente_origem_id,
    ingrediente_origem_nome: grupo.ingrediente_origem_nome,
    tipo_conflito: grupo.tipo_conflito,
    workflow_status: status,
    prioridade: grupo.prioridade || prioridade(grupo.receitas),
    ocorrencias: grupo.ocorrencias,
    receitas: grupo.receitas,
    decisao: body.decisao,
    ingrediente_destino_id: simulacao.ingrediente_destino?.id || null,
    ingrediente_destino_nome: simulacao.ingrediente_destino?.nome || null,
    assinatura: simulacao.assinatura,
    observacao: txt(body.observacao) || null,
    executado_por_id: user.id,
    executado_em: new Date().toISOString(),
    detalhes: JSON.stringify({ source_item_ids: simulacao.source_item_ids, receita_ids: simulacao.receita_ids }),
  };
  if (atual) await ctx.sr.CuradoriaDivergenciaIngrediente.update(atual.id, payload);
  else await ctx.sr.CuradoriaDivergenciaIngrediente.create({ grupo_chave: grupo.grupo_chave, ...payload });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}));
    const acao = txt(body?.acao) || 'listar';
    const ctx = await carregar(base44);

    if (acao === 'sincronizar_fila') {
      const sincronizacao = await sincronizarFila(ctx, user);
      return Response.json({ sincronizacao });
    }
    if (acao === 'atualizar_workflow') {
      return Response.json(await atualizarWorkflow(ctx, user, body));
    }
    if (acao === 'listar') {
      const workflow: any = { nao_analisado: 0, em_analise: 0, decisao_pendente: 0, mantido_pendente: 0 };
      for (const g of ctx.gruposSerializados) workflow[g.workflow_status] = (workflow[g.workflow_status] || 0) + 1;
      const historico = (await listarTudo(ctx.sr.CuradoriaDivergenciaIngredienteLog, '-executado_em')).slice(0, 30);
      return Response.json({
        ocorrencias_residuais: ctx.gruposSerializados.reduce((s: number, g: any) => s + g.ocorrencias, 0),
        total_grupos: ctx.gruposSerializados.length,
        prioridades: {
          alta: ctx.gruposSerializados.filter((g: any) => g.prioridade === 'alta').length,
          media: ctx.gruposSerializados.filter((g: any) => g.prioridade === 'media').length,
          baixa: ctx.gruposSerializados.filter((g: any) => g.prioridade === 'baixa').length,
        },
        workflow,
        grupos: ctx.gruposSerializados,
        historico,
      });
    }
    if (acao === 'simular') {
      return Response.json({ simulacao: await simularGrupo(ctx, body) });
    }
    if (acao !== 'aplicar') return Response.json({ error: 'Ação inválida.' }, { status: 400 });
    if (body?.confirmar !== true || !txt(body?.assinatura)) {
      return Response.json({ error: 'Aplicação exige confirmar=true e assinatura da simulação.' }, { status: 400 });
    }

    const simulacao = await simularGrupo(ctx, body);
    if (simulacao.assinatura !== body.assinatura) {
      return Response.json({ error: 'O grupo mudou desde a simulação. Atualize, simule novamente e confirme.' }, { status: 409 });
    }
    const grupo = ctx.gruposSerializados.find((g: any) => g.grupo_chave === body.grupo_chave);
    if (!grupo) return Response.json({ error: 'Grupo não encontrado.' }, { status: 404 });

    if (body.decisao === 'manter_pendente') {
      await upsertEstadoPosDecisao(ctx, user, grupo, simulacao, body, 'mantido_pendente');
      await ctx.sr.CuradoriaDivergenciaIngredienteLog.create({
        grupo_chave: grupo.grupo_chave,
        nome_cache: grupo.nome_cache,
        ingrediente_origem_id: grupo.ingrediente_origem_id,
        ingrediente_origem_nome: grupo.ingrediente_origem_nome,
        tipo_conflito: grupo.tipo_conflito,
        decisao: body.decisao,
        impacto_ocorrencias: simulacao.impacto_ocorrencias,
        impacto_fontes: simulacao.impacto_fontes,
        impacto_receitas: simulacao.impacto_receitas,
        assinatura: simulacao.assinatura,
        status: 'mantida_pendente',
        observacao: txt(body.observacao) || null,
        executado_por_id: user.id,
        executado_em: new Date().toISOString(),
        detalhes: JSON.stringify({ source_item_ids: simulacao.source_item_ids, receita_ids: simulacao.receita_ids }),
      });
      return Response.json({ status: 'mantida_pendente', grupo_chave: grupo.grupo_chave });
    }

    const destino = simulacao.ingrediente_destino;
    const patches = simulacao.source_item_ids.map((id: string) => ({
      id,
      ingrediente_id: destino.id,
      ingrediente_nome: destino.nome,
      modelo_versao: 2,
    }));
    for (let i = 0; i < patches.length; i += 200) await ctx.sr.IngredienteReceita.bulkUpdate(patches.slice(i, i + 200));
    const invalidacao = await invalidarCustosPorDependencias({
      entities: ctx.sr,
      receitaIds: simulacao.receita_ids,
      motivo: 'curadoria_divergencia_ingrediente_10_4_2',
      origem: 'curadoria_divergencias_ingrediente',
    });
    const statusFila = simulacao.escopo_total_grupo ? 'resolvido' : 'decisao_pendente';
    await upsertEstadoPosDecisao(ctx, user, grupo, simulacao, body, statusFila);
    await ctx.sr.CuradoriaDivergenciaIngredienteLog.create({
      grupo_chave: grupo.grupo_chave,
      nome_cache: grupo.nome_cache,
      ingrediente_origem_id: grupo.ingrediente_origem_id,
      ingrediente_origem_nome: grupo.ingrediente_origem_nome,
      tipo_conflito: grupo.tipo_conflito,
      decisao: body.decisao,
      ingrediente_destino_id: destino.id,
      ingrediente_destino_nome: destino.nome,
      impacto_ocorrencias: simulacao.impacto_ocorrencias,
      impacto_fontes: simulacao.impacto_fontes,
      impacto_receitas: simulacao.impacto_receitas,
      assinatura: simulacao.assinatura,
      status: 'aplicada',
      observacao: txt(body.observacao) || null,
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
      detalhes: JSON.stringify({ source_item_ids: simulacao.source_item_ids, receita_ids: simulacao.receita_ids, invalidacao }),
    });
    return Response.json({
      status: 'aplicada',
      grupo_chave: grupo.grupo_chave,
      fontes_atualizadas: patches.length,
      receita_ids_recalcular: invalidacao?.receita_ids || simulacao.receita_ids,
      receitas_invalidadas: invalidacao?.receitas_invalidadas || 0,
      requer_sincronizacao_subreceitas: simulacao.requer_sincronizacao_subreceitas,
    });
  } catch (error: any) {
    console.error('curadoriaDivergenciasIngrediente', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
