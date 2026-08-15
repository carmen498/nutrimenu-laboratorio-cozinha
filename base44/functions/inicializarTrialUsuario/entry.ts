import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";

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

    // Envia o e-mail de boas-vindas via Resend (este é o momento real de criação
    // da conta — a entidade User embutida não suporta automação de "create").
    if (user.email) {
      const nome = user.nome_completo || user.full_name || "";
      const html = `<p>Olá${nome ? " " + nome : ""}, seja bem-vindo(a) ao Laboratório de Cozinha!</p>
<p>Seu período de teste gratuito já começou. Explore receitas, cardápios e a gestão de custos da sua cozinha.</p>`;

      const resultadoEmail = await sendEmailViaResend({
        to: user.email,
        subject: "Bem-vindo(a) ao Laboratório de Cozinha",
        html,
      });

      await base44.asServiceRole.entities.LogEmail.create({
        destinatario_email: user.email,
        tipo: "boas_vindas",
        enviado_em: new Date().toISOString(),
        status: resultadoEmail.ok ? "enviado" : "falhou",
      });
    }

    return Response.json({ success: true, userId: user.id, dataInicio, dataExpiracao });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}