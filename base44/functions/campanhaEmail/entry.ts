// Aba "Campanhas" da Central de Comunicação — admin only.
// acao="teste": envia o e-mail apenas para o próprio admin.
// acao="disparar": envia para a lista explícita de e-mails selecionada no painel (filtro + checklist).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { acao, destinatarios, assunto, corpo } = body;

    if (acao === "teste") {
      const resultado = await sendEmailViaResend(base44, {
        to: user.email,
        subject: assunto || "Teste de campanha",
        html: (corpo || "").replace(/\n/g, "<br/>"),
      });
      return Response.json({ success: resultado.ok, error: resultado.error });
    }

    if (acao === "disparar") {
      const emails = Array.isArray(destinatarios) ? destinatarios.filter(Boolean) : [];
      let enviados = 0;
      for (const email of emails) {
        const resultado = await sendEmailViaResend(base44, {
          to: email,
          subject: assunto,
          html: (corpo || "").replace(/\n/g, "<br/>"),
        });
        if (resultado.ok) enviados++;
      }
      return Response.json({ total: emails.length, enviados });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}