// Módulo compartilhado: ativa a assinatura do usuário (plano_atual, status_assinatura,
// data_expiracao) e dispara o e-mail "Pagamento aprovado" para um Pagamento já aprovado.
// Usado tanto pelo fluxo síncrono (criarPagamentoMercadoPago, quando a Orders API já
// retorna aprovado na criação da order) quanto pelo webhookMercadoPago (aprovação
// assíncrona), para nunca duplicar essa lógica entre os dois fluxos.
//
// IMPORTANTE — idempotência: o chamador é responsável por só invocar esta função uma
// única vez por transação, checando ANTES de chamar que o Pagamento ainda não estava
// "approved". O ID do pagamento aprovado é salvo no User para impedir que um estorno
// antigo derrube uma assinatura mais nova.

import { sendEmailViaResend } from "./resendEmail.ts";
import { renderTemplateEmail } from "./templateEmail.ts";
import { enviarNotificacaoWhatsapp } from "./notificarWascript.ts";
import { hojeSaoPauloISO } from "./acessoAssinatura.ts";
import { calcularExpiracaoInclusiva } from "./datasAssinatura.ts";
import { registrarLogEmail } from "./governancaLogs.ts";
import { proximoCicloRenovacao } from "./regraRenovacao.ts";

const DIAS_PLANO: Record<string, number> = { diario: 1, mensal: 30, anual: 365, renovacao: 365 };
const NOME_PLANO: Record<string, string> = { diario: "Diário", mensal: "30 dias", anual: "Anual", renovacao: "Renovação anual" };
const ASSUNTO_BOAS_VINDAS = "Bem-vindo(a) ao Laboratório de Cozinha";
const CORPO_BOAS_VINDAS = `<p>Olá {{nome}}, seja bem-vindo(a) ao Laboratório de Cozinha!</p><p>Explore receitas, cardápios e a gestão de custos da sua cozinha.</p>`;

async function enviarBoasVindasSeNecessario(base44: any, usuario: any): Promise<void> {
  if (!usuario?.email) return;
  const enviosAnteriores = await base44.asServiceRole.entities.LogEmail.filter({
    usuario_id: usuario.id,
    tipo: "boas_vindas",
    status: "enviado",
  });
  if (enviosAnteriores?.length) return;

  const nome = usuario.nome_completo || usuario.full_name || "";
  const { assunto, html, ativo } = await renderTemplateEmail(
    base44, "boas_vindas", nome, ASSUNTO_BOAS_VINDAS, CORPO_BOAS_VINDAS,
  );
  if (!ativo) return;

  const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
  await registrarLogEmail(base44, {
    usuarioId: usuario.id,
    email: usuario.email,
    tipo: "boas_vindas",
    resultado,
  });
}

export async function ativarPlanoEEnviarEmail(base44: any, pagamento: { id?: string; plano: string; usuario_id: string }): Promise<void> {
  const dias = DIAS_PLANO[pagamento.plano] ?? 30;
  const dataInicio = hojeSaoPauloISO();
  // data_expiracao é inclusiva no motor de acesso. Portanto, um plano de 30 dias
  // iniciado hoje deve expirar em hoje + 29 dias (e não +30, que daria 31 dias civis).
  const dataExpiracaoFormatada = calcularExpiracaoInclusiva(dataInicio, dias);
  const usuarioAntes = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  const cicloRenovacao = proximoCicloRenovacao(pagamento.plano, usuarioAntes?.ciclo_renovacao);

  await base44.asServiceRole.entities.User.update(pagamento.usuario_id, {
    status_assinatura: "ativo",
    plano_atual: pagamento.plano,
    data_inicio: dataInicio,
    data_expiracao: dataExpiracaoFormatada,
    ciclo_renovacao: cicloRenovacao,
    ...(pagamento.id ? { pagamento_ativo_id: pagamento.id } : {}),
  });

  const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  if (!usuario) return;

  if (usuario.email) {
    const nome = usuario.nome_completo || usuario.full_name || "";
    const defaultAssunto = "Pagamento aprovado";
    const defaultCorpo = `<p>Olá {{nome}}, seu pagamento foi aprovado com sucesso!</p><p>Seu plano {{plano}} já está ativo e válido até {{data_expiracao}}.</p><p><a href="https://laboratoriodecozinha.com.br/login" style="background-color:#5c7a5f; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block;">Acessar minha conta</a></p>`;

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

  // Garante as boas-vindas no primeiro pagamento quando a inicialização do trial
  // não conseguiu concluir o envio. O LogEmail evita duplicar quem já recebeu.
  await enviarBoasVindasSeNecessario(base44, usuario);

  await enviarNotificacaoWhatsapp(base44, "pagamento_aprovado", usuario).catch((e: any) =>
    console.log("Falha ao enviar WhatsApp de pagamento aprovado:", e.message)
  );
}