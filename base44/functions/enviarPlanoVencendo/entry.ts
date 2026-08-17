// Disparada por automação agendada (diária). Envia o e-mail e o WhatsApp de
// "plano perto de vencer" para assinantes pagantes cujo data_expiracao é em 5 dias.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { enviarNotificacaoWhatsapp } from "../../shared/notificarWascript.ts";

const ASSUNTO_PADRAO = "Seu plano está perto de vencer";
const CORPO_PADRAO = `<p>Olá {{nome}}, seu plano no Laboratório de Cozinha vence em breve.</p>
<p>Renove agora para não perder o acesso às suas receitas e cardápios.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const alvo = new Date();
    alvo.setDate(alvo.getDate() + 5);
    const dataAlvo = alvo.toISOString().split('T')[0];

    const usuarios = await base44.asServiceRole.entities.User.filter({
      status_assinatura: "ativo",
      data_expiracao: dataAlvo,
    });

    let enviados = 0;
    for (const usuario of usuarios) {
      const nome = usuario.nome_completo || usuario.full_name || "";

      if (usuario.email) {
        const { assunto, html, ativo } = await renderTemplateEmail(base44, "plano_vencendo", nome, ASSUNTO_PADRAO, CORPO_PADRAO);

        if (ativo) {
          const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
          await base44.asServiceRole.entities.LogEmail.create({
            destinatario_email: usuario.email,
            tipo: "plano_vencendo",
            enviado_em: new Date().toISOString(),
            status: resultado.ok ? "enviado" : "falhou",
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

    return Response.json({ processados: usuarios.length, enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}