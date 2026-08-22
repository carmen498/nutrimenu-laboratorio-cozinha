import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VERSAO = 2;
const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
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
  const legacy = legacyMap.get(key);
  if (legacy && legacy.preco_por_g_rs != null && legacy.preco_por_g_rs !== '') preco = num(legacy.preco_por_g_rs);
  const pref = prefMap.get(key);
  if (pref && Object.prototype.hasOwnProperty.call(pref, 'preco_por_g_rs')) preco = num(pref.preco_por_g_rs);
  return preco;
}

function fcEfetivo(item: any, ingrediente: any) {
  const override = num(item?.fator_correcao_override);
  if (override > 0) return override;
  const mestre = num(ingrediente?.fator_correcao);
  return mestre > 0 ? mestre : 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const [receitas, ingredientes, itens, insumos, esquecidos, preferencias, precosLegados] = await Promise.all([
      listarTudo(sr.Receita, 'created_date'),
      listarTudo(sr.Ingrediente, 'nome'),
      listarTudo(sr.IngredienteReceita, 'created_date'),
      listarTudo(sr.InsumoReceita, 'created_date'),
      listarTudo(sr.IngredienteEsquecidoReceita, 'created_date'),
      listarTudo(sr.IngredienteUsuario, '-updated_date'),
      listarTudo(sr.PrecoIngredienteCliente, '-updated_date'),
    ]);

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
    let jaAtuais = 0;
    let incompletas = 0;
    let totalSemPreco = 0;
    let totalRefAusente = 0;

    for (const receita of receitas) {
      const receitaId = receita.id;
      const ownerId = receita.is_base === false ? (txt(receita.usuario_dono_id) || txt(receita.created_by_id)) : '';
      const componentes = itensPorReceita.get(receitaId) || [];
      const porcoesBase = num(receita.porcoes_base) > 0 ? num(receita.porcoes_base) : 1;
      let custoIngredientes = 0;
      let custoInsumos = 0;
      let custoEsquecidos = 0;
      let semPreco = 0;
      let refAusente = 0;
      let fallbackEsquecido = 0;
      const problemas: any[] = [];

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
        const pl = num(item.quantidade_por_porcao) * porcoesBase;
        const pb = pl * fcEfetivo(item, ingrediente);
        const preco = precoEfetivo({ ingrediente, ownerId, prefMap, legacyMap });
        custoIngredientes += pb * preco;
        if (pb > 0 && preco <= 0) {
          semPreco++;
          problemas.push({ item_id: item.id, ingrediente_id: ingredienteId, tipo: 'sem_preco' });
        }
      }

      for (const insumo of insumosPorReceita.get(receitaId) || []) {
        const cache = num(insumo.custo_total);
        custoInsumos += cache > 0 ? cache : num(insumo.quantidade) * num(insumo.custo_unitario);
      }

      for (const esquecido of esquecidosPorReceita.get(receitaId) || []) {
        const ingredienteId = txt(esquecido.ingrediente_id);
        const quantidade = num(esquecido.quantidade_g);
        if (ingredienteId && ingredienteMap.has(ingredienteId)) {
          const ingrediente = ingredienteMap.get(ingredienteId);
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

      const custoTotal = custoIngredientes + custoInsumos + custoEsquecidos;
      const custoPorPorcao = porcoesBase > 0 ? custoTotal / porcoesBase : 0;
      const incompleta = semPreco > 0 || refAusente > 0 || fallbackEsquecido > 0;
      const status = incompleta ? 'incompleto' : 'atual';
      const contexto = receita.is_base === false ? 'proprietario' : 'global';

      totalSemPreco += semPreco;
      totalRefAusente += refAusente;
      if (incompleta) incompletas++;

      const patch: any = {
        custo_modelo_versao: VERSAO,
        custo_cache_status: status,
        custo_cache_contexto: contexto,
        custo_cache_itens_sem_preco: semPreco + refAusente + fallbackEsquecido,
        custo_cache_atualizado_em: new Date().toISOString(),
      };

      // Não sobrescreve custo total com cálculo parcial/ambíguo.
      if (!incompleta) {
        patch.custo_total = Number(custoTotal.toFixed(4));
        patch.custo_insumos = Number(custoInsumos.toFixed(4));
        patch.custo_por_porcao = Number(custoPorPorcao.toFixed(4));
      } else {
        revisar.push({
          id: receitaId,
          nome: receita.nome,
          contexto,
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

    for (let i = 0; i < atualizacoes.length; i += 200) {
      await sr.Receita.bulkUpdate(atualizacoes.slice(i, i + 200));
    }

    await sr.NormalizacaoCustoReceitaLog.create({
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
      total_receitas: receitas.length,
      normalizadas: atualizacoes.length,
      ja_atuais: jaAtuais,
      incompletas,
      itens_sem_preco: totalSemPreco,
      referencias_ausentes: totalRefAusente,
      detalhes: JSON.stringify({ revisar: revisar.slice(0, 500) }),
    });

    return Response.json({
      total_receitas: receitas.length,
      normalizadas: atualizacoes.length,
      ja_atuais: jaAtuais,
      incompletas,
      itens_sem_preco: totalSemPreco,
      referencias_ausentes: totalRefAusente,
      revisar: revisar.slice(0, 500),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
