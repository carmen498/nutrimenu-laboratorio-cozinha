import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import {
  construirIndiceNomes,
  construirIndiceSinonimos,
  classificarDivergenciaIngrediente,
  normIngrediente,
} from '../../shared/divergenciaIngrediente.ts';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

// Fase 10.4.1 — saneamento conservador de IngredienteReceita.ingrediente_nome × ingrediente_id.
// Regras automáticas:
// 1) nome/sinônimo exato aponta para o MESMO ID -> normaliza somente o cache de nome;
// 2) nome/sinônimo exato aponta de forma ÚNICA para OUTRO ID -> reaponta ID + nome canônico;
// 3) cache derivado da Fase 8 nunca é editado diretamente; corrige a fonte ou pede ressincronização;
// 4) qualquer conflito/ausência de evidência exata permanece manual. Sem fuzzy matching.

const txt = (v: any) => v == null ? '' : String(v).trim();

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

async function bulk(entity: any, rows: any[]) {
  const unicos = new Map<string, any>();
  for (const row of rows || []) if (row?.id) unicos.set(row.id, row);
  const values = [...unicos.values()];
  for (let i = 0; i < values.length; i += 200) {
    await entity.bulkUpdate(values.slice(i, i + 200));
  }
  return values.length;
}

function prioridade(receitas: number) {
  if (receitas >= 20) return 'alta';
  if (receitas >= 5) return 'media';
  return 'baixa';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const confirmar = body?.confirmar === true;
    if (!dryRun && !confirmar) {
      return Response.json({ error: 'Aplicação exige confirmar=true.' }, { status: 400 });
    }

    const sr = base44.asServiceRole.entities;
    const [receitas, ingredientes, itens, sinonimos] = await Promise.all([
      listarTudo(sr.Receita, 'created_date'),
      listarTudo(sr.Ingrediente, 'nome'),
      listarTudo(sr.IngredienteReceita, 'created_date'),
      listarTudo(sr.SinonimosIngredientes, 'sinonimo'),
    ]);

    const receitaMap = new Map(receitas.map((r: any) => [r.id, r]));
    const ingredienteMap = new Map(ingredientes.map((i: any) => [i.id, i]));
    const itemMap = new Map(itens.map((i: any) => [i.id, i]));
    const nomeIndex = construirIndiceNomes(ingredientes);
    const sinonimoIndex = construirIndiceSinonimos(sinonimos);

    const divergencias: any[] = [];
    const acoesFonte = new Map<string, any>();
    const derivadosSync = new Map<string, any>();
    const manuais = new Map<string, any>();
    const receitaIdsDiretos = new Set<string>();

    for (const item of itens) {
      if (!item || item.tipo !== 'ingrediente') continue;
      const mestre = ingredienteMap.get(txt(item.ingrediente_id));
      if (!mestre) continue; // ingrediente_nao_encontrado pertence a outra causa-raiz.
      if (!txt(item.ingrediente_nome) || normIngrediente(item.ingrediente_nome) === normIngrediente(mestre.nome)) continue;

      const fonte = itemFonteEditavel(item, itemMap);
      const derivado = !!item.subreceita_parent_id;
      let classificacao: any = null;
      let fonteUsada = fonte;

      if (!fonte) {
        classificacao = { divergente: true, acao: 'manual', motivo: 'fonte_derivada_nao_rastreavel' };
      } else {
        const mestreFonte = ingredienteMap.get(txt(fonte.ingrediente_id));
        if (!mestreFonte) {
          classificacao = { divergente: true, acao: 'manual', motivo: 'ingrediente_fonte_nao_encontrado' };
        } else {
          classificacao = classificarDivergenciaIngrediente({
            item: fonte,
            ingredienteAtual: mestreFonte,
            ingredienteMap,
            nomeIndex,
            sinonimoIndex,
          });

          // Filho divergente com fonte já canônica = cache da Fase 8 ficou velho.
          if (derivado && !classificacao.divergente) {
            classificacao = {
              divergente: true,
              acao: 'sincronizar_subreceita',
              motivo: 'filho_derivado_diverge_de_fonte_canonica',
              id_atual: txt(item.ingrediente_id),
            };
            fonteUsada = null;
          }
        }
      }

      const row = {
        item_id: item.id,
        receita_id: item.receita_id,
        receita_nome: receitaMap.get(item.receita_id)?.nome || '',
        derivado,
        fonte_item_id: fonte?.id || null,
        fonte_receita_id: fonte?.receita_id || null,
        nome_cache: item.ingrediente_nome,
        ingrediente_id_atual: item.ingrediente_id,
        ingrediente_nome_atual: mestre.nome,
        ...classificacao,
      };
      divergencias.push(row);

      if (classificacao.acao === 'normalizar_nome_cache' || classificacao.acao === 'reapontar_id_exato') {
        if (!fonteUsada?.id) continue;
        const key = fonteUsada.id;
        const existente = acoesFonte.get(key);
        const destinoId = classificacao.destino_id;
        const destino = ingredienteMap.get(destinoId);
        if (existente && (existente.acao !== classificacao.acao || existente.destino_id !== destinoId)) {
          manuais.set(`fonte-conflito|${key}`, {
            chave: `fonte-conflito|${key}`,
            motivo: 'mesma_fonte_com_evidencias_conflitantes',
            nome: fonteUsada.ingrediente_nome || mestre.nome,
            ocorrencias: 1,
            receita_ids: new Set([fonteUsada.receita_id].filter(Boolean)),
          });
          acoesFonte.delete(key);
          continue;
        }
        if (!existente) {
          acoesFonte.set(key, {
            source_item_id: fonteUsada.id,
            source_receita_id: fonteUsada.receita_id,
            acao: classificacao.acao,
            motivo: classificacao.motivo,
            id_atual: fonteUsada.ingrediente_id,
            nome_cache_atual: fonteUsada.ingrediente_nome,
            destino_id: destinoId,
            destino_nome: destino?.nome || classificacao.destino_nome || '',
            ocorrencias: 0,
            derivado_em_alguma_ocorrencia: false,
            receita_ids_ocorrencia: new Set<string>(),
          });
        }
        const acao = acoesFonte.get(key);
        acao.ocorrencias++;
        if (derivado) acao.derivado_em_alguma_ocorrencia = true;
        if (item.receita_id) acao.receita_ids_ocorrencia.add(item.receita_id);
        if (fonteUsada.receita_id) receitaIdsDiretos.add(fonteUsada.receita_id);
      } else if (classificacao.acao === 'sincronizar_subreceita') {
        const key = txt(item.subreceita_parent_id) || item.id;
        if (!derivadosSync.has(key)) derivadosSync.set(key, {
          marker_id: txt(item.subreceita_parent_id) || null,
          receita_id: item.receita_id,
          ocorrencias: 0,
          exemplos: [],
        });
        const d = derivadosSync.get(key);
        d.ocorrencias++;
        if (d.exemplos.length < 4) d.exemplos.push({ item_id: item.id, nome_cache: item.ingrediente_nome, nome_mestre: mestre.nome });
        if (item.receita_id) receitaIdsDiretos.add(item.receita_id);
      } else {
        const key = `${normIngrediente(item.ingrediente_nome)}|${txt(item.ingrediente_id)}|${classificacao.motivo}`;
        if (!manuais.has(key)) manuais.set(key, {
          chave: key,
          motivo: classificacao.motivo,
          nome: item.ingrediente_nome || mestre.nome,
          ingrediente_id_atual: item.ingrediente_id,
          ingrediente_nome_atual: mestre.nome,
          ocorrencias: 0,
          receita_ids: new Set<string>(),
          exemplos: [],
          candidatos: classificacao.candidatos || [],
        });
        const g = manuais.get(key);
        g.ocorrencias++;
        if (item.receita_id) g.receita_ids.add(item.receita_id);
        if (g.exemplos.length < 5 && receitaMap.get(item.receita_id)?.nome) g.exemplos.push(receitaMap.get(item.receita_id).nome);
      }
    }

    const acoes = [...acoesFonte.values()].map((a: any) => ({
      ...a,
      receita_ids_ocorrencia: [...a.receita_ids_ocorrencia],
    }));
    const manuaisSerializados = [...manuais.values()].map((g: any) => ({
      ...g,
      receita_ids: [...g.receita_ids],
      receitas: g.receita_ids.size,
      prioridade: prioridade(g.receita_ids.size),
    })).sort((a: any, b: any) => b.ocorrencias - a.ocorrencias);

    let fontesAtualizadas = 0;
    let invalidacao: any = null;
    if (!dryRun) {
      const patches = acoes.map((acao: any) => ({
        id: acao.source_item_id,
        ingrediente_id: acao.destino_id,
        ingrediente_nome: acao.destino_nome,
        modelo_versao: 2,
      }));
      fontesAtualizadas = await bulk(sr.IngredienteReceita, patches);

      const receitasRaiz = [...receitaIdsDiretos];
      if (receitasRaiz.length > 0) {
        invalidacao = await invalidarCustosPorDependencias({
          entities: sr,
          receitaIds: receitasRaiz,
          motivo: 'saneamento_divergencia_ingrediente_nome_id_10_4_1',
          origem: 'sanear_divergencias_ingrediente_nome_id',
        });
      }

      await sr.SaneamentoDivergenciaIngredienteLog.create({
        executado_por_id: user.id,
        executado_em: new Date().toISOString(),
        modo: 'aplicar',
        divergencias_detectadas: divergencias.length,
        fontes_unicas: acoes.length,
        nomes_cache_normalizados: acoes.filter((a: any) => a.acao === 'normalizar_nome_cache').length,
        ids_reapontados: acoes.filter((a: any) => a.acao === 'reapontar_id_exato').length,
        derivados_para_sincronizar: derivadosSync.size,
        manuais: manuaisSerializados.reduce((s: number, g: any) => s + g.ocorrencias, 0),
        receitas_afetadas: new Set([...receitaIdsDiretos, ...(invalidacao?.receita_ids || [])]).size,
        detalhes: JSON.stringify({
          fontes_atualizadas: fontesAtualizadas,
          receitas_invalidas: invalidacao?.receitas_invalidadas || 0,
          propagadas: invalidacao?.propagadas || 0,
          manuais_grupos: manuaisSerializados.slice(0, 40).map((g: any) => ({ nome: g.nome, motivo: g.motivo, ocorrencias: g.ocorrencias, receitas: g.receitas })),
        }),
      });
    }

    const receitasAfetadas = new Set<string>([...receitaIdsDiretos, ...(invalidacao?.receita_ids || [])]);
    return Response.json({
      dry_run: dryRun,
      regra: 'somente_nome_canonico_ou_sinonimo_exato_unico; sem_fuzzy',
      divergencias_detectadas: divergencias.length,
      fontes_unicas_deterministicas: acoes.length,
      nomes_cache_normalizaveis: acoes.filter((a: any) => a.acao === 'normalizar_nome_cache').length,
      ids_reapontaveis_exatos: acoes.filter((a: any) => a.acao === 'reapontar_id_exato').length,
      derivados_para_sincronizar: derivadosSync.size,
      manuais_ocorrencias: manuaisSerializados.reduce((s: number, g: any) => s + g.ocorrencias, 0),
      manuais_grupos: manuaisSerializados.length,
      fontes_atualizadas: fontesAtualizadas,
      receitas_afetadas: receitasAfetadas.size || receitaIdsDiretos.size,
      receitas_invalidadas: invalidacao?.receitas_invalidadas || 0,
      requer_sincronizacao_subreceitas: derivadosSync.size > 0 || acoes.some((a: any) => a.derivado_em_alguma_ocorrencia),
      receita_ids_recalcular: invalidacao?.receita_ids || [...receitaIdsDiretos],
      amostra_deterministica: acoes.slice(0, 120),
      amostra_derivados: [...derivadosSync.values()].slice(0, 80),
      grupos_manuais: manuaisSerializados.slice(0, 120),
      amostra_divergencias: divergencias.slice(0, 120),
    });
  } catch (error: any) {
    console.error('sanearDivergenciasIngredienteNomeId', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
