import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Fase 10.1 — saneamento/migração segura do cache de custos.
// dry_run=true calcula e diagnostica sem gravar Receita nem criar log.
// dry_run=false aplica SOMENTE caches completos; incompletos recebem apenas diagnóstico.
const VERSAO = 2;
const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const txt = (v: any) => v == null ? '' : String(v).trim();
const normNome = (v: any) => txt(v)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');
const positivo = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

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

function precoEfetivo({ ingrediente, ownerId, prefMap, legacyMap }: any) {
  let preco = num(ingrediente?.preco_por_g_rs);
  if (!ownerId || !ingrediente?.id) return preco;
  const key = `${ownerId}|${ingrediente.id}`;

  // Legado e IngredienteUsuario só substituem o preço mestre quando há preço positivo.
  // Preço pessoal ausente/0 não pode zerar silenciosamente o preço global.
  const legacy = legacyMap.get(key);
  const precoLegacy = num(legacy?.preco_por_g_rs);
  if (precoLegacy > 0) preco = precoLegacy;

  const pref = prefMap.get(key);
  const precoPessoal = num(pref?.preco_por_g_rs);
  if (precoPessoal > 0) preco = precoPessoal;

  return preco;
}

function fcEfetivo(item: any, ingrediente: any) {
  const override = num(item?.fator_correcao_override);
  if (override > 0) return override;
  const mestre = num(ingrediente?.fator_correcao);
  return mestre > 0 ? mestre : 1;
}

// Réplica server-side da regra de Fases 5/8 usada por resolverRendimentoReceita.
function calcularPesoPrePreparo(receita: any, itens: any[]) {
  const porcoesBase = positivo(receita?.porcoes_base) || 1;
  const parentsComFilhos = new Set<string>();
  const parentsComCacheNovo = new Set<string>();

  for (const item of itens || []) {
    const parentId = txt(item?.subreceita_parent_id);
    if (!parentId) continue;
    parentsComFilhos.add(parentId);
    if (item.subreceita_cache === true && num(item.subreceita_cache_versao) >= 2) {
      parentsComCacheNovo.add(parentId);
    }
  }

  return (itens || []).reduce((sum, item) => {
    if (!item || item.tipo === 'grupo') return sum;
    const parentId = txt(item.subreceita_parent_id);

    if (parentId) {
      if (parentsComCacheNovo.has(parentId)) return sum;
      return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
    }

    if (item.tipo === 'subreceita') {
      if (parentsComCacheNovo.has(item.id)) {
        return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
      }
      if (parentsComFilhos.has(item.id)) return sum;
    }

    return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
  }, 0);
}

function rendimentoEfetivo(receita: any, itens: any[]) {
  const pre = calcularPesoPrePreparo(receita, itens);
  return positivo(receita?.peso_pos_preparo_total)
    || positivo(receita?.rendimento_total)
    || pre;
}

