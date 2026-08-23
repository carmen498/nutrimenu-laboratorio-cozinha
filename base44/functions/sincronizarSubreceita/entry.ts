import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const MAX_PROFUNDIDADE = 12;
const atualizadoEm = (r: any) => r?.updated_date || r?.updated_at || r?.created_date || '';
const txt = (v: any) => v == null ? '' : String(v).trim();
const normNome = (v: any) => txt(v)
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

const assinatura = (deps: Map<string, string>) => [...deps.entries()]
  .sort(([a], [b]) => String(a).localeCompare(String(b)))
  .map(([id, data]) => `${id}@${data || 'sem-data'}`)
  .join('|');

const numeroCache = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(10) : '0.0000000000';
};

const chaveCacheAtomico = (item: any) => [
  txt(item?.subreceita_origem_receita_id),
  txt(item?.subreceita_origem_item_id),
  txt(item?.ingrediente_id),
  numeroCache(item?.quantidade_por_porcao),
  txt(item?.unidade_quantidade),
  txt(item?.pre_preparo),
  item?.proporcional === false ? '0' : '1',
  numeroCache(item?.fator_correcao_override),
  txt(item?.medida_caseira_id),
  numeroCache(item?.quantidade_medida_caseira),
  txt(item?.medida_caseira),
  txt(item?.subreceita_linhagem),
].join('~');

const assinaturaConteudoCache = (lista: any[]) => (lista || [])
  .map(chaveCacheAtomico)
  .sort()
  .join('||');

