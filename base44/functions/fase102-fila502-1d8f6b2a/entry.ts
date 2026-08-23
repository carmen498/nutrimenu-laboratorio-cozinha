import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') === 'apply' ? 'apply' : 'dry_run';
    const invoke = async (name: string, args: Record<string, any>) => {
      const res = await base44.asServiceRole.functions.invoke(name, args);
      return res?.data ?? res;
    };
    const saneamento = await invoke('sanearCustosPendentes', { dry_run: mode !== 'apply' });
    let recalculo = null;
    if (mode === 'apply') recalculo = await invoke('normalizarCustosReceitas', { dry_run: false, somente_incompletas: true });
    return Response.json({ mode, saneamento, recalculo });
  } catch (e: any) {
    return Response.json({ error: e?.response?.data || e?.message || String(e) }, { status: 500 });
  }
});