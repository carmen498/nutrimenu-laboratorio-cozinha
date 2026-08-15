// Módulo compartilhado: envio de e-mail via Resend. Usado por todas as
// functions transacionais e pela campanha de e-mail, para não duplicar a
// chamada HTTP à API do Resend em cada function.
import { secrets } from "base44:runtime";

export async function sendEmailViaResend({ to, subject, html }) {
  const apiKey = secrets.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "Laboratório de Cozinha <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: data?.message || `Erro HTTP ${res.status}` };
  }
  return { ok: true, id: data?.id };
}