// Disparada por automação agendada (diária). Para pagamentos travados em
// "Aguardando pagamento" (status=pending) há 3 dias ou mais, envia um lembrete
// acolhedor por e-mail e WhatsApp perguntando se o cliente precisa de ajuda —
// apenas UMA VEZ por pagamento (marca lembrete_pendencia_enviado=true ao processar).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { enviarNotificacaoWhatsapp } from "../../shared/notificarWascript.ts";

const ASSUNTO_PADRAO = "Podemos ajudar com seu pagamento?";
const CORPO_PADRAO = `<p>Olá {{nome}}, notamos que seu pagamento no Laboratório de Cozinha ainda não foi confirmado.</p>
<p>Podemos ajudar em algo? Se preferir, você pode gerar um novo pagamento na aba Planos do app.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const limite = new Date();
    limite.setDate(limite.getDate() - 3);

    const pendentes = await base44.asServiceRole.entities.Pagamento.filter({ status: "pending" });
    const alvos = (pendentes || []).filter((p: any) =>
      !p.lembrete_pendencia_enviado && new Date(p.created_date) <= limite
    );

    let enviados = 0;
    for (const pagamento of alvos) {
      const usuario = pagamento.usuario_id
        ? await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null)
        : null;

      if (usuario) {
        const nome = usuario.nome_completo || usuario.full_name || "";

        if (usuario.email) {
          const { assunto, html, ativo } = await renderTemplateEmail(base44, "pagamento_pendente_lembrete", nome, ASSUNTO_PADRAO, CORPO_PADRAO);

          if (ativo) {
            const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
            await base44.asServiceRole.entities.LogEmail.create({
              destinatario_email: usuario.email,
              tipo: "pagamento_pendente_lembrete",
              enviado_em: new Date().toISOString(),
              status: resultado.ok ? "enviado" : "falhou",
            });
            if (resultado.ok) enviados++;
          } else {
            console.log('Template "pagamento_pendente_lembrete" está em rascunho — e-mail não enviado.');
          }
        }

        await enviarNotificacaoWhatsapp(base44, "pagamento_pendente_lembrete", usuario).catch((e: any) =>
          console.log("Falha ao enviar WhatsApp de lembrete de pendência:", e.message)
        );
      }

      // Marca como enviado independente do resultado, para nunca reenviar diariamente ao mesmo pagamento.
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { lembrete_pendencia_enviado: true });
    }

    return Response.json({ processados: alvos.length, enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}