function lerArgs(req: Request) {
  if (req.method === 'GET') return Promise.resolve({});
  return req.json().catch(() => ({}));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const args = await lerArgs(req);
    const dryRun = args?.dry_run === true;
    const somenteLegado = args?.somente_legado === true;
    const somenteIncompletas = args?.somente_incompletas === true;
    const receitaIds = Array.isArray(args?.receita_ids)
      ? new Set(args.receita_ids.map((id: any) => txt(id)).filter(Boolean))
      : null;

    const sr = base44.asServiceRole.entities;
    const [todasReceitas, ingredientes, itens, insumos, esquecidos, preferencias, precosLegados] = await Promise.all([
      listarTudo(sr.Receita, 'created_date'),
      listarTudo(sr.Ingrediente, 'nome'),
      listarTudo(sr.IngredienteReceita, 'created_date'),
      listarTudo(sr.InsumoReceita, 'created_date'),
      listarTudo(sr.IngredienteEsquecidoReceita, 'created_date'),
      listarTudo(sr.IngredienteUsuario, '-updated_date'),
      listarTudo(sr.PrecoIngredienteCliente, '-updated_date'),
    ]);

    const receitas = todasReceitas.filter((r: any) => {
      if (receitaIds && !receitaIds.has(txt(r.id))) return false;
      if (somenteLegado && num(r.custo_modelo_versao) >= VERSAO) return false;
      if (somenteIncompletas && r?.custo_cache_status !== 'incompleto') return false;
      return true;
    });

    const ingredienteMap = new Map(ingredientes.map((i: any) => [i.id, i]));
    const itensPorReceita = agruparPorReceita(itens);
    const insumosPorReceita = agruparPorReceita(insumos);
    const esquecidosPorReceita = agruparPorReceita(esquecidos);

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

    const atualizacoes: any[] = [];
    const revisar: any[] = [];
    const migraveis: any[] = [];
    let jaAtuais = 0;
    let incompletas = 0;
    let totalSemPreco = 0;
    let totalRefAusente = 0;
    let totalEsquecidosLegado = 0;

    const agora = new Date().toISOString();

    for (const receita of receitas) {
      const receitaId = receita.id;
      const ownerId = receita.is_base === false ? (txt(receita.usuario_dono_id) || txt(receita.created_by_id)) : '';
      const componentes = itensPorReceita.get(receitaId) || [];
      const insumosDaReceita = insumosPorReceita.get(receitaId) || [];
      const esquecidosDaReceita = esquecidosPorReceita.get(receitaId) || [];
      const porcoesBase = positivo(receita.porcoes_base) || 1;
      let custoIngredientes = 0;
      let custoInsumos = 0;
      let custoEsquecidos = 0;
      let semPreco = 0;
      let refAusente = 0;
      let fallbackEsquecido = 0;
      let itensComQuantidadePositiva = 0;
      const problemas: any[] = [];

      // Uma sub-receita só é custeável com segurança quando existe cache/filhos derivados.
      // O marcador isolado não carrega custo atômico e não pode ser interpretado como custo zero.
      const parentsComFilhos = new Set(
        componentes.map((item: any) => txt(item?.subreceita_parent_id)).filter(Boolean),
      );
      for (const item of componentes) {
        if (item?.tipo === 'subreceita' && txt(item.id) && !parentsComFilhos.has(txt(item.id))) {
          refAusente++;
          problemas.push({ item_id: item.id, subreceita_id: txt(item.subreceita_id), tipo: 'subreceita_sem_cache' });
        }
      }

      for (const item of componentes) {
        if (!item || item.tipo === 'grupo' || item.tipo === 'subreceita') continue;
        const ingredienteId = txt(item.ingrediente_id);
        if (!ingredienteId) {
          refAusente++;
          problemas.push({ item_id: item.id, tipo: 'ingrediente_sem_id' });
          continue;
        }
        const ingrediente = ingredienteMap.get(ingredienteId);
        if (!ingrediente) {
          refAusente++;
          problemas.push({ item_id: item.id, ingrediente_id: ingredienteId, tipo: 'ingrediente_nao_encontrado' });
          continue;
        }
        if (txt(item.ingrediente_nome) && normNome(item.ingrediente_nome) !== normNome(ingrediente.nome)) {
          refAusente++;
          problemas.push({
            item_id: item.id,
            ingrediente_id: ingredienteId,
            ingrediente_nome_cache: txt(item.ingrediente_nome),
            ingrediente_nome_mestre: txt(ingrediente.nome),
            tipo: 'ingrediente_nome_id_divergente',
          });
          continue;
        }
        const pl = num(item.quantidade_por_porcao) * porcoesBase;
        if (pl > 0) itensComQuantidadePositiva++;
        const pb = pl * fcEfetivo(item, ingrediente);
        const preco = precoEfetivo({ ingrediente, ownerId, prefMap, legacyMap });
        custoIngredientes += pb * preco;
        if (pb > 0 && preco <= 0) {
          semPreco++;
          problemas.push({ item_id: item.id, ingrediente_id: ingredienteId, tipo: 'sem_preco' });
        }
      }

      for (const insumo of insumosDaReceita) {
        const quantidade = positivo(insumo.quantidade);
        const cache = positivo(insumo.custo_total);
        const unitario = positivo(insumo.custo_unitario);
        custoInsumos += cache > 0 ? cache : quantidade * unitario;
        if (quantidade > 0 && cache <= 0 && unitario <= 0) {
          semPreco++;
          problemas.push({ item_id: insumo.id, insumo_id: txt(insumo.insumo_id), tipo: 'insumo_sem_preco' });
        }
      }

      for (const esquecido of esquecidosDaReceita) {
        const ingredienteId = txt(esquecido.ingrediente_id);
        const quantidade = num(esquecido.quantidade_g);
        if (ingredienteId && ingredienteMap.has(ingredienteId)) {
          const ingrediente = ingredienteMap.get(ingredienteId);
          if (txt(esquecido.nome) && normNome(esquecido.nome) !== normNome(ingrediente.nome)) {
            refAusente++;
            problemas.push({
              item_id: esquecido.id,
              ingrediente_id: ingredienteId,
              ingrediente_nome_cache: txt(esquecido.nome),
              ingrediente_nome_mestre: txt(ingrediente.nome),
              tipo: 'esquecido_nome_id_divergente',
            });
            continue;
          }
          const preco = precoEfetivo({ ingrediente, ownerId, prefMap, legacyMap });
          const pb = quantidade * (num(ingrediente.fator_correcao) > 0 ? num(ingrediente.fator_correcao) : 1);
          custoEsquecidos += pb * preco;
          if (pb > 0 && preco <= 0) {
            semPreco++;
            problemas.push({ item_id: esquecido.id, ingrediente_id: ingredienteId, tipo: 'esquecido_sem_preco' });
          }
        } else {
          const cache = num(esquecido.custo_total);
          const unit = num(esquecido.custo_unitario);
          if (cache > 0 || unit > 0) {
            custoEsquecidos += cache > 0 ? cache : quantidade * unit;
            fallbackEsquecido++;
            problemas.push({ item_id: esquecido.id, tipo: 'esquecido_preco_legado' });
          } else if (quantidade > 0) {
            semPreco++;
            problemas.push({ item_id: esquecido.id, tipo: 'esquecido_sem_preco' });
          }
        }
      }

      const temComposicaoCusteavel = itensComQuantidadePositiva > 0
        || insumosDaReceita.some((i: any) => positivo(i?.quantidade) > 0)
        || esquecidosDaReceita.some((i: any) => positivo(i?.quantidade_g) > 0);

      if (!temComposicaoCusteavel) {
        refAusente++;
        problemas.push({ tipo: 'receita_sem_composicao_custeavel' });
      }

      const custoTotal = custoIngredientes + custoInsumos + custoEsquecidos;
      const rendimento = rendimentoEfetivo(receita, componentes);
      const perCapita = positivo(receita.per_capita_g);
      const porcoesEfetivas = perCapita > 0 && rendimento > 0
        ? rendimento / perCapita
        : porcoesBase;
      const custoPorPorcao = porcoesEfetivas > 0 ? custoTotal / porcoesEfetivas : 0;
      const incompleta = semPreco > 0 || refAusente > 0 || fallbackEsquecido > 0;
      const status = incompleta ? 'incompleto' : 'atual';
      const contexto = receita.is_base === false ? 'proprietario' : 'global';

      totalSemPreco += semPreco;
      totalRefAusente += refAusente;
      totalEsquecidosLegado += fallbackEsquecido;
      if (incompleta) incompletas++;

      const patch: any = {
        custo_modelo_versao: VERSAO,
        custo_cache_status: status,
        custo_cache_contexto: contexto,
        custo_cache_itens_sem_preco: semPreco + refAusente + fallbackEsquecido,
        custo_cache_atualizado_em: agora,
      };

      // Nunca substitui valores monetários por cálculo parcial/ambíguo.
      if (!incompleta) {
        patch.custo_total = Number(custoTotal.toFixed(4));
        patch.custo_insumos = Number(custoInsumos.toFixed(4));
        patch.custo_por_porcao = Number(custoPorPorcao.toFixed(4));
        migraveis.push({
          id: receitaId,
          nome: receita.nome,
          contexto,
          custo_anterior: num(receita.custo_total),
          custo_calculado: patch.custo_total,
          custo_por_porcao_calculado: patch.custo_por_porcao,
        });
      } else {
        revisar.push({
          id: receitaId,
          nome: receita.nome,
          contexto,
          custo_preservado: num(receita.custo_total),
          itens_sem_preco: semPreco,
          referencias_ausentes: refAusente,
          esquecidos_legado: fallbackEsquecido,
          problemas: problemas.slice(0, 50),
        });
      }

      const mudou = Object.entries(patch).some(([k, v]) => String(receita[k] ?? '') !== String(v ?? ''));
      if (mudou) atualizacoes.push({ id: receitaId, ...patch });
      else if (!incompleta) jaAtuais++;
    }

    if (!dryRun) {
      for (let i = 0; i < atualizacoes.length; i += 200) {
        await sr.Receita.bulkUpdate(atualizacoes.slice(i, i + 200));
      }

      await sr.NormalizacaoCustoReceitaLog.create({
        executado_por_id: user.id,
        executado_em: agora,
        total_receitas: receitas.length,
        normalizadas: atualizacoes.length,
        ja_atuais: jaAtuais,
        incompletas,
        itens_sem_preco: totalSemPreco,
        referencias_ausentes: totalRefAusente,
        detalhes: JSON.stringify({
          modo: 'aplicar',
          migraveis: migraveis.length,
          esquecidos_legado: totalEsquecidosLegado,
          // Log propositalmente compacto: detalhes completos permanecem disponíveis no dry-run.
          revisar: revisar.slice(0, 25).map((r: any) => ({
            id: r.id,
            nome: r.nome,
            contexto: r.contexto,
            itens_sem_preco: r.itens_sem_preco,
            referencias_ausentes: r.referencias_ausentes,
            esquecidos_legado: r.esquecidos_legado,
          })),
        }),
      });
    }

    return Response.json({
      dry_run: dryRun,
      total_receitas: receitas.length,
      migraveis: migraveis.length,
      normalizadas: dryRun ? 0 : atualizacoes.length,
      ja_atuais: jaAtuais,
      incompletas,
      itens_sem_preco: totalSemPreco,
      referencias_ausentes: totalRefAusente,
      esquecidos_legado: totalEsquecidosLegado,
      amostra_migraveis: migraveis.slice(0, 100),
      revisar: revisar.slice(0, 500),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});