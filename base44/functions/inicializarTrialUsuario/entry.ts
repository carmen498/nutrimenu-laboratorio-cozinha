import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const hoje = new Date();
    const expiracao = new Date(hoje);
    expiracao.setDate(expiracao.getDate() + 7);

    const dataInicio = hoje.toISOString().split('T')[0];
    const dataExpiracao = expiracao.toISOString().split('T')[0];

    await base44.asServiceRole.entities.User.update(user.id, {
      plano_atual: "trial",
      status_assinatura: "trial",
      data_inicio: dataInicio,
      data_expiracao: dataExpiracao,
      ciclo_renovacao: 0
    });

    return Response.json({ success: true, userId: user.id, dataInicio, dataExpiracao });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}