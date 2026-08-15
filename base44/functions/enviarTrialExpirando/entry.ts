// Disparada por automação agendada (diária). Envia o e-mail de aviso para
// usuários em trial cujo data_expiracao é dentro de 2 dias, e registra em LogEmail.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";

const ASSUNTO_PADRAO = "Seu teste gratuito está acabando";
const CORPO_PADRAO = `<p>Olá {{nome}}, seu período de teste no Laboratório de Cozinha termina em 2 dias.</p>
<p>Não perca o acesso — escolha um plano para continuar.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const alvo = new Date();
    alvo.setDate(alvo.getDate() + 2);
    const dataAlvo = alvo.toISOString().split('T')[0];

    const usuarios = await base44.asServiceRole.entities.User.filter({
      status_assinatura: "trial",
      data_expiracao: dataAlvo,
    });

    let enviados = 0;
    for (const usuario of usuarios) {
      if (!usuario.email) continue;
      const nome = usuario.nome_completo || usuario.full_name || "";
      const { assunto, html } = await renderTemplateEmail(base44, "trial_expirando", nome, ASSUNTO_PADRAO, CORPO_PADRAO);

      const resultado = await sendEmailViaResend(base44, {
        to: usuario.email,
        subject: assunto,
        html,
      });

      await base44.asServiceRole.entities.LogEmail.create({
        destinatario_email: usuario.email,
        tipo: "trial_expirando",
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