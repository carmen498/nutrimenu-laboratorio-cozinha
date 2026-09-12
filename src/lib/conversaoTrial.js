// Conversão trial → pagante: usuários (não admin) que já tiveram ao menos um
// pagamento aprovado ÷ usuários que iniciaram o trial. Todo cadastro começa em
// trial, então o denominador é a base de usuários comuns.
export function calcularConversaoTrial({ usuarios = [], pagamentos = [] }) {
  const comuns = usuarios.filter((u) => u.role !== "admin");
  const pagantesIds = new Set(
    pagamentos.filter((p) => p.status === "approved" && p.usuario_id).map((p) => p.usuario_id),
  );
  // Conta também planos pagos liberados manualmente pelo admin (sem Pagamento aprovado).
  const converteu = (u) => pagantesIds.has(u.id) || ["mensal", "anual", "renovacao"].includes(u.plano_atual);
  const convertidos = comuns.filter(converteu).length;
  const emTrial = comuns.filter((u) => u.status_assinatura === "trial").length;
  const vencidosSemPagar = comuns.filter((u) => u.status_assinatura === "vencido" && !converteu(u)).length;
  const taxa = comuns.length ? (convertidos / comuns.length) * 100 : 0;

  return { trials: comuns.length, convertidos, emTrial, vencidosSemPagar, taxa };
}