import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Fase 10.2 — saneamento das pendências do Motor de Custos.
// Corrige SOMENTE casos determinísticos:
// 1) preço por g/ml derivável de preço da embalagem ÷ peso/quantidade da embalagem;
// 2) referência quebrada reapontável por nome canônico exato e único;
// 3) custo de InsumoReceita recuperável do Insumo referenciado (ou derivável da embalagem).
// Similaridade, preço médio e escolhas ambíguas permanecem manuais.

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

function porNome(rows: any[], field = 'nome') {
  const map = new Map<string, any[]>();
  for (const row of rows || []) {
    const key = norm(row?.[field]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
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

function contextoReceita(receita: any) {
  const ownerId = receita?.is_base === false
    ? (txt(receita?.usuario_dono_id) || txt(receita?.created_by_id))
    : '';
  return { ownerId, contexto: receita?.is_base === false ? 'proprietario' : 'global' };
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

function precoDerivavelMaster(ingrediente: any) {
  const precoEmb = positivo(ingrediente?.preco_embalagem_rs);
  const pesoEmb = positivo(ingrediente?.peso_embalagem_g);
  return precoEmb > 0 && pesoEmb > 0 ? precoEmb / pesoEmb : 0;
}

function precoDerivavelUsuario(pref: any) {
  const precoEmb = positivo(pref?.preco_embalagem_rs);
  const pesoEmb = positivo(pref?.peso_embalagem_g);
  return precoEmb > 0 && pesoEmb > 0 ? precoEmb / pesoEmb : 0;
}

function precoInsumoDerivavel(insumo: any) {
  const precoEmb = positivo(insumo?.preco_embalagem);
  const quantidadeEmb = positivo(insumo?.quantidade_embalagem);
  return precoEmb > 0 && quantidadeEmb > 0 ? precoEmb / quantidadeEmb : 0;
}

function addGrupo(map: Map<string, any>, key: string, base: any, receita: any, itemId: string) {
  if (!map.has(key)) map.set(key, { ...base, ocorrencias: 0, receita_ids: new Set<string>(), item_ids: new Set<string>() });
  const row = map.get(key)!;
  row.ocorrencias++;
  if (receita?.id) row.receita_ids.add(receita.id);
  if (itemId) row.item_ids.add(itemId);
}

function serializarGrupos(map: Map<string, any>, limite = 300) {
  return [...map.values()]
    .map((g: any) => ({
      ...g,
      receita_ids: [...g.receita_ids],
      item_ids: [...g.item_ids].slice(0, 50),
      receitas: g.receita_ids.size,
    }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias)
    .slice(0, limite);
}

async function bulk(entity: any, updates: Map<string, any> | any[]) {
  const rows = Array.isArray(updates) ? updates : [...updates.values()];
  for (let i = 0; i < rows.length; i += 200) {
    await entity.bulkUpdate(rows.slice(i, i + 200));
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const actorId = 'fase10.2-runner';
    const args = req.method === 'GET' ? {} : await req.json().catch(() => ({}));
    const dryRun = args?.dry_run !== false;
    const sr = base44.asServiceRole.entities;

    const [receitasTodas, ingredientes, itens, esquecidos, insumosReceita, insumosMaster, preferencias, precosLegados] = await Promise.all([
      listarTudo(sr.Receita, 'created_date'),
      listarTudo(sr.Ingrediente, 'nome'),
      listarTudo(sr.IngredienteReceita, 'created_date'),
      listarTudo(sr.IngredienteEsquecidoReceita, 'created_date'),
      listarTudo(sr.InsumoReceita, 'created_date'),
      listarTudo(sr.Insumo, 'nome'),
      listarTudo(sr.IngredienteUsuario, '-updated_date'),
      listarTudo(sr.PrecoIngredienteCliente, '-updated_date'),
    ]);

    const receitas = receitasTodas.filter((r: any) => r?.custo_cache_status === 'incompleto');
    const receitaMap = new Map(receitas.map((r: any) => [r.id, r]));
    const ingredienteMap = new Map(ingredientes.map((i: any) => [i.id, i]));
    const ingredienteNomeMap = porNome(ingredientes, 'nome');
    const insumoMap = new Map(insumosMaster.map((i: any) => [i.id, i]));
    const insumoNomeMap = porNome(insumosMaster, 'nome');
    const itensPorReceita = agruparPorReceita(itens.filter((i: any) => receitaMap.has(txt(i.receita_id))));
    const esquecidosPorReceita = agruparPorReceita(esquecidos.filter((i: any) => receitaMap.has(txt(i.receita_id))));
    const insumosPorReceita = agruparPorReceita(insumosReceita.filter((i: any) => receitaMap.has(txt(i.receita_id))));

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

    const gruposPreco = new Map<string, any>();
    const gruposReferencia = new Map<string, any>();
    const gruposInsumo = new Map<string, any>();
    const gruposOutros = new Map<string, any>();

    const updIngrediente = new Map<string, any>();
    const updPref = new Map<string, any>();
    const updItem = new Map<string, any>();
    const updEsquecido = new Map<string, any>();
    const updInsumo = new Map<string, any>();
    const updInsumoReceita = new Map<string, any>();

    const receitaFixavel = new Map<string, { total: number; fixaveis: number }>();
    const registrarIssue = (receitaId: string, fixavel: boolean) => {
      const atual = receitaFixavel.get(receitaId) || { total: 0, fixaveis: 0 };
      atual.total++;
      if (fixavel) atual.fixaveis++;
      receitaFixavel.set(receitaId, atual);
    };

    for (const receita of receitas) {
      const { ownerId, contexto } = contextoReceita(receita);
      const componentes = itensPorReceita.get(receita.id) || [];
      const filhosPorParent = new Set(componentes.map((i: any) => txt(i?.subreceita_parent_id)).filter(Boolean));
      let temComposicao = false;

      for (const item of componentes) {
        if (!item || item.tipo === 'grupo') continue;
        const qtd = positivo(item.quantidade_por_porcao);
        if (qtd > 0) temComposicao = true;

        if (item.tipo === 'subreceita') {
          if (txt(item.id) && !filhosPorParent.has(txt(item.id))) {
            registrarIssue(receita.id, false);
            addGrupo(gruposOutros, 'subreceita_sem_cache', {
              tipo: 'subreceita_sem_cache',
              resolucao: 'sincronizar_subreceita',
              automatico: false,
            }, receita, item.id);
          }
          continue;
        }

        if (item.tipo !== 'ingrediente') continue;
        let ingrediente = txt(item.ingrediente_id) ? ingredienteMap.get(txt(item.ingrediente_id)) : null;

        if (!ingrediente) {
          const nomeCache = txt(item.ingrediente_nome);
          const candidatos = nomeCache ? (ingredienteNomeMap.get(norm(nomeCache)) || []) : [];
          const direto = !txt(item.subreceita_parent_id);
          const unico = candidatos.length === 1 ? candidatos[0] : null;
          const fixavel = Boolean(direto && unico);
          registrarIssue(receita.id, fixavel);
          const refKey = `${txt(item.ingrediente_id) || '*'}|${norm(nomeCache) || '*'}`;
          addGrupo(gruposReferencia, refKey, {
            tipo: txt(item.subreceita_parent_id) ? 'referencia_subreceita_quebrada' : 'referencia_ingrediente_quebrada',
            ingrediente_id_antigo: txt(item.ingrediente_id),
            ingrediente_nome_cache: nomeCache,
            candidatos_exatos: candidatos.map((c: any) => ({ id: c.id, nome: c.nome })),
            automatico: fixavel,
            resolucao: fixavel ? 'reapontar_nome_exato_unico' : (txt(item.subreceita_parent_id) ? 'sincronizar_subreceita' : 'revisao_manual'),
          }, receita, item.id);

          if (fixavel) {
            updItem.set(item.id, { id: item.id, ingrediente_id: unico.id, ingrediente_nome: unico.nome, modelo_versao: 2 });
            ingrediente = unico;
          } else {
            continue;
          }
        }

        if (qtd <= 0 || !ingrediente) continue;
        const efetivo = precoEfetivo(ingrediente, ownerId, prefMap, legacyMap);
        if (efetivo > 0) continue;

        const prefKey = ownerId ? `${ownerId}|${ingrediente.id}` : '';
        const pref = prefKey ? prefMap.get(prefKey) : null;
        const derivadoUsuario = ownerId ? precoDerivavelUsuario(pref) : 0;
        const derivadoMaster = precoDerivavelMaster(ingrediente);
        const fixavel = derivadoUsuario > 0 || derivadoMaster > 0;
        registrarIssue(receita.id, fixavel);

        const grupoKey = `${contexto}|${ownerId || '*'}|${ingrediente.id}`;
        addGrupo(gruposPreco, grupoKey, {
          tipo: 'ingrediente_sem_preco',
          ingrediente_id: ingrediente.id,
          ingrediente_nome: ingrediente.nome,
          contexto,
          owner_id: ownerId || null,
          automatico: fixavel,
          resolucao: derivadoUsuario > 0 ? 'derivar_preco_usuario_embalagem' : (derivadoMaster > 0 ? 'derivar_preco_mestre_embalagem' : 'revisao_manual'),
          preco_sugerido: derivadoUsuario || derivadoMaster || null,
          preco_medio_nacional_rs_kg: positivo(ingrediente.preco_medio_nacional) || null,
        }, receita, item.id);

        if (derivadoUsuario > 0 && pref?.id) {
          updPref.set(pref.id, {
            id: pref.id,
            preco_por_g_rs: Number(derivadoUsuario.toFixed(8)),
            preco_atualizado_em: new Date().toISOString(),
          });
        } else if (derivadoMaster > 0) {
          updIngrediente.set(ingrediente.id, {
            id: ingrediente.id,
            preco_por_g_rs: Number(derivadoMaster.toFixed(8)),
            preco_atualizado_em: new Date().toISOString(),
          });
        }
      }

      for (const esquecido of esquecidosPorReceita.get(receita.id) || []) {
        const qtd = positivo(esquecido.quantidade_g);
        if (qtd > 0) temComposicao = true;
        if (qtd <= 0) continue;

        let ingrediente = txt(esquecido.ingrediente_id) ? ingredienteMap.get(txt(esquecido.ingrediente_id)) : null;
        if (!ingrediente) {
          const candidatos = txt(esquecido.nome) ? (ingredienteNomeMap.get(norm(esquecido.nome)) || []) : [];
          const unico = candidatos.length === 1 ? candidatos[0] : null;
          const fixavel = Boolean(unico);
          registrarIssue(receita.id, fixavel);
          const refKey = `esquecido|${txt(esquecido.ingrediente_id) || '*'}|${norm(esquecido.nome) || '*'}`;
          addGrupo(gruposReferencia, refKey, {
            tipo: 'referencia_esquecido_quebrada',
            ingrediente_id_antigo: txt(esquecido.ingrediente_id),
            ingrediente_nome_cache: txt(esquecido.nome),
            candidatos_exatos: candidatos.map((c: any) => ({ id: c.id, nome: c.nome })),
            automatico: fixavel,
            resolucao: fixavel ? 'reapontar_nome_exato_unico' : 'revisao_manual',
          }, receita, esquecido.id);
          if (fixavel) {
            updEsquecido.set(esquecido.id, { id: esquecido.id, ingrediente_id: unico.id });
            ingrediente = unico;
          } else {
            continue;
          }
        }

        const efetivo = precoEfetivo(ingrediente, ownerId, prefMap, legacyMap);
        if (efetivo > 0) continue;
        const prefKey = ownerId ? `${ownerId}|${ingrediente.id}` : '';
        const pref = prefKey ? prefMap.get(prefKey) : null;
        const derivadoUsuario = ownerId ? precoDerivavelUsuario(pref) : 0;
        const derivadoMaster = precoDerivavelMaster(ingrediente);
        const fixavel = derivadoUsuario > 0 || derivadoMaster > 0;
        registrarIssue(receita.id, fixavel);
        const grupoKey = `esquecido|${contexto}|${ownerId || '*'}|${ingrediente.id}`;
        addGrupo(gruposPreco, grupoKey, {
          tipo: 'esquecido_sem_preco',
          ingrediente_id: ingrediente.id,
          ingrediente_nome: ingrediente.nome,
          contexto,
          owner_id: ownerId || null,
          automatico: fixavel,
          resolucao: derivadoUsuario > 0 ? 'derivar_preco_usuario_embalagem' : (derivadoMaster > 0 ? 'derivar_preco_mestre_embalagem' : 'revisao_manual'),
          preco_sugerido: derivadoUsuario || derivadoMaster || null,
          preco_medio_nacional_rs_kg: positivo(ingrediente.preco_medio_nacional) || null,
        }, receita, esquecido.id);
        if (derivadoUsuario > 0 && pref?.id) {
          updPref.set(pref.id, { id: pref.id, preco_por_g_rs: Number(derivadoUsuario.toFixed(8)), preco_atualizado_em: new Date().toISOString() });
        } else if (derivadoMaster > 0) {
          updIngrediente.set(ingrediente.id, { id: ingrediente.id, preco_por_g_rs: Number(derivadoMaster.toFixed(8)), preco_atualizado_em: new Date().toISOString() });
        }
      }

      for (const ir of insumosPorReceita.get(receita.id) || []) {
        const qtd = positivo(ir.quantidade);
        if (qtd > 0) temComposicao = true;
        if (qtd <= 0 || positivo(ir.custo_total) > 0 || positivo(ir.custo_unitario) > 0) continue;

        let master = txt(ir.insumo_id) ? insumoMap.get(txt(ir.insumo_id)) : null;
        let reapontar = false;
        if (!master && txt(ir.insumo_nome)) {
          const todos = insumoNomeMap.get(norm(ir.insumo_nome)) || [];
          const ownerEsperado = ownerId || txt(receita.created_by_id);
          const candidatos = todos.filter((c: any) => !ownerEsperado || txt(c.created_by_id) === ownerEsperado);
          if (candidatos.length === 1) {
            master = candidatos[0];
            reapontar = true;
          }
        }

        const unitExistente = positivo(master?.preco_unitario);
        const unitDerivado = master ? precoInsumoDerivavel(master) : 0;
        const unit = unitExistente || unitDerivado;
        const fixavel = Boolean(master && unit > 0);
        registrarIssue(receita.id, fixavel);
        const grupoKey = `${contexto}|${ownerId || txt(receita.created_by_id) || '*'}|${txt(ir.insumo_id) || norm(ir.insumo_nome) || '*'}`;
        addGrupo(gruposInsumo, grupoKey, {
          tipo: 'insumo_sem_preco',
          insumo_id: txt(ir.insumo_id),
          insumo_nome: txt(ir.insumo_nome),
          master_id: master?.id || null,
          master_nome: master?.nome || null,
          automatico: fixavel,
          resolucao: !master ? 'revisao_manual' : (unitExistente > 0 ? 'usar_preco_unitario_mestre' : (unitDerivado > 0 ? 'derivar_preco_insumo_embalagem' : 'revisao_manual')),
          preco_unitario_sugerido: unit || null,
        }, receita, ir.id);

        if (fixavel && master) {
          if (unitDerivado > 0 && unitExistente <= 0) {
            updInsumo.set(master.id, { id: master.id, preco_unitario: Number(unitDerivado.toFixed(8)) });
          }
          updInsumoReceita.set(ir.id, {
            id: ir.id,
            ...(reapontar ? { insumo_id: master.id, insumo_nome: master.nome } : {}),
            custo_unitario: Number(unit.toFixed(8)),
            custo_total: Number((qtd * unit).toFixed(4)),
          });
        }
      }

      if (!temComposicao) {
        registrarIssue(receita.id, false);
        addGrupo(gruposOutros, 'receita_sem_composicao_custeavel', {
          tipo: 'receita_sem_composicao_custeavel',
          automatico: false,
          resolucao: 'revisao_manual',
        }, receita, '');
      }
    }

    const resolviveis = [...receitaFixavel.entries()].filter(([, v]) => v.total > 0 && v.total === v.fixaveis).map(([id]) => id);
    const manuais = [...receitaFixavel.entries()].filter(([, v]) => v.total === 0 || v.total !== v.fixaveis).map(([id]) => id);
    const gruposPrecoArr = serializarGrupos(gruposPreco);
    const gruposReferenciaArr = serializarGrupos(gruposReferencia);
    const gruposInsumoArr = serializarGrupos(gruposInsumo);
    const gruposOutrosArr = serializarGrupos(gruposOutros);

    if (!dryRun) {
      await bulk(sr.Ingrediente, updIngrediente);
      await bulk(sr.IngredienteUsuario, updPref);
      await bulk(sr.IngredienteReceita, updItem);
      await bulk(sr.IngredienteEsquecidoReceita, updEsquecido);
      await bulk(sr.Insumo, updInsumo);
      await bulk(sr.InsumoReceita, updInsumoReceita);

      await sr.SaneamentoCustoPendenciaLog.create({
        executado_por_id: actorId,
        executado_em: new Date().toISOString(),
        modo: 'aplicar',
        receitas_incompletas_antes: receitas.length,
        precos_derivados_mestre: updIngrediente.size,
        precos_derivados_usuario: updPref.size,
        referencias_reapontadas: updItem.size + updEsquecido.size,
        insumos_recalculados: updInsumoReceita.size,
        pendencias_manuais: manuais.length,
        detalhes: JSON.stringify({
          receitas_potencialmente_resolvidas: resolviveis.length,
          grupos_preco_manuais: gruposPrecoArr.filter((g: any) => !g.automatico).slice(0, 15).map((g: any) => ({ ingrediente_id: g.ingrediente_id, ingrediente_nome: g.ingrediente_nome, ocorrencias: g.ocorrencias, receitas: g.receitas })),
          referencias_manuais: gruposReferenciaArr.filter((g: any) => !g.automatico).slice(0, 15).map((g: any) => ({ tipo: g.tipo, ingrediente_nome_cache: g.ingrediente_nome_cache, ocorrencias: g.ocorrencias })),
          outros: gruposOutrosArr.slice(0, 15).map((g: any) => ({ tipo: g.tipo, ocorrencias: g.ocorrencias, receitas: g.receitas })),
        }),
      });
    }

    return Response.json({
      dry_run: dryRun,
      receitas_incompletas: receitas.length,
      receitas_potencialmente_resolvidas: resolviveis.length,
      receitas_com_revisao_manual: manuais.length,
      correcoes: {
        precos_derivados_mestre: updIngrediente.size,
        precos_derivados_usuario: updPref.size,
        referencias_reapontaveis: updItem.size + updEsquecido.size,
        insumos_recalculaveis: updInsumoReceita.size,
      },
      grupos: {
        precos: gruposPrecoArr,
        referencias: gruposReferenciaArr,
        insumos: gruposInsumoArr,
        outros: gruposOutrosArr,
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
