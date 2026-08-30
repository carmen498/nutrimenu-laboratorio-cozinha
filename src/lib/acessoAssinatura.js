// Regra central de acesso ao Laboratório de Cozinha.
// A decisão usa status + data real de expiração para não depender de uma automação
// que eventualmente ainda não tenha atualizado status_assinatura no banco.

const STATUS_COM_ACESSO = new Set(["ativo", "trial"]);
const PLANOS_PAGOS = new Set(["mensal", "anual", "renovacao"]);

export function hojeSaoPauloISO(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);

  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;
  return `${ano}-${mes}-${dia}`;
}

export function statusAssinaturaEfetivo(user, agora = new Date()) {
  const status = user?.status_assinatura;
  const dataExpiracao = user?.data_expiracao;
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataExpiracao || "");
  const pagamentoVigente = PLANOS_PAGOS.has(user?.plano_atual) && !!user?.pagamento_ativo_id;

  if (status === "vencido" && dataValida && dataExpiracao >= hojeSaoPauloISO(agora) && pagamentoVigente) {
    return "ativo";
  }
  return status;
}

export function avaliarAcessoAssinatura(user, agora = new Date()) {
  if (!user) return { temAcesso: false, motivo: "sem_usuario" };
  if (user.role === "admin") return { temAcesso: true, motivo: "admin" };

  const status = statusAssinaturaEfetivo(user, agora);
  if (!STATUS_COM_ACESSO.has(status)) {
    return { temAcesso: false, motivo: status || "sem_status" };
  }

  if (status === "trial" && user?.trial_modelo === "7_em_30") {
    const hoje = hojeSaoPauloISO(agora);
    const diasUso = [...new Set((Array.isArray(user?.trial_dias_uso) ? user.trial_dias_uso : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))];
    if (diasUso.length >= 7 && !diasUso.includes(hoje)) {
      return { temAcesso: false, motivo: "trial_dias_esgotados", diasUsados: diasUso.length };
    }
  }

  const dataExpiracao = user.data_expiracao;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataExpiracao || "")) {
    return { temAcesso: false, motivo: "sem_data_expiracao" };
  }

  if (dataExpiracao < hojeSaoPauloISO(agora)) {
    return { temAcesso: false, motivo: "expirado" };
  }

  const diasUso = status === "trial" && user?.trial_modelo === "7_em_30"
    ? [...new Set(Array.isArray(user?.trial_dias_uso) ? user.trial_dias_uso : [])].length
    : null;
  return { temAcesso: true, motivo: status, dataExpiracao, diasUsados: diasUso, diasRestantesUso: diasUso == null ? null : Math.max(0, 7 - diasUso) };
}

// Janela de carência para recém-cadastrados: se a conta foi criada há poucos
// minutos e o trial ainda não foi confirmado (inicializarTrialUsuario pode
// falhar transitivamente ou competir com o AuthContext), liberamos o acesso
// ao /app para que o usuário não seja mandado para /planos enquanto o trial
// é inicializado em segundo plano. A janela é curta para não virar acesso
// gratuito indefinido.
const MINUTOS_GRACA_RECADASTRO = 15;

export function dentroJanelaGracaRecemCadastrado(user, agora = new Date()) {
  if (!user || user.role === "admin") return false;
  if (!user.created_date) return false;
  const criacao = new Date(user.created_date);
  if (isNaN(criacao.getTime())) return false;
  const diffMs = agora.getTime() - criacao.getTime();
  return diffMs >= 0 && diffMs <= MINUTOS_GRACA_RECADASTRO * 60 * 1000;
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