import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VERSAO = 1;
const TIPOS = new Set(['catalogo', 'autoral', 'personalizacao', 'duplicacao', 'importacao']);

const texto = (v: any) => (v == null ? '' : String(v).trim());
const inteiro = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
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

function origemInfo(r: any) {
  const origem = texto(r?.receita_origem_id);
  const fork = texto(r?.forked_from_id);
  return {
    origem,
    fork,
    conflito: !!(origem && fork && origem !== fork),
    parentId: origem || fork,
  };
}

function valoresDiferentes(a: any, b: any) {
  if (a == null && b == null) return false;
  return String(a ?? '') !== String(b ?? '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const receitas = await listarTudo(base44.asServiceRole.entities.Receita, 'created_date', 500);
    const receitaMap = new Map(receitas.map((r: any) => [r.id, r]));
    const atualizacoes: any[] = [];
    const revisar: any[] = [];
    let jaCanonicas = 0;
    let ciclos = 0;
    let origensAusentes = 0;

    const analisar = (receita: any) => {
      const problemas: string[] = [];
      const infoInicial = origemInfo(receita);
      if (infoInicial.conflito) problemas.push('origens_conflitantes');
      if (infoInicial.parentId && infoInicial.parentId === receita.id) problemas.push('auto_referencia');

      const evidenciaPessoal = receita.is_base === false
        || !!texto(receita.usuario_dono_id)
        || !!infoInicial.parentId;
      const isBase = !evidenciaPessoal;
      const donoId = isBase ? '' : (texto(receita.usuario_dono_id) || texto(receita.created_by_id));
      if (!isBase && !donoId) problemas.push('pessoal_sem_dono');

      let atual = receita;
      const visitados: string[] = [];
      let raizId = '';
      let status = 'canonica';

      while (atual) {
        const id = texto(atual.id);
        if (!id) {
          problemas.push('id_invalido');
          status = 'a_validar';
          break;
        }
        if (visitados.includes(id)) {
          problemas.push('ciclo');
          status = 'ciclo';
          ciclos++;
          break;
        }
        visitados.push(id);

        const info = origemInfo(atual);
        if (info.conflito) {
          if (!problemas.includes('origens_conflitantes')) problemas.push('origens_conflitantes');
          status = 'a_validar';
          break;
        }
        if (!info.parentId) {
          raizId = id;
          break;
        }
        const parent = receitaMap.get(info.parentId);
        if (!parent) {
          problemas.push('origem_ausente');
          status = 'origem_ausente';
          origensAusentes++;
          break;
        }
        atual = parent;
      }

      if (problemas.length > 0 && status === 'canonica') status = 'a_validar';
      const geracao = Math.max(0, visitados.length - 1);
      const parentId = infoInicial.parentId;

      let tipo = texto(receita.linhagem_tipo);
      if (!TIPOS.has(tipo)) {
        tipo = isBase ? 'catalogo' : (parentId ? 'personalizacao' : 'autoral');
      }
      if ((tipo === 'catalogo' || tipo === 'autoral') && parentId) {
        problemas.push('tipo_raiz_com_origem');
        status = 'a_validar';
      }
      if ((tipo === 'personalizacao' || tipo === 'duplicacao') && !parentId) {
        problemas.push('tipo_derivado_sem_origem');
        status = 'a_validar';
      }

      if (status !== 'canonica' || !raizId) {
        return {
          status,
          problemas,
          patch: {
            linhagem_versao: VERSAO,
            linhagem_status: status,
          },
        };
      }

      const patch: any = {
        is_base: isBase,
        usuario_dono_id: donoId,
        receita_origem_id: parentId || '',
        receita_raiz_id: raizId,
        linhagem_geracao: geracao,
        linhagem_tipo: tipo,
        linhagem_versao: VERSAO,
        linhagem_status: 'canonica',
        forked_from_id: tipo === 'personalizacao' ? (parentId || '') : '',
      };

      if (!isBase && !receita.data_personalizacao) {
        patch.data_personalizacao = receita.created_date || new Date().toISOString();
      }

      return { status: 'canonica', problemas, patch };
    };

    for (const receita of receitas) {
      const analise = analisar(receita);
      if (analise.status !== 'canonica') {
        revisar.push({
          id: receita.id,
          nome: receita.nome,
          status: analise.status,
          problemas: analise.problemas,
          receita_origem_id: receita.receita_origem_id || '',
          forked_from_id: receita.forked_from_id || '',
        });
      }

      const patch: any = analise.patch;
      const mudou = Object.entries(patch).some(([k, v]) => valoresDiferentes(receita[k], v));
      if (mudou) atualizacoes.push({ id: receita.id, ...patch });
      else if (analise.status === 'canonica') jaCanonicas++;
    }

    for (let i = 0; i < atualizacoes.length; i += 200) {
      await base44.asServiceRole.entities.Receita.bulkUpdate(atualizacoes.slice(i, i + 200));
    }

    await base44.asServiceRole.entities.NormalizacaoLinhagemReceitaLog.create({
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
      total_receitas: receitas.length,
      normalizadas: atualizacoes.length,
      ja_canonicas: jaCanonicas,
      a_revisar: revisar.length,
      ciclos,
      origens_ausentes: origensAusentes,
      detalhes: JSON.stringify({ revisar: revisar.slice(0, 500) }),
    });

    return Response.json({
      total_receitas: receitas.length,
      normalizadas: atualizacoes.length,
      ja_canonicas: jaCanonicas,
      a_revisar: revisar.length,
      ciclos,
      origens_ausentes: origensAusentes,
      revisar: revisar.slice(0, 500),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
