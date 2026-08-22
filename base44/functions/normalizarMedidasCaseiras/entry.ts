import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Fase 7.1 — normalização não destrutiva de MedidaCaseira.
// Promove para modelo_versao=2 apenas registros com referências canônicas
// verificáveis e sem conflito de estado/duplicidade. Não apaga campos legados.

const positivo = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [medidas, ingredientes, utensilios] = await Promise.all([
      base44.asServiceRole.entities.MedidaCaseira.list('-created_date', 10000),
      base44.asServiceRole.entities.Ingrediente.list('nome', 10000),
      base44.asServiceRole.entities.UtensilioPadrao.list('simbolo', 2000),
    ]);

    const ingredienteIds = new Set((ingredientes || []).map((i: any) => i.id));
    const utensilioIds = new Set((utensilios || []).map((u: any) => u.id));

    const candidatos: any[] = [];
    const aRevisar: any[] = [];
    const chaveContagem = new Map<string, number>();

    for (const mc of medidas || []) {
      const ingredienteId = mc.ingrediente_id || mc.alimento || '';
      const utensilioId = mc.utensilio_id || mc.utensilio || '';
      const estado = ['cru', 'pronto', 'não informado'].includes(mc.estado_alimento)
        ? mc.estado_alimento
        : 'não informado';
      const quantidade = positivo(mc.quantidade_utensilio) || 1;
      const pesoPorMedida = positivo(mc.peso_g)
        ? positivo(mc.peso_g) / quantidade
        : (positivo(mc.referencia_g) || positivo(mc.equivalencia_g));
      const volumePorMedida = positivo(mc.volume_ml)
        ? positivo(mc.volume_ml) / quantidade
        : positivo(mc.equivalencia_ml);
      const problemas: string[] = [];

      if (!ingredienteId || !ingredienteIds.has(ingredienteId)) problemas.push('ingrediente_id_ausente_ou_invalido');
      if (!mc.so_gramas && (!utensilioId || !utensilioIds.has(utensilioId))) problemas.push('utensilio_id_ausente_ou_invalido');
      if (!mc.so_gramas && !pesoPorMedida && !volumePorMedida) problemas.push('sem_equivalencia_fisica');
      if (positivo(mc.medida_pronto_g)) problemas.push('medida_pronto_legada_a_separar');

      const chave = `${ingredienteId || '*'}|${mc.so_gramas ? '*' : (utensilioId || '*')}|${estado}`;
      chaveContagem.set(chave, (chaveContagem.get(chave) || 0) + 1);
      candidatos.push({ mc, ingredienteId, utensilioId, estado, quantidade, pesoPorMedida, volumePorMedida, chave, problemas });
    }

    const updates: any[] = [];
    for (const c of candidatos) {
      const problemas = [...c.problemas];
      if ((chaveContagem.get(c.chave) || 0) > 1) problemas.push('chave_canonica_duplicada');

      if (problemas.length > 0) {
        aRevisar.push({
          id: c.mc.id,
          nome: c.mc.nome || '',
          ingrediente_id: c.ingredienteId || null,
          utensilio_id: c.utensilioId || null,
          estado_alimento: c.estado,
          problemas,
        });
        continue;
      }

      const patch: any = {
        id: c.mc.id,
        modelo_versao: 2,
        chave_canonica: c.chave,
        ingrediente_id: c.ingredienteId,
        utensilio_id: c.mc.so_gramas ? '' : c.utensilioId,
        quantidade_utensilio: c.quantidade,
        estado_alimento: c.estado,
        fonte: c.mc.fonte || 'Legado normalizado',
        so_gramas: !!c.mc.so_gramas,
      };
      if (c.pesoPorMedida) {
        patch.peso_g = c.pesoPorMedida * c.quantidade;
        patch.referencia_g = c.pesoPorMedida;
      }
      if (c.volumePorMedida) patch.volume_ml = c.volumePorMedida * c.quantidade;

      const mudou = Object.entries(patch).some(([k, v]) => k !== 'id' && c.mc[k] !== v);
      if (mudou) updates.push(patch);
    }

    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.MedidaCaseira.bulkUpdate(updates.slice(i, i + 500));
    }

    await base44.asServiceRole.entities.SaneamentoMedidaCaseiraLog.create({
      acao: 'normalizar',
      ingrediente_receita_atualizados: 0,
      detalhes_json: JSON.stringify({
        total_processado: (medidas || []).length,
        total_normalizado: updates.length,
        total_a_revisar: aRevisar.length,
      }),
      executado_por_id: user.id,
      executado_em: new Date().toISOString(),
    });

    return Response.json({
      total_processado: (medidas || []).length,
      total_normalizado: updates.length,
      total_a_revisar: aRevisar.length,
      a_revisar: aRevisar.slice(0, 500),
      truncado: aRevisar.length > 500,
      observacao: 'Nenhuma referência foi inferida por nome e nenhum medida_pronto_g foi convertido automaticamente.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
