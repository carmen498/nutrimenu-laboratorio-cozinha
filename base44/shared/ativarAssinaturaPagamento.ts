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
import { hojeSaoPauloISO } from "./acessoAssinatura.ts";
import { registrarLogEmail } from "./governancaLogs.ts";

const DIAS_PLANO: Record<string, number> = { diario: 1, mensal: 30, anual: 365 };
const NOME_PLANO: Record<string, string> = { diario: "Diário", mensal: "30 dias", anual: "Anual" };

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().split("T")[0];
}

export async function ativarPlanoEEnviarEmail(base44: any, pagamento: { plano: string; usuario_id: string }): Promise<void> {
  const dias = DIAS_PLANO[pagamento.plano] ?? 30;
  const dataInicio = hojeSaoPauloISO();
  const dataExpiracaoFormatada = somarDiasISO(dataInicio, dias);

  await base44.asServiceRole.entities.User.update(pagamento.usuario_id, {
    status_assinatura: "ativo",
    plano_atual: pagamento.plano,
    data_inicio: dataInicio,
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
      await registrarLogEmail(base44, {
        usuarioId: usuario.id,
        email: usuario.email,
        tipo: "pagamento_aprovado",
        resultado,
      });
    } else {
      console.log('Template "pagamento_aprovado" está em rascunho — e-mail não enviado.');
    }
  }

  await enviarNotificacaoWhatsapp(base44, "pagamento_aprovado", usuario).catch((e: any) =>
    console.log("Falha ao enviar WhatsApp de pagamento aprovado:", e.message)
  );
}