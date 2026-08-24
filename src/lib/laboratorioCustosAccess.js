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
export const LABORATORIO_CUSTOS_COMERCIAL_ENABLED = false;

export function avaliarAcessoLaboratorioCustos(user, entitlement = null, agora = new Date(), comercialEnabled = LABORATORIO_CUSTOS_COMERCIAL_ENABLED) {
  if (!user) return { temAcesso: false, motivo: "sem_usuario" };
  if (!LABORATORIO_CUSTOS_BETA_ENABLED) {
    return { temAcesso: false, motivo: "feature_desligada" };
  }

  // A beta interna continua disponível para administradores independentemente
  // do estado comercial do complemento.
  if (user.role === "admin") {
    return { temAcesso: true, motivo: "admin_beta" };
  }

  if (!comercialEnabled) {
    return { temAcesso: false, motivo: "comercial_indisponivel" };
  }

  if (!entitlement || entitlement.status !== "ativo") {
    return { temAcesso: false, motivo: "addon_nao_contratado" };
  }

  if (entitlement.inicio_em && new Date(entitlement.inicio_em) > agora) {
    return { temAcesso: false, motivo: "addon_ainda_nao_iniciado" };
  }
  if (entitlement.fim_em && new Date(entitlement.fim_em) < agora) {
    return { temAcesso: false, motivo: "addon_expirado" };
  }

  return { temAcesso: true, motivo: "addon_ativo", entitlement };
}
