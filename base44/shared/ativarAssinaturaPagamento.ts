// Módulo compartilhado: ativa a assinatura do usuário (plano_atual, status_assinatura,
// data_expiracao) e dispara o e-mail "Pagamento aprovado" para um Pagamento já aprovado.
// Usado tanto pelo fluxo síncrono (criarPagamentoMercadoPago, quando a Orders API já
// retorna aprovado na criação da order) quanto pelo webhookMercadoPago (aprovação
// assíncrona), para nunca duplicar essa lógica entre os dois fluxos.
//
// IMPORTANTE — idempotência: o chamador é responsável por só invocar esta função uma
// única vez por transação, checando ANTES de chamar que o Pagamento ainda não estava
// "approved". Esta função não faz essa checagem — apenas executa a ativação.

import { sendEmailViaResend } from "./resendEmail.ts";
import { renderTemplateEmail } from "./templateEmail.ts";
import { enviarNotificacaoWhatsapp } from "./notificarWascript.ts";

const DIAS_PLANO: Record<string, number> = { diario: 1, mensal: 30, anual: 365 };
const NOME_PLANO: Record<string, string> = { diario: "Diário", mensal: "Mensal", anual: "Anual" };

export async function ativarPlanoEEnviarEmail(base44: any, pagamento: { plano: string; usuario_id: string }): Promise<void> {
  const dias = DIAS_PLANO[pagamento.plano] ?? 30;
  const agora = new Date();
  const expiracao = new Date(agora.getTime() + dias * 86400000);
  const dataExpiracaoFormatada = expiracao.toISOString().split("T")[0];

  await base44.asServiceRole.entities.User.update(pagamento.usuario_id, {
    status_assinatura: "ativo",
    plano_atual: pagamento.plano,
    data_inicio: agora.toISOString().split("T")[0],
    data_expiracao: dataExpiracaoFormatada,
  });

  const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  if (!usuario) return;

  if (usuario.email) {
    const nome = usuario.nome_completo || usuario.full_name || "";
    const defaultAssunto = "Pagamento aprovado";
    const defaultCorpo = `<p>Olá {{nome}}, seu pagamento foi aprovado com sucesso!</p><p>Seu plano no Laboratório de Cozinha já está ativo. Bom uso!</p>`;

    const [ano, mes, dia] = dataExpiracaoFormatada.split("-");
    const dataExpiracaoBR = `${dia}/${mes}/${ano}`;
    const nomePlano = NOME_PLANO[pagamento.plano] || pagamento.plano;

    const { assunto, html, ativo } = await renderTemplateEmail(base44, "pagamento_aprovado", nome, defaultAssunto, defaultCorpo, {
      plano: nomePlano,
      data_expiracao: dataExpiracaoBR,
    });

    if (ativo) {
      const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
      await base44.asServiceRole.entities.LogEmail.create({
        destinatario_email: usuario.email,
        tipo: "pagamento_aprovado",
        enviado_em: new Date().toISOString(),
        status: resultado.ok ? "enviado" : "falhou",
        detalhe_erro: resultado.ok ? undefined : (resultado.detalhe_completo || resultado.error),
      });
    } else {
      console.log('Template "pagamento_aprovado" está em rascunho — e-mail não enviado.');
    }
  }

  await enviarNotificacaoWhatsapp(base44, "pagamento_aprovado", usuario).catch((e: any) =>
    console.log("Falha ao enviar WhatsApp de pagamento aprovado:", e.message)
  );
}