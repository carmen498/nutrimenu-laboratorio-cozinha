const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
const TRINTA_MINUTOS = 30 * 60 * 1000;

const recentes = (itens, campo) => itens.filter((item) => {
  const data = new Date(item[campo] || item.created_date).getTime();
  return Number.isFinite(data) && data >= Date.now() - SETE_DIAS;
});

export function calcularSaudeOperacional({ pagamentos = [], webhooks = [], emails = [] }) {
  const pagamentos7d = recentes(pagamentos, "created_date");
  const webhooks7d = recentes(webhooks, "created_date");
  const emails7d = recentes(emails, "enviado_em");
  const webhooksFalhos = webhooks7d.filter((log) => !["processado", "status_nao_final"].includes(log.resultado));
  const emailsFalhos = emails7d.filter((log) => log.status === "falhou");
  const pendentesAntigos = pagamentos.filter((pagamento) => pagamento.status === "pending"
    && new Date(pagamento.created_date).getTime() < Date.now() - TRINTA_MINUTOS);

  return [
    { titulo: "Pagamentos", valor: pagamentos7d.length, detalhe: `${pagamentos7d.filter((p) => p.status === "approved").length} aprovados nos últimos 7 dias`, status: "ok" },
    { titulo: "Webhooks", valor: webhooksFalhos.length, detalhe: `${webhooks7d.length} recebidos · falhas nos últimos 7 dias`, status: webhooksFalhos.length ? "alerta" : "ok" },
    { titulo: "E-mails", valor: emailsFalhos.length, detalhe: `${emails7d.length} registrados · falhas nos últimos 7 dias`, status: emailsFalhos.length ? "alerta" : "ok" },
    { titulo: "Conciliações", valor: pendentesAntigos.length, detalhe: "pagamentos pendentes há mais de 30 minutos", status: pendentesAntigos.length ? "alerta" : "ok" },
  ];
}