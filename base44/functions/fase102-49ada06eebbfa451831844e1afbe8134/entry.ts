import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const body = await req.json().catch(() => ({}));
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