const rendimentoOperacional = (receita: any, itens: any[]) => {
  const informado = Number(receita?.peso_pos_preparo_total) > 0
    ? Number(receita.peso_pos_preparo_total)
    : (Number(receita?.rendimento_total) > 0 ? Number(receita.rendimento_total) : 0);
  if (informado > 0) return { valor: informado, estimado: false };
  const porcoes = Number(receita?.porcoes_base) > 0 ? Number(receita.porcoes_base) : 1;
  const total = (itens || [])
    .filter((i: any) => i.tipo !== 'grupo' && !i.subreceita_parent_id)
    .reduce((s: number, i: any) => s + (Number(i.quantidade_por_porcao) || 0) * porcoes, 0);
  return { valor: total > 0 ? total : 1, estimado: true };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const markerId = String(body?.marker_id || '');
    const todosDesatualizados = body?.todos_desatualizados === true;
    const migrarPreparacoesExatas = body?.migrar_preparacoes_exatas === true;
    const dryRun = body?.dry_run === true;
    if (!markerId && !todosDesatualizados && !migrarPreparacoesExatas) {
      return Response.json({ error: 'Informe marker_id, todos_desatualizados=true ou migrar_preparacoes_exatas=true' }, { status: 400 });
    }

    // Paginar por created_date evita sobreposição/lacunas quando muitos registros
    // compartilham o mesmo nome/ordem. A ordenação visual por `ordem` é feita
    // depois, dentro de cada receita.
    const [receitas, itens, ingredientes] = await Promise.all([
      listarTudo(base44.asServiceRole.entities.Receita, 'created_date'),
      listarTudo(base44.asServiceRole.entities.IngredienteReceita, 'created_date'),
      migrarPreparacoesExatas ? listarTudo(base44.asServiceRole.entities.Ingrediente, 'created_date') : Promise.resolve([]),
    ]);
    const receitaMap = new Map((receitas || []).map((r: any) => [r.id, r]));
    const itemMap = new Map((itens || []).map((i: any) => [i.id, i]));
    const itensPorReceita = new Map<string, any[]>();
    for (const item of itens || []) {
      if (!itensPorReceita.has(item.receita_id)) itensPorReceita.set(item.receita_id, []);
      itensPorReceita.get(item.receita_id)!.push(item);
    }
    for (const lista of itensPorReceita.values()) {
      lista.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
    }

    const registrarLog = async (dados: any) => {
      await base44.asServiceRole.entities.SincronizacaoSubreceitaLog.create({
        ...dados,
        executado_por_id: user.id,
        executado_em: new Date().toISOString(),
      });
    };

    const calcularCache = (marker: any) => {
      const source = receitaMap.get(marker.subreceita_id);
      if (!source) {
        const err: any = new Error('Receita de origem da sub-receita não encontrada.');
        err.code = 'ORIGEM_AUSENTE';
        throw err;
      }

      const deps = new Map<string, string>();
      const alertas: string[] = [];
      const children: any[] = [];
      let ultimaComposicaoMs = 0;
      let ultimaComposicaoEm = '';

      const expandir = (receitaAtual: any, quantidadeSaidaPorPorcaoPai: number, pilha: string[]) => {
        if (pilha.length >= MAX_PROFUNDIDADE) {
          const err: any = new Error(`Sub-receitas excederam ${MAX_PROFUNDIDADE} níveis.`);
          err.code = 'CICLO';
          throw err;
        }
        if (pilha.includes(receitaAtual.id)) {
          const caminho = [...pilha, receitaAtual.id]
            .map((id) => receitaMap.get(id)?.nome || id)
            .join(' → ');
          const err: any = new Error(`Ciclo de sub-receitas detectado: ${caminho}`);
          err.code = 'CICLO';
          throw err;
        }

        const sourceItens = itensPorReceita.get(receitaAtual.id) || [];
        deps.set(receitaAtual.id, atualizadoEm(receitaAtual));
        for (const sourceItem of sourceItens) {
          if (sourceItem.tipo === 'grupo' || sourceItem.subreceita_parent_id) continue;
          const data = atualizadoEm(sourceItem);
          const ms = data ? Date.parse(data) : 0;
          if (Number.isFinite(ms) && ms > ultimaComposicaoMs) {
            ultimaComposicaoMs = ms;
            ultimaComposicaoEm = data;
          }
        }
        const rendimento = rendimentoOperacional(receitaAtual, sourceItens);
        const porcoes = Number(receitaAtual.porcoes_base) > 0 ? Number(receitaAtual.porcoes_base) : 1;
        const escala = quantidadeSaidaPorPorcaoPai / rendimento.valor;
        if (rendimento.estimado) alertas.push(`Rendimento estimado: ${receitaAtual.nome || receitaAtual.id}`);

        for (const item of sourceItens) {
          if (item.tipo === 'grupo' || item.subreceita_parent_id) continue;
          const qtdLote = (Number(item.quantidade_por_porcao) || 0) * porcoes;
          const qtdEscalada = qtdLote * escala;
          if (!(qtdEscalada > 0)) continue;

          if (item.tipo === 'subreceita') {
            const nested = receitaMap.get(item.subreceita_id);
            if (!nested) {
              const err: any = new Error(`Sub-receita aninhada não encontrada: ${item.subreceita_id || 'sem ID'}`);
              err.code = 'ORIGEM_AUSENTE';
              throw err;
            }
            expandir(nested, qtdEscalada, [...pilha, receitaAtual.id]);
            continue;
          }
          if (!item.ingrediente_id) {
            alertas.push(`Item sem ingrediente_id ignorado: ${item.id}`);
            continue;
          }

          children.push({
            modelo_versao: 2,
            tipo: 'ingrediente',
            ingrediente_id: item.ingrediente_id,
            ingrediente_nome: item.ingrediente_nome || '',
            quantidade_por_porcao: qtdEscalada,
            unidade_quantidade: item.unidade_quantidade || (receitaAtual.unidade_base === 'ml' ? 'ml' : 'g'),
            pre_preparo: item.pre_preparo || '',
            proporcional: item.proporcional !== false,
            fator_correcao_override: Number(item.fator_correcao_override) > 0 ? Number(item.fator_correcao_override) : 0,
            medida_caseira_id: item.medida_caseira_id || '',
            quantidade_medida_caseira: item.quantidade_medida_caseira,
            medida_caseira: item.medida_caseira || '',
            subreceita_cache: true,
            subreceita_cache_versao: 2,
            subreceita_origem_receita_id: receitaAtual.id,
            subreceita_origem_item_id: item.id || '',
            subreceita_linhagem: [...pilha, receitaAtual.id].join('>'),
          });
        }
      };

      expandir(source, Number(marker.quantidade_por_porcao) || 0, [marker.receita_id]);
      const assinaturaNova = assinatura(deps);
      for (const child of children) {
        child.subreceita_dependencias_assinatura = assinaturaNova;
        child.subreceita_origem_updated_at = atualizadoEm(source);
      }
      return {
        source,
        children,
        assinaturaNova,
        dependencias: Object.fromEntries(deps),
        alertas,
        ultimaComposicaoMs,
        ultimaComposicaoEm,
      };
    };

    const analisarMarker = (marker: any) => {
      const existentes = (itens || []).filter((i: any) => i.subreceita_parent_id === marker.id);
      try {
        const calculado = calcularCache(marker);
        const assinaturaCache = marker.subreceita_dependencias_assinatura
          || existentes.find((c: any) => c.subreceita_dependencias_assinatura)?.subreceita_dependencias_assinatura
          || '';
        const cacheV2 = existentes.length > 0 && existentes.every((c: any) => c.subreceita_cache === true && Number(c.subreceita_cache_versao) >= 2 && Number(c.modelo_versao) === 2);
        const sincronizadaMs = marker.subreceita_sincronizada_em ? Date.parse(marker.subreceita_sincronizada_em) : 0;
        const composicaoMudouDepois = calculado.ultimaComposicaoMs > (Number.isFinite(sincronizadaMs) ? sincronizadaMs : 0);
        const assinaturaConteudoAtual = assinaturaConteudoCache(existentes);
        const assinaturaConteudoEsperado = assinaturaConteudoCache(calculado.children);
        const cacheConteudoAtual = assinaturaConteudoAtual === assinaturaConteudoEsperado;
        const assinaturaMetadadosDivergente = !!assinaturaCache && assinaturaCache !== calculado.assinaturaNova;
        const status = existentes.length === 0
          ? 'pendente'
          : (!cacheV2 ? 'a_validar' : (cacheConteudoAtual ? 'sincronizada' : 'desatualizada'));
        return {
          status,
          existentes,
          calculado,
          assinaturaCache,
          composicaoMudouDepois,
          cacheConteudoAtual,
          assinaturaMetadadosDivergente,
        };
      } catch (error: any) {
        return {
          status: error?.code === 'CICLO' ? 'erro_ciclo' : 'origem_ausente',
          existentes,
          calculado: null,
          assinaturaCache: marker.subreceita_dependencias_assinatura || '',
          error,
        };
      }
    };

    const metadadosPrecisamAtualizar = (marker: any, analise: any) => {
      if (!analise?.calculado || analise.status !== 'sincronizada') return false;
      const origemAtualizadaEm = atualizadoEm(analise.calculado.source);
      const markerDivergente = Number(marker.modelo_versao) !== 2
        || marker.tipo !== 'subreceita'
        || !!marker.ingrediente_id
        || marker.subreceita_cache === true
        || marker.subreceita_modo !== 'referencia_cache'
        || Number(marker.subreceita_cache_versao) < 2
        || marker.subreceita_sincronizacao_status !== 'sincronizada'
        || txt(marker.subreceita_dependencias_assinatura) !== analise.calculado.assinaturaNova
        || txt(marker.subreceita_origem_updated_at) !== origemAtualizadaEm;
      const filhosDivergentes = analise.existentes.some((child: any) =>
        Number(child.modelo_versao) !== 2
        || child.subreceita_cache !== true
        || Number(child.subreceita_cache_versao) < 2
        || txt(child.subreceita_dependencias_assinatura) !== analise.calculado.assinaturaNova
        || txt(child.subreceita_origem_updated_at) !== origemAtualizadaEm
      );
      return markerDivergente || filhosDivergentes;
    };

    const atualizarMetadadosSemRebuild = async (marker: any, analise: any) => {
      const origemAtualizadaEm = atualizadoEm(analise.calculado.source);
      for (const child of analise.existentes) {
        if (
          Number(child.modelo_versao) === 2
          && child.subreceita_cache === true
          && Number(child.subreceita_cache_versao) >= 2
          && txt(child.subreceita_dependencias_assinatura) === analise.calculado.assinaturaNova
          && txt(child.subreceita_origem_updated_at) === origemAtualizadaEm
        ) continue;
        await base44.asServiceRole.entities.IngredienteReceita.update(child.id, {
          modelo_versao: 2,
          subreceita_cache: true,
          subreceita_cache_versao: 2,
          subreceita_dependencias_assinatura: analise.calculado.assinaturaNova,
          subreceita_origem_updated_at: origemAtualizadaEm,
        });
      }

      await base44.asServiceRole.entities.IngredienteReceita.update(marker.id, {
        modelo_versao: 2,
        tipo: 'subreceita',
        ingrediente_id: null,
        ingrediente_nome: null,
        subreceita_cache: false,
        subreceita_modo: 'referencia_cache',
        subreceita_cache_versao: 2,
        subreceita_sincronizacao_status: 'sincronizada',
        subreceita_dependencias_assinatura: analise.calculado.assinaturaNova,
        subreceita_origem_updated_at: origemAtualizadaEm,
      });

      await registrarLog({
        marker_id: marker.id,
        receita_pai_id: marker.receita_id,
        subreceita_id: marker.subreceita_id,
        acao: 'normalizar_status',
        filhos_anteriores: analise.existentes.length,
        filhos_novos: analise.existentes.length,
        assinatura_anterior: analise.assinaturaCache || '',
        assinatura_nova: analise.calculado.assinaturaNova,
        detalhes: JSON.stringify({
          motivo: 'cache_semanticamente_equivalente; metadados atualizados sem reconstrução',
          dependencias: analise.calculado.dependencias,
        }),
      });

      return {
        marker_id: marker.id,
        status: 'sincronizada',
        metadados_atualizados: true,
        filhos_anteriores: analise.existentes.length,
        filhos_novos: analise.existentes.length,
        assinatura: analise.calculado.assinaturaNova,
      };
    };

    const sincronizar = async (marker: any) => {
      const analise = analisarMarker(marker);
      if (!analise.calculado) {
        const status = analise.status;
        await base44.asServiceRole.entities.IngredienteReceita.update(marker.id, {
          subreceita_modo: 'referencia_cache',
          subreceita_sincronizacao_status: status,
        });
        await registrarLog({
          marker_id: marker.id,
          receita_pai_id: marker.receita_id,
          subreceita_id: marker.subreceita_id || '',
          acao: status === 'erro_ciclo' ? 'erro_ciclo' : 'origem_ausente',
          filhos_anteriores: analise.existentes.length,
          filhos_novos: analise.existentes.length,
          assinatura_anterior: analise.assinaturaCache || '',
          assinatura_nova: '',
          detalhes: analise.error?.message || status,
        });
        return { marker_id: marker.id, status, error: analise.error?.message || status };
      }

      const parent = receitaMap.get(marker.receita_id);
      if (!parent) return { marker_id: marker.id, status: 'erro', error: 'Receita-pai não encontrada.' };

      if (analise.status === 'sincronizada') {
        if (metadadosPrecisamAtualizar(marker, analise)) {
          return atualizarMetadadosSemRebuild(marker, analise);
        }
        return {
          marker_id: marker.id,
          status: 'sincronizada',
          ignorado: true,
          filhos_anteriores: analise.existentes.length,
          filhos_novos: analise.existentes.length,
          assinatura: analise.calculado.assinaturaNova,
        };
      }

      const agora = new Date().toISOString();
      const novosPayloads = analise.calculado.children.map((child: any, idx: number) => ({
        ...child,
        receita_id: marker.receita_id,
        subreceita_parent_id: marker.id,
        ordem: (Number(marker.ordem) || 0) + idx + 1,
        is_base: parent.is_base === true,
        usuario_dono_id: parent.is_base === true ? null : (parent.usuario_dono_id || parent.created_by_id || null),
      }));

      // Primeiro cria o novo cache. Só depois de criação bem-sucedida remove o
      // snapshot anterior, evitando perda de dados em falha parcial.
      for (let i = 0; i < novosPayloads.length; i += 200) {
        await base44.asServiceRole.entities.IngredienteReceita.bulkCreate(novosPayloads.slice(i, i + 200));
      }
      for (const antigo of analise.existentes) {
        await base44.asServiceRole.entities.IngredienteReceita.delete(antigo.id);
      }

      const statusFinal = novosPayloads.length > 0 ? 'sincronizada' : 'a_validar';
      await base44.asServiceRole.entities.IngredienteReceita.update(marker.id, {
        modelo_versao: 2,
        tipo: 'subreceita',
        ingrediente_id: null,
        ingrediente_nome: null,
        subreceita_cache: false,
        subreceita_modo: 'referencia_cache',
        subreceita_cache_versao: 2,
        subreceita_sincronizacao_status: statusFinal,
        subreceita_dependencias_assinatura: analise.calculado.assinaturaNova,
        subreceita_origem_updated_at: atualizadoEm(analise.calculado.source),
        subreceita_sincronizada_em: agora,
      });

      await registrarLog({
        marker_id: marker.id,
        receita_pai_id: marker.receita_id,
        subreceita_id: marker.subreceita_id,
        acao: 'sincronizar',
        filhos_anteriores: analise.existentes.length,
        filhos_novos: novosPayloads.length,
        assinatura_anterior: analise.assinaturaCache || '',
        assinatura_nova: analise.calculado.assinaturaNova,
        detalhes: JSON.stringify({
          dependencias: analise.calculado.dependencias,
          alertas: analise.calculado.alertas,
        }),
      });

      return {
        marker_id: marker.id,
        status: statusFinal,
        filhos_anteriores: analise.existentes.length,
        filhos_novos: novosPayloads.length,
        assinatura: analise.calculado.assinaturaNova,
        alertas: analise.calculado.alertas,
      };
    };

    if (migrarPreparacoesExatas) {
      const ingredienteMap = new Map((ingredientes || []).map((i: any) => [i.id, i]));
      const receitasPorNome = new Map<string, any[]>();
      for (const receita of receitas || []) {
        const key = normNome(receita?.nome);
        if (!key) continue;
        if (!receitasPorNome.has(key)) receitasPorNome.set(key, []);
        receitasPorNome.get(key)!.push(receita);
      }

      const candidatos: any[] = [];
      const bloqueados: any[] = [];
      for (const item of itens || []) {
        if (!item || item.tipo !== 'ingrediente' || item.subreceita_parent_id || !item.ingrediente_id) continue;
        const parent = receitaMap.get(item.receita_id);
        const ingrediente = ingredienteMap.get(item.ingrediente_id);
        if (!parent || parent.custo_cache_status !== 'incompleto' || !ingrediente) continue;
        if (Number(ingrediente.preco_por_g_rs) > 0) continue;

        const matches = receitasPorNome.get(normNome(ingrediente.nome)) || [];
        const fontes = matches.filter((r: any) => r.id !== parent.id && r.custo_cache_status === 'atual');
        if (fontes.length !== 1) continue;

        const source = fontes[0];
        const hipotetico = {
          ...item,
          tipo: 'subreceita',
          ingrediente_id: null,
          ingrediente_nome: null,
          subreceita_id: source.id,
          subreceita_nome: source.nome,
          subreceita_modo: 'referencia_cache',
          subreceita_sincronizacao_status: 'pendente',
        };
        const analise = analisarMarker(hipotetico);
        if (!analise.calculado) {
          bloqueados.push({
            item_id: item.id,
            receita_pai_id: parent.id,
            receita_pai_nome: parent.nome,
            ingrediente_id: ingrediente.id,
            ingrediente_nome: ingrediente.nome,
            subreceita_id: source.id,
            subreceita_nome: source.nome,
            motivo: analise.error?.message || analise.status,
          });
          continue;
        }

        candidatos.push({ item, parent, ingrediente, source, hipotetico, filhos: analise.calculado.children.length });
      }

      if (dryRun) {
        return Response.json({
          dry_run: true,
          candidatos: candidatos.length,
          bloqueados: bloqueados.length,
          amostra: candidatos.slice(0, 200).map((c: any) => ({
            item_id: c.item.id,
            receita_pai_id: c.parent.id,
            receita_pai_nome: c.parent.nome,
            ingrediente_id: c.ingrediente.id,
            ingrediente_nome: c.ingrediente.nome,
            subreceita_id: c.source.id,
            subreceita_nome: c.source.nome,
            filhos_previstos: c.filhos,
          })),
          bloqueios: bloqueados.slice(0, 200),
        });
      }

      const resultados: any[] = [];
      for (const c of candidatos) {
        const patch = {
          modelo_versao: 2,
          tipo: 'subreceita',
          ingrediente_id: null,
          ingrediente_nome: null,
          subreceita_id: c.source.id,
          subreceita_nome: c.source.nome,
          subreceita_modo: 'referencia_cache',
          subreceita_sincronizacao_status: 'pendente',
        };
        await base44.asServiceRole.entities.IngredienteReceita.update(c.item.id, patch);
        Object.assign(c.item, patch);
        try {
          resultados.push(await sincronizar(c.item));
        } catch (error: any) {
          resultados.push({ marker_id: c.item.id, status: 'erro', error: error?.message || String(error) });
        }
      }

      return Response.json({
        dry_run: false,
        candidatos: candidatos.length,
        migrados: resultados.filter((r: any) => r.status === 'sincronizada').length,
        bloqueados: bloqueados.length,
        erros: resultados.filter((r: any) => r.status !== 'sincronizada'),
        resultados,
      });
    }

    if (markerId) {
      const marker = itemMap.get(markerId);
      if (!marker || marker.tipo !== 'subreceita') {
        return Response.json({ error: 'Marcador de sub-receita não encontrado.' }, { status: 404 });
      }
      const resultado = await sincronizar(marker);
      return Response.json(resultado, { status: resultado.status === 'erro_ciclo' ? 409 : 200 });
    }

    const markers = (itens || []).filter((i: any) => i.tipo === 'subreceita' && i.subreceita_id);
    const resultados: any[] = [];
    let ignoradosSincronizados = 0;
    let metadadosAtualizados = 0;
    for (const marker of markers) {
      const analise = analisarMarker(marker);
      if (analise.status === 'sincronizada' && !metadadosPrecisamAtualizar(marker, analise)) {
        ignoradosSincronizados++;
        continue;
      }
      try {
        const resultado = await sincronizar(marker);
        if (resultado?.metadados_atualizados) metadadosAtualizados++;
        resultados.push(resultado);
      } catch (error: any) {
        resultados.push({ marker_id: marker.id, status: 'erro', error: error.message });
      }
    }

    return Response.json({
      total_markers: markers.length,
      sincronizados_ja_atualizados: ignoradosSincronizados,
      metadados_atualizados: metadadosAtualizados,
      processados: resultados.length,
      resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
