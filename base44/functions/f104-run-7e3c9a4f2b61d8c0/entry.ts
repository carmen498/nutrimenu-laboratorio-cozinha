import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

// Executor efêmero Fase 10.4. Remover após dry-run/apply.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    if (mode !== 'dry-run' && mode !== 'apply') {
      return Response.json({ error: 'mode inválido' }, { status: 400 });
    }
    const result = await base44.asServiceRole.functions.invoke('normalizarCustosReceitas', {
      dry_run: mode === 'dry-run',
    });
    return Response.json({ mode, result: result?.data || result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
