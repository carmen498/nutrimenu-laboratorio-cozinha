import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

// Executor efêmero somente dry-run da Fase 10.4.1. Remover após a leitura.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.functions.invoke('sanearDivergenciasIngredienteNomeId', { dry_run: true });
    return Response.json({ result: result?.data || result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
