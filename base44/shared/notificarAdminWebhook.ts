// Notifica o administrador (e-mail + WhatsApp) sobre eventos críticos do webhook
// do Mercado Pago: contestação (chargeback), estorno parcial e cancelamento.
// Falhas de envio são apenas logadas — nunca abortam o processamento do webhook.
import { sendEmailViaResend } from "./resendEmail.ts";
import { secrets } from "base44:runtime";

const TITULOS: Record<string, string> = {
  contestado: "Contestação (chargeback)",
  estornado_parcial: "Estorno parcial",
  cancelled: "Pagamento encerrado pelo Mercado Pago",
};

export async function notificarAdminEventoWebhook(
  base44: any,
  evento: {
    status_resolvido: string;
    pagamento_id: string;
    usuario_id: string;
    usuario_nome?: string;
    plano?: string;
    valor?: number;
    produto_compra?: string;
  }
): Promise<void> {
  const titulo = TITULOS[evento.status_resolvido] || evento.status_resolvido;
  const valorTxt = evento.valor != null ? `R$ ${Number(evento.valor).toFixed(2)}` : "—";
  const nome = evento.usuario_nome || evento.usuario_id;

  const assunto = `[${evento.produto_compra || "Nutrimenu"}] ${titulo} — pagamento ${evento.pagamento_id}`;
  const acao = evento.status_resolvido === "estornado_parcial"
    ? "Estorno parcial registrado — o acesso <strong>NÃO</strong> foi revogado automaticamente. Avalie manualmente."
    : "O acesso do usuário foi revogado automaticamente.";
  const html =
    `<p><strong>${titulo}</strong> detectado pelo webhook do Mercado Pago.</p>` +
    `<p><strong>Pagamento:</strong> ${evento.pagamento_id}<br>` +
    `<strong>Usuário:</strong> ${nome}<br>` +
    `<strong>Plano:</strong> ${evento.plano || "—"}<br>` +
    `<strong>Valor:</strong> ${valorTxt}</p>` +
    `<p>${acao}</p>`;

  const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }).catch(() => []);
  for (const admin of admins || []) {
    if (admin.email) {
      await sendEmailViaResend(base44, { to: admin.email, subject: assunto, html, produto: evento.produto_compra }).catch((e: any) =>
        console.log(`Falha ao enviar e-mail admin (${admin.email}):`, e?.message || "erro")
      );
    }
    const telefone = admin.telefone_whatsapp;
    if (telefone) {
      const digits = String(telefone).replace(/\D/g, "");
      const numero = digits.length <= 11 ? `55${digits}` : digits;
      const modoTeste = secrets.get("WASCRIPT_MODO_TESTE") !== "false";
      const token = secrets.get("WASCRIPT_API_TOKEN");
      const mensagem = `${titulo} — Pagamento ${evento.pagamento_id} (${nome}). ${evento.status_resolvido === "estornado_parcial" ? "Avalie manualmente." : "Acesso revogado."}`;
      try {
        if (modoTeste || !token) {
          console.log(`[MODO TESTE] WhatsApp admin "${titulo}" simulado.`);
        } else {
          const resposta = await fetch(`https://api-whatsapp.wascript.com.br/api/enviar-texto/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: numero, message: mensagem }),
          });
          if (!resposta.ok) console.log(`Erro ao enviar WhatsApp admin (HTTP ${resposta.status}).`);
        }
      } catch (e: any) {
        console.log("Falha ao enviar WhatsApp admin:", e?.message || "erro");
      }
    }
  }
}