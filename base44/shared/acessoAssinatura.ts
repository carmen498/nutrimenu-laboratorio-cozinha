// Regra server-side central de entitlement do Laboratório de Cozinha.
// Mantém a mesma semântica do front-end: a data_expiracao é inclusiva;
// o acesso só expira quando data_expiracao < hoje em America/Sao_Paulo.

const STATUS_COM_ACESSO = new Set(["ativo", "trial"]);
const PLANOS_PAGOS = new Set(["mensal", "anual", "renovacao"]);

export function hojeSaoPauloISO(agora = new Date()): string {
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

export function statusAssinaturaEfetivoServer(user: any, agora = new Date()) {
  const status = user?.status_assinatura;
  const dataExpiracao = user?.data_expiracao;
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataExpiracao || "");
  const pagamentoVigente = PLANOS_PAGOS.has(user?.plano_atual) && !!user?.pagamento_ativo_id;

  if (status === "vencido" && dataValida && dataExpiracao >= hojeSaoPauloISO(agora) && pagamentoVigente) {
    return "ativo";
  }
  return status;
}

export function avaliarAcessoAssinaturaServer(user: any, agora = new Date()) {
  if (!user) return { temAcesso: false, motivo: "sem_usuario" };
  if (user.role === "admin") return { temAcesso: true, motivo: "admin" };

  const status = statusAssinaturaEfetivoServer(user, agora);
  if (!STATUS_COM_ACESSO.has(status)) {
    return { temAcesso: false, motivo: status || "sem_status" };
  }

  if (status === "trial" && user?.trial_modelo === "7_em_30") {
    const hoje = hojeSaoPauloISO(agora);
    const diasUso = [...new Set((Array.isArray(user?.trial_dias_uso) ? user.trial_dias_uso : []).filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))];
    if (diasUso.length >= 7 && !diasUso.includes(hoje)) {
      return { temAcesso: false, motivo: "trial_dias_esgotados", diasUsados: diasUso.length };
    }
  }

  const dataExpiracao = user.data_expiracao;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataExpiracao || "")) {
    return { temAcesso: false, motivo: "sem_data_expiracao" };
  }

  if (dataExpiracao < hojeSaoPauloISO(agora)) {
    return { temAcesso: false, motivo: "expirado", dataExpiracao };
  }

  const diasUso = status === "trial" && user?.trial_modelo === "7_em_30"
    ? [...new Set(Array.isArray(user?.trial_dias_uso) ? user.trial_dias_uso : [])].length
    : null;
  return { temAcesso: true, motivo: status, dataExpiracao, diasUsados: diasUso, diasRestantesUso: diasUso == null ? null : Math.max(0, 7 - diasUso) };
}

export async function exigirAssinaturaAtiva(base44: any, agora = new Date()) {
  const user = await base44.auth.me();
  if (!user) {
    return {
      user: null,
      acesso: { temAcesso: false, motivo: "sem_usuario" },
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const acesso = avaliarAcessoAssinaturaServer(user, agora);
  if (!acesso.temAcesso) {
    return {
      user,
      acesso,
      response: Response.json(
        {
          error: "Assinatura necessária",
          code: "subscription_required",
          motivo: acesso.motivo,
        },
        { status: 403 },
      ),
    };
  }

  return { user, acesso, response: null };
}

async function listarTodosUsuarios(base44: any) {
  const todos = [];
  const pageSize = 1000;
  let skip = 0;

  while (true) {
    const pagina = await base44.asServiceRole.entities.User.list("-created_date", pageSize, skip);
    todos.push(...pagina);
    if (pagina.length < pageSize) break;
    skip += pageSize;
  }

  return todos;
}

// Normaliza o banco para que status_assinatura reflita a validade real.
// É segura para execução diária e repetida: só altera ativo/trial já vencidos.
export async function normalizarAssinaturasVencidas(base44: any, agora = new Date()) {
  const hoje = hojeSaoPauloISO(agora);
  const usuarios = await listarTodosUsuarios(base44);

  const vencidos = usuarios.filter((usuario: any) => {
    if (!usuario || usuario.role === "admin") return false;
    if (!STATUS_COM_ACESSO.has(usuario.status_assinatura)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(usuario.data_expiracao || "")) return false;
    return usuario.data_expiracao < hoje;
  });

  let atualizados = 0;
  for (const usuario of vencidos) {
    await base44.asServiceRole.entities.User.update(usuario.id, {
      status_assinatura: "vencido",
    });
    atualizados++;
  }

  return {
    hoje,
    analisados: usuarios.length,
    vencidosEncontrados: vencidos.length,
    atualizados,
  };
}