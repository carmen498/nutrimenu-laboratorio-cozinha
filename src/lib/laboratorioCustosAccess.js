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

export function avaliarAcessoLaboratorioCustos(user) {
  if (!user) return { temAcesso: false, motivo: "sem_usuario" };
  if (!LABORATORIO_CUSTOS_BETA_ENABLED) {
    return { temAcesso: false, motivo: "feature_desligada" };
  }

  // Durante C0/C1, somente administradores participam da beta interna.
  if (user.role === "admin") {
    return { temAcesso: true, motivo: "admin_beta" };
  }

  // O entitlement comercial será conectado numa fase posterior, sem alterar
  // a regra de assinatura atual do Laboratório de Cozinha.
  if (!LABORATORIO_CUSTOS_COMERCIAL_ENABLED) {
    return { temAcesso: false, motivo: "comercial_indisponivel" };
  }

  return { temAcesso: false, motivo: "addon_nao_contratado" };
}
