// Disparada por automação agendada (diária). Envia o e-mail para usuários
// em trial cujo data_expiracao é hoje, e registra em LogEmail.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = new Date().toISOString().split('T')[0];

    const usuarios = await base44.asServiceRole.entities.User.filter({
      status_assinatura: "trial",
      data_expiracao: hoje,
    });

    let enviados = 0;
    for (const usuario of usuarios) {
      if (!usuario.email) continue;
      const nome = usuario.nome_completo || usuario.full_name || "";
      const html = `<p>Olá${nome ? " " + nome : ""}, seu período de teste no Laboratório de Cozinha terminou hoje.</p>
<p>Escolha um plano para continuar usando todas as funcionalidades.</p>`;

      const resultado = await sendEmailViaResend({
        to: usuario.email,
        subject: "Seu teste gratuito terminou",
        html,
      });

      await base44.asServiceRole.entities.LogEmail.create({
        destinatario_email: usuario.email,
        tipo: "trial_vencido",
        enviado_em: new Date().toISOString(),
        status: resultado.ok ? "enviado" : "falhou",
      });

      if (resultado.ok) enviados++;
    }

    return Response.json({ processados: usuarios.length, enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}