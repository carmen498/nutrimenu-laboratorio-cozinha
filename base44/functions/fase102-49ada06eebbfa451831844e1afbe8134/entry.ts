import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const requestedMode = body?.mode || url.searchParams.get('mode');
    const mode = requestedMode === 'apply' ? 'apply' : 'dry_run';
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
