import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { hojeSaoPauloISO } from "../../shared/acessoAssinatura.ts";
import { calcularExpiracaoInclusiva } from "../../shared/datasAssinatura.ts";
import { registrarLogEmail } from "../../shared/governancaLogs.ts";
import { VERSAO_TERMOS_ATUAL, VERSAO_PRIVACIDADE_ATUAL } from "../../shared/versaoDocumentosLegais.ts";

const ASSUNTO_PADRAO = "Bem-vindo(a) ao Laboratório de Cozinha";
const CORPO_PADRAO = `<p>Olá {{nome}}, seja bem-vindo(a) à Plataforma ZR!</p>
<p>Seu trial inclui Laboratório de Cozinha + Laboratório de Custos, com 7 dias distintos de uso dentro de uma janela máxima de 30 dias.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "admin") {
      return Response.json({ error: "Administradores não utilizam período de trial" }, { status: 403 });
    }
    const aceiteVigente = (
      user.termos_versao_aceita === VERSAO_TERMOS_ATUAL
      && user.privacidade_versao_aceita === VERSAO_PRIVACIDADE_ATUAL
    );
    if (!aceiteVigente) {
      return Response.json({
        error: "Aceite os Termos de Uso e a Política de Privacidade vigentes antes de iniciar o trial",
        code: "legal_acceptance_required",
      }, { status: 409 });
    }

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
    const dataExpiracao = calcularExpiracaoInclusiva(dataInicio, 30);

    await base44.asServiceRole.entities.User.update(user.id, {
      plano_atual: "trial",
      status_assinatura: "trial",
      data_inicio: dataInicio,
      data_expiracao: dataExpiracao,
      trial_modelo: "7_em_30",
      trial_dias_uso: [],
      ciclo_renovacao: 0
    });

    // O trial da Plataforma ZR libera Cozinha + Custos automaticamente.
    const acessosCustos = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({
      user_id: user.id,
      modulo: "laboratorio_custos",
    });
    if (!(acessosCustos || []).some((a: any) => a.status === "ativo")) {
      await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.create({
        user_id: user.id,
        modulo: "laboratorio_custos",
        status: "ativo",
        modalidade: "trial",
        plano_id: "custos_trial",
        origem: "trial",
        inicio_em: new Date(`${dataInicio}T00:00:00-03:00`).toISOString(),
        fim_em: new Date(`${dataExpiracao}T23:59:59.999-03:00`).toISOString(),
        trial_ativado_em: new Date().toISOString(),
        oferta_versao: "trial-plataforma-7-em-30-v1",
        observacao: "Trial automático compartilhado Cozinha + Custos: 7 dias de uso em até 30 dias.",
      });
    }

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