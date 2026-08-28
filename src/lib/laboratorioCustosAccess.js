// Laboratório de Custos — isolamento de acesso.
//
// Duas chaves independentes:
// 1) BETA_ENABLED: libera o módulo somente para desenvolvimento/testes internos.
// 2) COMERCIAL_ENABLED: ficará responsável pela liberação comercial futura,
//    depois que o add-on estiver integrado ao sistema de contratação.
//
// Enquanto COMERCIAL_ENABLED=false, nenhum cliente atual do Laboratório de
// Cozinha depende ou recebe acesso ao novo módulo.
export const LABORATORIO_CUSTOS_BETA_ENABLED = true;

export function avaliarAcessoLaboratorioCustos(user, config = null, entitlement = null, agora = new Date()) {
  if (!user) return { temAcesso: false, motivo: "sem_usuario" };
  if (!LABORATORIO_CUSTOS_BETA_ENABLED) {
    return { temAcesso: false, motivo: "feature_desligada" };
  }

  // A beta interna continua disponível para administradores independentemente
  // do estado comercial do complemento.
  if (user.role === "admin") {
    return { temAcesso: true, motivo: "admin_beta" };
  }

  const trialControladoAtivo = entitlement?.status === "ativo" && entitlement?.origem === "trial" && entitlement?.trial_ativado_em;
  if (!config?.modulo_habilitado && !trialControladoAtivo) {
    return { temAcesso: false, motivo: "comercial_indisponivel" };
  }

  if (!entitlement) {
    return { temAcesso: false, motivo: "addon_nao_contratado", estado: "nao_contratado" };
  }

  if (entitlement.status === "suspenso") return { temAcesso: false, motivo: "addon_suspenso", estado: "suspenso", entitlement };
  if (entitlement.status === "cancelado") return { temAcesso: false, motivo: "addon_cancelado", estado: "cancelado", entitlement };
  if (entitlement.status === "expirado") return { temAcesso: false, motivo: "addon_expirado", estado: "expirado", entitlement };
  if (entitlement.status !== "ativo") return { temAcesso: false, motivo: "addon_pendente", estado: "pendente", entitlement };

  if (entitlement.inicio_em && new Date(entitlement.inicio_em) > agora) {
    return { temAcesso: false, motivo: "addon_ainda_nao_iniciado", estado: "pendente", entitlement };
  }
  if (entitlement.fim_em && new Date(entitlement.fim_em) < agora) {
    return { temAcesso: false, motivo: "addon_expirado", estado: "expirado", entitlement };
  }

  const estado = entitlement.modalidade === "trial" ? "trial_ativo" : "ativo";
  return { temAcesso: true, motivo: entitlement.modalidade === "trial" ? "trial_ativo" : "addon_ativo", estado, entitlement };
}

export const ESTADO_ACESSO_CUSTOS_LABEL = {
  nao_contratado: "Não contratado",
  pendente: "Pendente",
  trial_ativo: "Trial ativo",
  ativo: "Ativo",
  expirado: "Expirado",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
};
