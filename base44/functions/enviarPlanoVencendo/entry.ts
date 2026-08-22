// Disparada por automação agendada (diária). Envia o e-mail e o WhatsApp de
// "plano perto de vencer" para assinantes pagantes cujo data_expiracao é em 5 dias
// e normaliza assinaturas já vencidas.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { enviarNotificacaoWhatsapp } from "../../shared/notificarWascript.ts";
import { hojeSaoPauloISO, normalizarAssinaturasVencidas } from "../../shared/acessoAssinatura.ts";
import { notificacaoJaProcessadaHoje } from "../../shared/protecoesAutomacao.ts";

const ASSUNTO_PADRAO = "Seu plano está perto de vencer";
const CORPO_PADRAO = `<p>Olá {{nome}}, seu plano {{plano}} vence em {{dias_restantes}} dias, no dia {{data_expiracao}}.</p>
<p>Lembrando que não há renovação automática — para continuar usando o Laboratório de Cozinha sem interrupção, é só renovar manualmente quando quiser.</p>`;

const NOME_PLANO: Record<string, string> = {
  mensal: "30 dias",
  anual: "Anual",
  renovacao: "Renovação",
};

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().split("T")[0];
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = hojeSaoPauloISO();
    const dataAlvo = somarDiasISO(hoje, 5);

    const usuarios = await base44.asServiceRole.entities.User.filter({
      status_assinatura: "ativo",
      data_expiracao: dataAlvo,
    });

    let enviados = 0;
    for (const usuario of usuarios) {
      if (await notificacaoJaProcessadaHoje(base44, "plano_vencendo", usuario)) continue;
      const nome = usuario.nome_completo || usuario.full_name || "";

      if (usuario.email) {
        const [ano, mes, dia] = (usuario.data_expiracao || dataAlvo).split("-");
        const dataExpiracaoBR = `${dia}/${mes}/${ano}`;
        const { assunto, html, ativo } = await renderTemplateEmail(
          base44,
          "plano_vencendo",
          nome,
          ASSUNTO_PADRAO,
          CORPO_PADRAO,
          {
            plano: NOME_PLANO[usuario.plano_atual] || usuario.plano_atual || "contratado",
            dias_restantes: 5,
            data_expiracao: dataExpiracaoBR,
          },
        );

        if (ativo) {
          const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
          await base44.asServiceRole.entities.LogEmail.create({
            destinatario_email: usuario.email,
            tipo: "plano_vencendo",
            enviado_em: new Date().toISOString(),
            status: resultado.ok ? "enviado" : "falhou",
            detalhe_erro: resultado.ok ? undefined : (resultado.detalhe_completo || resultado.error),
          });
          if (resultado.ok) enviados++;
        } else {
          console.log('Template "plano_vencendo" está em rascunho — e-mail não enviado.');
        }
      }

      await enviarNotificacaoWhatsapp(base44, "plano_vencendo", usuario).catch((e: any) =>
        console.log("Falha ao enviar WhatsApp de plano vencendo:", e.message)
      );
    }

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