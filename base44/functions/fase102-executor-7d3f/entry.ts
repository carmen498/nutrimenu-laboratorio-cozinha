import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SEGREDO = 'jCcUGb3r7C2UvpPZcs4momcqRsgdG0HVRkSIsUJK7rDBdsmO8JZz5fTGhBmzUXxX';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const body = await req.json().catch(() => ({}));
    if (body?.secret !== SEGREDO) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const mode = body?.mode === 'apply' ? 'apply' : 'dry_run';
    const base44 = createClientFromRequest(req);

    const chamar = async (name: string, args: Record<string, any>) => {
      const res = await base44.asServiceRole.functions.invoke(name, args);
      return res?.data ?? res;
    };

    const preparacoes = await chamar('sincronizarSubreceita', {
      migrar_preparacoes_exatas: true,
      dry_run: mode !== 'apply',
    });

    const saneamento = await chamar('sanearCustosPendentes', {
      dry_run: mode !== 'apply',
    });

    const recalculo = await chamar('normalizarCustosReceitas', {
      dry_run: mode !== 'apply',
      somente_incompletas: true,
    });

    return Response.json({ mode, preparacoes, saneamento, recalculo });
  } catch (error) {
    return Response.json({ error: error?.message || String(error), stack: error?.stack || null }, { status: 500 });
  }
});
