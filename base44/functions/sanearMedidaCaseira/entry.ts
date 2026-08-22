import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const positivo = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const estadoValido = (v: unknown) => ['cru', 'pronto', 'não informado'].includes(String(v));

const ingredienteId = (m: any) => m?.ingrediente_id || m?.alimento || '';
const utensilioId = (m: any) => m?.utensilio_id || m?.utensilio || '';
const estado = (m: any) => estadoValido(m?.estado_alimento) ? m.estado_alimento : 'não informado';
const chave = (m: any) => `${ingredienteId(m) || '*'}|${utensilioId(m) || '*'}|${estado(m)}`;
const pesoPorMedida = (m: any) => {
  const qtd = positivo(m?.quantidade_utensilio) || 1;
  if (positivo(m?.peso_g)) return positivo(m.peso_g) / qtd;
  return positivo(m?.referencia_g) || positivo(m?.equivalencia_g) || 0;
};

async function registrarLog(base44: any, user: any, dados: any) {
  await base44.asServiceRole.entities.SaneamentoMedidaCaseiraLog.create({
    ...dados,
    executado_por_id: user.id,
    executado_em: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const acao = body?.acao;
    if (!acao) return Response.json({ error: 'acao é obrigatória' }, { status: 400 });

    if (acao === 'corrigir') {
      const medidaId = String(body.medida_id || '');
      if (!medidaId) return Response.json({ error: 'medida_id é obrigatório' }, { status: 400 });

      const atual = await base44.asServiceRole.entities.MedidaCaseira.get(medidaId);
      if (!atual) return Response.json({ error: 'Medida não encontrada' }, { status: 404 });

      const novoIngredienteId = String(body.ingrediente_id || '');
      const novoUtensilioId = String(body.utensilio_id || '');
      const novoEstado = estadoValido(body.estado_alimento) ? body.estado_alimento : 'não informado';
      const soGramas = !!body.so_gramas;
      const qtd = positivo(body.quantidade_utensilio) || 1;
      const peso = positivo(body.peso_g);
      const volume = positivo(body.volume_ml);

      if (!novoIngredienteId) return Response.json({ error: 'ingrediente_id é obrigatório' }, { status: 400 });
      if (!soGramas && !novoUtensilioId) return Response.json({ error: 'utensilio_id é obrigatório' }, { status: 400 });
      if (!soGramas && !peso && !volume) return Response.json({ error: 'Informe peso_g ou volume_ml' }, { status: 400 });

      const [ing, ute, medidas] = await Promise.all([
        base44.asServiceRole.entities.Ingrediente.get(novoIngredienteId),
        novoUtensilioId ? base44.asServiceRole.entities.UtensilioPadrao.get(novoUtensilioId) : Promise.resolve(null),
        base44.asServiceRole.entities.MedidaCaseira.list('-created_date', 10000),
      ]);
      if (!ing) return Response.json({ error: 'Ingrediente não encontrado' }, { status: 400 });
      if (!soGramas && !ute) return Response.json({ error: 'Utensílio não encontrado' }, { status: 400 });

      const novaChave = `${novoIngredienteId}|${soGramas ? '*' : novoUtensilioId}|${novoEstado}`;
      const conflito = (medidas || []).find((m: any) => m.id !== medidaId && chave({
        ...m,
        ingrediente_id: ingredienteId(m),
        utensilio_id: utensilioId(m),
        estado_alimento: estado(m),
      }) === novaChave);
      if (conflito) {
        return Response.json({
          error: 'Já existe outra medida com a mesma chave canônica. Use Consolidação de duplicidades.',
          conflito_id: conflito.id,
        }, { status: 409 });
      }

      const patch: any = {
        modelo_versao: 2,
        ingrediente_id: novoIngredienteId,
        utensilio_id: soGramas ? '' : novoUtensilioId,
        quantidade_utensilio: qtd,
        peso_g: peso || null,
        volume_ml: volume || null,
        estado_alimento: novoEstado,
        so_gramas: soGramas,
        fonte: String(body.fonte || atual.fonte || 'Saneamento manual'),
        chave_canonica: novaChave,
        referencia_g: peso ? peso / qtd : null,
      };
      await base44.asServiceRole.entities.MedidaCaseira.update(medidaId, patch);
      await registrarLog(base44, user, {
        acao: 'corrigir',
        medida_origem_id: medidaId,
        medida_destino_id: medidaId,
        ingrediente_receita_atualizados: 0,
        detalhes_json: JSON.stringify({ antes: atual, depois: patch }),
      });
      return Response.json({ ok: true, medida_id: medidaId, chave_canonica: novaChave });
    }

    if (acao === 'separar_pronto') {
      const medidaId = String(body.medida_id || '');
      if (!medidaId) return Response.json({ error: 'medida_id é obrigatório' }, { status: 400 });
      const atual = await base44.asServiceRole.entities.MedidaCaseira.get(medidaId);
      if (!atual) return Response.json({ error: 'Medida não encontrada' }, { status: 404 });

      const prontoG = positivo(atual.medida_pronto_g);
      if (!prontoG) return Response.json({ error: 'Registro não possui medida_pronto_g válida' }, { status: 400 });
      if (estado(atual) === 'pronto') {
        return Response.json({ error: 'O registro de origem já está marcado como pronto; revise manualmente antes de separar.' }, { status: 409 });
      }

      const ingId = ingredienteId(atual);
      const uteId = utensilioId(atual);
      if (!ingId || !uteId) return Response.json({ error: 'Ingrediente e utensílio precisam estar vinculados antes da separação.' }, { status: 400 });

      const medidas = await base44.asServiceRole.entities.MedidaCaseira.list('-created_date', 10000);
      const chavePronto = `${ingId}|${uteId}|pronto`;
      const existentePronto = (medidas || []).find((m: any) => m.id !== medidaId && chave(m) === chavePronto);
      if (existentePronto) {
        return Response.json({
          error: 'Já existe uma medida pronta para este ingrediente e utensílio. Consolide/revise antes de separar.',
          conflito_id: existentePronto.id,
        }, { status: 409 });
      }

      const qtd = positivo(atual.quantidade_utensilio) || 1;
      const origemEstado = estado(atual) === 'não informado' ? 'cru' : estado(atual);
      const origemPeso = pesoPorMedida(atual);

      const pronto = await base44.asServiceRole.entities.MedidaCaseira.create({
        modelo_versao: 2,
        nome: `${atual.nome || 'Medida'} · pronto`,
        chave_canonica: chavePronto,
        ingrediente_id: ingId,
        utensilio_id: uteId,
        quantidade_utensilio: qtd,
        peso_g: prontoG * qtd,
        referencia_g: prontoG,
        estado_alimento: 'pronto',
        fonte: atual.fonte ? `${atual.fonte} · separado do legado` : 'Saneamento 7.1 · separado do legado',
        so_gramas: !!atual.so_gramas,
        descricao: atual.descricao || '',
      });

      const origemPatch: any = {
        modelo_versao: 2,
        ingrediente_id: ingId,
        utensilio_id: atual.so_gramas ? '' : uteId,
        quantidade_utensilio: qtd,
        estado_alimento: origemEstado,
        chave_canonica: `${ingId}|${atual.so_gramas ? '*' : uteId}|${origemEstado}`,
        medida_pronto_g: 0,
      };
      if (origemPeso) {
        origemPatch.peso_g = origemPeso * qtd;
        origemPatch.referencia_g = origemPeso;
      }
      await base44.asServiceRole.entities.MedidaCaseira.update(medidaId, origemPatch);

      await registrarLog(base44, user, {
        acao: 'separar_pronto',
        medida_origem_id: medidaId,
        medida_destino_id: pronto.id,
        ingrediente_receita_atualizados: 0,
        detalhes_json: JSON.stringify({ medida_pronto_g: prontoG, origem_estado: origemEstado, destino_estado: 'pronto' }),
      });
      return Response.json({ ok: true, medida_origem_id: medidaId, medida_pronto_id: pronto.id });
    }

    if (acao === 'consolidar_duplicados') {
      const manterId = String(body.manter_id || '');
      const removerIds = Array.isArray(body.remover_ids)
        ? [...new Set(body.remover_ids.map((x: any) => String(x)).filter(Boolean))]
        : [];
      if (!manterId || removerIds.length === 0) {
        return Response.json({ error: 'manter_id e remover_ids são obrigatórios' }, { status: 400 });
      }
      if (removerIds.includes(manterId)) return Response.json({ error: 'manter_id não pode estar em remover_ids' }, { status: 400 });

      const medidas = await base44.asServiceRole.entities.MedidaCaseira.list('-created_date', 10000);
      const map = new Map((medidas || []).map((m: any) => [m.id, m]));
      const manter = map.get(manterId);
      const remover = removerIds.map((id: string) => map.get(id)).filter(Boolean);
      if (!manter || remover.length !== removerIds.length) return Response.json({ error: 'Uma ou mais medidas não foram encontradas' }, { status: 404 });

      const chaveManter = chave(manter);
      const chavesDiferentes = remover.filter((m: any) => chave(m) !== chaveManter);
      if (chavesDiferentes.length > 0) {
        return Response.json({ error: 'Só é permitido consolidar registros com a mesma chave canônica.' }, { status: 409 });
      }

      const itens = await base44.asServiceRole.entities.IngredienteReceita.list('-created_date', 10000);
      const removerSet = new Set(removerIds);
      const refs = (itens || []).filter((i: any) => removerSet.has(i.medida_caseira_id));
      const updates = refs.map((i: any) => ({ id: i.id, medida_caseira_id: manterId }));
      for (let i = 0; i < updates.length; i += 500) {
        await base44.asServiceRole.entities.IngredienteReceita.bulkUpdate(updates.slice(i, i + 500));
      }
      for (const id of removerIds) {
        await base44.asServiceRole.entities.MedidaCaseira.delete(id);
      }

      await registrarLog(base44, user, {
        acao: 'consolidar_duplicados',
        medida_origem_id: manterId,
        medida_destino_id: manterId,
        medidas_removidas_ids: removerIds,
        ingrediente_receita_atualizados: updates.length,
        detalhes_json: JSON.stringify({ chave_canonica: chaveManter, removidos: removerIds }),
      });
      return Response.json({
        ok: true,
        medida_mantida_id: manterId,
        medidas_removidas: removerIds.length,
        ingrediente_receita_atualizados: updates.length,
      });
    }

    return Response.json({ error: `Ação não suportada: ${acao}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
