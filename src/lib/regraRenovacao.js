import { hojeSaoPauloISO } from "./acessoAssinatura";

export const JANELA_RENOVACAO_DIAS = 30;

function normalizarCiclo(valor) {
  const ciclo = Number(valor || 0);
  return Number.isFinite(ciclo) && ciclo > 0 ? Math.floor(ciclo) : 0;
}

function diferencaDiasISO(dataAlvo, dataBase) {
  const [anoAlvo, mesAlvo, diaAlvo] = dataAlvo.split("-").map(Number);
  const [anoBase, mesBase, diaBase] = dataBase.split("-").map(Number);
  return Math.round(
    (Date.UTC(anoAlvo, mesAlvo - 1, diaAlvo) - Date.UTC(anoBase, mesBase - 1, diaBase)) / 86400000,
  );
}

export function avaliarElegibilidadeRenovacao(user, agora = new Date()) {
  if (!user) return { elegivel: false, motivo: "sem_usuario" };
  if (user.role === "admin") return { elegivel: true, motivo: "admin", diasParaExpiracao: null };

  const ciclo = normalizarCiclo(user.ciclo_renovacao);
  if (ciclo < 1) return { elegivel: false, motivo: "ciclo_insuficiente", ciclo };

  const dataExpiracao = String(user.data_expiracao || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataExpiracao)) {
    return { elegivel: false, motivo: "sem_data_expiracao", ciclo };
  }

  const hoje = hojeSaoPauloISO(agora);
  const diasParaExpiracao = diferencaDiasISO(dataExpiracao, hoje);
  if (diasParaExpiracao > JANELA_RENOVACAO_DIAS) {
    return { elegivel: false, motivo: "fora_janela", ciclo, diasParaExpiracao, janelaDias: JANELA_RENOVACAO_DIAS };
  }

  return {
    elegivel: true,
    motivo: diasParaExpiracao < 0 ? "expirado" : "janela_renovacao",
    ciclo,
    diasParaExpiracao,
    janelaDias: JANELA_RENOVACAO_DIAS,
  };
}
