import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') === 'apply' ? 'apply' : 'dry_run';
    const base44 = createClientFromRequest(req);
    const r = await base44.asServiceRole.functions.invoke('normalizarCustosReceitas', {
      dry_run: mode !== 'apply',
      somente_incompletas: true,
    });
    return Response.json({ mode, recalculo: r?.data ?? r });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});
