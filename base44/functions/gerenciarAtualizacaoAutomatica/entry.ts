import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const acao = body.acao || 'status';

    // Consultar o status é permitido a usuários autenticados; qualquer alteração
    // na configuração global de preços é exclusiva de administradores.
    if (acao !== 'status' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create config record. A criação também é mudança global e, portanto,
    // só pode acontecer para admin. Para usuários comuns sem configuração ainda,
    // apenas devolve status inativo.
    const configs = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({ chave: 'auto_update_prices' });
    let config = configs[0];

    if (!config) {
      if (user.role !== 'admin') {
        return Response.json({ ativa: false });
      }
      config = await base44.asServiceRole.entities.ConfiguracaoSistema.create({
        chave: 'auto_update_prices',
        valor: 'false'
      });
    }

    if (acao === 'toggle') {
      const currentValue = config.valor === 'true';
      config = await base44.asServiceRole.entities.ConfiguracaoSistema.update(config.id, {
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