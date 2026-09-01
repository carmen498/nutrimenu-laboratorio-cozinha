import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const modelos = await base44.asServiceRole.entities.Planejamento.filter(
      { is_modelo: true },
      "-updated_date",
      1,
    );

    return Response.json({ modelo: modelos?.[0] || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
