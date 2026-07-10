import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const acao = body.acao || 'status';

    // Get or create config record
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ chave: 'auto_update_prices' });
    let config = configs[0];

    if (!config) {
      config = await base44.asServiceRole.entities.AppConfig.create({
        chave: 'auto_update_prices',
        valor: 'false'
      });
    }

    if (acao === 'toggle') {
      const currentValue = config.valor === 'true';
      config = await base44.asServiceRole.entities.AppConfig.update(config.id, {
        valor: String(!currentValue)
      });
    }

    return Response.json({
      ativa: config.valor === 'true'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});