// Módulo compartilhado: envio de e-mail via Resend. Usado por todas as
// functions transacionais e pela campanha de e-mail, para não duplicar a
// chamada HTTP à API do Resend em cada function.
import { secrets } from "base44:runtime";
import { buildEmailHtml } from "./emailWrapper.ts";

export async function sendEmailViaResend(base44, { to, subject, html }) {
  const apiKey = secrets.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada" };
  }

  const htmlFinal = await buildEmailHtml(base44, html);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "Laboratório de Cozinha <contato@nutrimenu.com.br>",
      to: [to],
      subject,
      html: htmlFinal,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Mensagem completa para diagnóstico: código HTTP + message + qualquer outro
    // campo de erro que o Resend retorne (name, type, etc.), nunca só um resumo.
    const detalheCompleto = `HTTP ${res.status} — ${JSON.stringify(data)}`;
    return { ok: false, error: data?.message || `Erro HTTP ${res.status}`, detalhe_completo: detalheCompleto };
  }
  return { ok: true, id: data?.id };
}