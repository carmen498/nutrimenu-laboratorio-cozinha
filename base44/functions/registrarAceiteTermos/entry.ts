import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const VERSAO_TERMOS = "Termos de Uso v.18/08/2026";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Preserva o primeiro aceite registrado. Nova versão de termos deve ter um
    // fluxo explícito de reaceite, em vez de sobrescrever silenciosamente a prova anterior.
    if (user.termos_aceitos_em && user.termos_versao_aceita) {
      return Response.json({
        success: true,
        already_recorded: true,
        versao: user.termos_versao_aceita,
      });
    }

    const aceitoEm = new Date().toISOString();
    await base44.asServiceRole.entities.User.update(user.id, {
      termos_aceitos_em: aceitoEm,
      termos_versao_aceita: VERSAO_TERMOS,
    });

    return Response.json({
      success: true,
      already_recorded: false,
      aceito_em: aceitoEm,
      versao: VERSAO_TERMOS,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
