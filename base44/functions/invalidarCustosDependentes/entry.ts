import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

// Fase 10.3 — endpoint autenticado de invalidação automática.
// - receita_ids: permitido para admin ou dono da receita pessoal;
// - ingrediente_ids: admin-only, pois altera impacto de preço/FC mestre global.

const txt = (v: any) => v == null ? '' : String(v).trim();
const uniq = (values: any[]) => [...new Set((values || []).map(txt).filter(Boolean))];
const ownerId = (receita: any) => txt(receita?.usuario_dono_id) || txt(receita?.created_by_id);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const receitaIds = uniq(body?.receita_ids || []);
    const ingredienteIds = uniq(body?.ingrediente_ids || []);
    if (!receitaIds.length && !ingredienteIds.length) {
      return Response.json({ error: 'Informe receita_ids e/ou ingrediente_ids.' }, { status: 400 });
    }
    if (ingredienteIds.length && user.role !== 'admin') {
      return Response.json({ error: 'Somente administradores podem invalidar por ingrediente mestre.' }, { status: 403 });
    }

    const sr = base44.asServiceRole.entities;
    const podeInvalidar = (receita: any) => user.role === 'admin'
      || (receita?.is_base === false && ownerId(receita) === txt(user.id));

    // Raízes explícitas devem estar no escopo do usuário; a propagação posterior
    // também é limitada pelo mesmo predicado.
    for (const id of receitaIds) {
      const receita = await sr.Receita.get(id).catch(() => null);
      if (!podeInvalidar(receita)) {
        return Response.json({ error: `Receita sem permissão para invalidação: ${id}` }, { status: 403 });
      }
    }

    const resultado = await invalidarCustosPorDependencias({
      entities: sr,
      receitaIds,
      ingredienteIds,
      motivo: txt(body?.motivo) || 'alteracao_dependencia_custo',
      origem: txt(body?.origem) || 'aplicacao',
      podeInvalidar,
    });

    return Response.json({ ok: true, ...resultado });
  } catch (error: any) {
    console.error('invalidarCustosDependentes', error);
    return Response.json({ error: error?.message || 'Erro ao invalidar custos.' }, { status: 500 });
  }
});
