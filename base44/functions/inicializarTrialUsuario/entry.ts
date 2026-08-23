import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { hojeSaoPauloISO } from "../../shared/acessoAssinatura.ts";
import { calcularExpiracaoInclusiva } from "../../shared/datasAssinatura.ts";
import { registrarLogEmail } from "../../shared/governancaLogs.ts";

const ASSUNTO_PADRAO = "Bem-vindo(a) ao Laboratório de Cozinha";
const CORPO_PADRAO = `<p>Olá {{nome}}, seja bem-vindo(a) ao Laboratório de Cozinha!</p>
<p>Seu período de teste gratuito já começou. Explore receitas, cardápios e a gestão de custos da sua cozinha.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // O trial só pode ser concedido a uma conta realmente nova, antes de qualquer
    // histórico de plano. A proteção deliberadamente não depende de um novo campo
    // de schema para não quebrar usuários já existentes no Base44.
    const jaPossuiHistoricoDePlano = Boolean(
      user.plano_atual ||
      user.status_assinatura ||
      user.data_inicio ||
      user.data_expiracao ||
      Number(user.ciclo_renovacao || 0) > 0
    );

    if (jaPossuiHistoricoDePlano) {
      return Response.json(
        {
          error: "Trial já utilizado ou conta com histórico de assinatura",
          code: "trial_already_used",
        },
        { status: 409 },
      );
    }

    const dataInicio = hojeSaoPauloISO();
    const dataExpiracao = calcularExpiracaoInclusiva(dataInicio, 7);

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
      const { assunto, html, ativo } = await renderTemplateEmail(base44, "boas_vindas", nome, ASSUNTO_PADRAO, CORPO_PADRAO);

      if (ativo) {
        const resultadoEmail = await sendEmailViaResend(base44, {
          to: user.email,
          subject: assunto,
          html,
        });

        await registrarLogEmail(base44, {
          usuarioId: user.id,
          email: user.email,
          tipo: "boas_vindas",
          resultado: resultadoEmail,
        });
      } else {
        console.log('Template "boas_vindas" está em rascunho — e-mail não enviado.');
      }
    }

    return Response.json({ success: true, userId: user.id, dataInicio, dataExpiracao });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}