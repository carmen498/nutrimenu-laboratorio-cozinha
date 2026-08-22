// Disparada por automação agendada (diária). Envia o e-mail para usuários
// em trial cujo data_expiracao é hoje e normaliza assinaturas já vencidas.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { hojeSaoPauloISO, normalizarAssinaturasVencidas } from "../../shared/acessoAssinatura.ts";

const ASSUNTO_PADRAO = "Seu teste gratuito terminou";
const CORPO_PADRAO = `<p>Olá {{nome}}, seu período de teste no Laboratório de Cozinha terminou hoje.</p>
<p>Escolha um plano para continuar usando todas as funcionalidades.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = hojeSaoPauloISO();

    const usuarios = await base44.asServiceRole.entities.User.filter({
      status_assinatura: "trial",
      data_expiracao: hoje,
    });

    let enviados = 0;
    for (const usuario of usuarios) {
      if (!usuario.email) continue;
      const nome = usuario.nome_completo || usuario.full_name || "";
      const { assunto, html } = await renderTemplateEmail(base44, "trial_vencido", nome, ASSUNTO_PADRAO, CORPO_PADRAO);

      const resultado = await sendEmailViaResend(base44, {
        to: usuario.email,
        subject: assunto,
        html,
      });

      await base44.asServiceRole.entities.LogEmail.create({
        destinatario_email: usuario.email,
        tipo: "trial_vencido",
        enviado_em: new Date().toISOString(),
        status: resultado.ok ? "enviado" : "falhou",
        detalhe_erro: resultado.ok ? undefined : (resultado.detalhe_completo || resultado.error),
      });

      if (resultado.ok) enviados++;
    }

    // A data de expiração é inclusiva. Por isso, apenas registros com data anterior
    // a hoje são marcados como vencidos; o usuário mantém acesso durante o último dia.
    const normalizacao = await normalizarAssinaturasVencidas(base44);

    return Response.json({
      processados: usuarios.length,
      enviados,
      normalizacao,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}