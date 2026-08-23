import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { CUSTO_ASSINATURA_VERSAO, gerarAssinaturaCusto } from '../../shared/custoAssinatura.ts';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

const txt = (v: any) => v == null ? '' : String(v).trim();
const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const positivo = (v: any) => num(v) > 0 ? num(v) : 0;

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

function agrupar(rows: any[]) {
  const map = new Map<string, any[]>();
  for (const row of rows || []) {
    const id = txt(row?.receita_id);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(row);
  }
  return map;
}

function precoEfetivo(ingrediente: any, ownerId: string, prefMap: Map<string, any>, legacyMap: Map<string, any>) {
  let preco = positivo(ingrediente?.preco_por_g_rs);
  if (!ownerId || !ingrediente?.id) return preco;
  const key = `${ownerId}|${ingrediente.id}`;
  const legacy = positivo(legacyMap.get(key)?.preco_por_g_rs);
  if (legacy > 0) preco = legacy;
  const pessoal = positivo(prefMap.get(key)?.preco_por_g_rs);
  if (pessoal > 0) preco = pessoal;
  return preco;
}

function pesoPre(receita: any, itens: any[]) {
  const porcoes = positivo(receita?.porcoes_base) || 1;
  const parentsComFilhos = new Set((itens || []).map((i: any) => txt(i?.subreceita_parent_id)).filter(Boolean));
  const parentsCacheV2 = new Set((itens || [])
    .filter((i: any) => i?.subreceita_parent_id && i?.subreceita_cache === true && num(i?.subreceita_cache_versao) >= 2)
    .map((i: any) => txt(i.subreceita_parent_id)));
  return (itens || []).reduce((s: number, item: any) => {
    if (!item || item.tipo === 'grupo') return s;
    const parentId = txt(item.subreceita_parent_id);
    if (parentId) return parentsCacheV2.has(parentId) ? s : s + positivo(item.quantidade_por_porcao) * porcoes;
    if (item.tipo === 'subreceita') {
      if (parentsCacheV2.has(txt(item.id))) return s + positivo(item.quantidade_por_porcao) * porcoes;
      if (parentsComFilhos.has(txt(item.id))) return s;
    }
    return s + positivo(item.quantidade_por_porcao) * porcoes;
  }, 0);
}

function rendimentoEfetivo(receita: any, itens: any[]) {
  return positivo(receita?.peso_pos_preparo_total)
    || positivo(receita?.rendimento_total)
    || pesoPre(receita, itens);
}

async function bulk(entity: any, rows: any[]) {
  for (let i = 0; i < rows.length; i += 200) await entity.bulkUpdate(rows.slice(i, i + 200));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const aplicar = body?.aplicar === true;

    const sr = base44.asServiceRole.entities;
    const [receitas, ingredientes, itens, insumos, esquecidos, preferencias, legados] = await Promise.all([
      listarTudo(sr.Receita), listarTudo(sr.Ingrediente, 'nome'), listarTudo(sr.IngredienteReceita),
      listarTudo(sr.InsumoReceita), listarTudo(sr.IngredienteEsquecidoReceita),
      listarTudo(sr.IngredienteUsuario, '-updated_date'), listarTudo(sr.PrecoIngredienteCliente, '-updated_date'),
    ]);
    const ingredienteMap = new Map(ingredientes.map((i: any) => [i.id, i]));
    const itensMap = agrupar(itens);
    const insumosMap = agrupar(insumos);
    const esquecidosMap = agrupar(esquecidos);
    const prefMap = new Map<string, any>();
    for (const p of preferencias) {
      const key = `${txt(p.user_id)}|${txt(p.ingrediente_id)}`;
      if (txt(p.user_id) && txt(p.ingrediente_id) && !prefMap.has(key)) prefMap.set(key, p);
    }
    const legacyMap = new Map<string, any>();
    for (const p of legados) {
      const key = `${txt(p.user_id)}|${txt(p.ingrediente_id)}`;
      if (txt(p.user_id) && txt(p.ingrediente_id) && !legacyMap.has(key)) legacyMap.set(key, p);
    }

    const rows: any[] = [];
    for (const receita of receitas) {
      const componentes = itensMap.get(receita.id) || [];
      const contexto = receita.is_base === false ? 'proprietario' : 'global';
      const ownerId = contexto === 'proprietario' ? (txt(receita.usuario_dono_id) || txt(receita.created_by_id)) : '';
      const assinaturaAtual = gerarAssinaturaCusto({
        receita,
        itens: componentes,
        insumos: insumosMap.get(receita.id) || [],
        esquecidos: esquecidosMap.get(receita.id) || [],
        contexto,
        rendimento: rendimentoEfetivo(receita, componentes),
        resolverIngrediente: (id: string) => ingredienteMap.get(id) || null,
        resolverPreco: (ingrediente: any) => precoEfetivo(ingrediente, ownerId, prefMap, legacyMap),
      });
      const persistida = txt(receita.custo_cache_assinatura);
      const versao = num(receita.custo_cache_assinatura_versao);
      const status = !persistida || versao < CUSTO_ASSINATURA_VERSAO
        ? 'ausente'
        : (persistida === assinaturaAtual ? 'valida' : 'divergente');
      rows.push({
        id: receita.id,
        nome: receita.nome,
        status,
        contexto,
        assinatura_persistida: persistida || null,
        assinatura_atual: assinaturaAtual,
        custo_cache_status: receita.custo_cache_status || null,
      });
    }

    const divergentes = rows.filter((r) => r.status !== 'valida');
    if (aplicar && divergentes.length > 0) {
      await invalidarCustosPorDependencias({
        entities: sr,
        receitaIds: divergentes.map((r) => r.id),
        motivo: 'assinatura_custo_divergente_ou_ausente',
        origem: 'auditoria_assinaturas_10_4',
      });
    }
    if (aplicar) {
      const agora = new Date().toISOString();
      await bulk(sr.Receita, rows.map((r) => ({
        id: r.id,
        custo_cache_assinatura_status: r.status,
        ...(r.status === 'valida' ? {} : { custo_cache_invalidado_em: agora }),
      })));
    }

    return Response.json({
      aplicar,
      versao_assinatura: CUSTO_ASSINATURA_VERSAO,
      total: rows.length,
      validas: rows.filter((r) => r.status === 'valida').length,
      divergentes: rows.filter((r) => r.status === 'divergente').length,
      ausentes: rows.filter((r) => r.status === 'ausente').length,
      requer_recalculo: divergentes.length,
      amostra: divergentes.slice(0, 200),
    });
  } catch (error: any) {
    console.error('auditarAssinaturasCustos', error);
    return Response.json({ error: error?.message || 'Erro ao auditar assinaturas.' }, { status: 500 });
  }
});
