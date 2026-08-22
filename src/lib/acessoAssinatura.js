// Regra central de acesso ao Laboratório de Cozinha.
// A decisão usa status + data real de expiração para não depender de uma automação
// que eventualmente ainda não tenha atualizado status_assinatura no banco.

const STATUS_COM_ACESSO = new Set(["ativo", "trial"]);

export function hojeLocalISO(agora = new Date()) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function avaliarAcessoAssinatura(user, agora = new Date()) {
  if (!user) {
    return { temAcesso: false, motivo: "sem_usuario" };
  }

  // A conta administradora não depende de trial/plano/expiração.
  if (user.role === "admin") {
    return { temAcesso: true, motivo: "admin" };
  }

  const status = user.status_assinatura;
  if (!STATUS_COM_ACESSO.has(status)) {
    return { temAcesso: false, motivo: status || "sem_status" };
  }

  const dataExpiracao = user.data_expiracao;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataExpiracao || "")) {
    // Fail closed: conta paga/trial sem uma validade confiável não libera o app.
    return { temAcesso: false, motivo: "sem_data_expiracao" };
  }

  const hoje = hojeLocalISO(agora);
  if (dataExpiracao < hoje) {
    return { temAcesso: false, motivo: "expirado" };
  }

  return {
    temAcesso: true,
    motivo: status,
    dataExpiracao,
  };
}

// Mesmo sem assinatura ativa o usuário precisa conseguir renovar, consultar a
// própria conta e pedir suporte. Termos/Privacidade já são rotas públicas no App.jsx.
const ROTAS_LIBERADAS_SEM_ASSINATURA = new Set([
  "/planos",
  "/conta",
  "/suporte",
]);

export function rotaLiberadaSemAssinatura(pathname) {
  return ROTAS_LIBERADAS_SEM_ASSINATURA.has(pathname);
}
