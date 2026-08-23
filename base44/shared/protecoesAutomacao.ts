import { hojeSaoPauloISO } from "./acessoAssinatura.ts";

function dataSaoPauloISO(valor: unknown): string | null {
  if (!valor) return null;
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return null;

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;
  return ano && mes && dia ? `${ano}-${mes}-${dia}` : null;
}

function normalizarTelefoneBrasil(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  return digits.length <= 11 ? `55${digits}` : digits;
}

const TIPOS_COM_WHATSAPP = new Set([
  "pagamento_aprovado",
  "pagamento_recusado",
  "plano_vencendo",
  "pagamento_pendente_lembrete",
  "pagamento_estornado",
]);

export async function notificacaoJaProcessadaHoje(
  base44: any,
  tipo: string,
  usuario: { id?: string; email?: string; telefone_whatsapp?: string },
): Promise<boolean> {
  const hoje = hojeSaoPauloISO();

  if (usuario?.id) {
    const logsEmail = await base44.asServiceRole.entities.LogEmail.filter({
      usuario_id: usuario.id,
      tipo,
    });
    if ((logsEmail || []).some((log: any) =>
      dataSaoPauloISO(log.enviado_em || log.created_date) === hoje
    )) return true;
  } else if (usuario?.email) {
    // Compatibilidade temporária com registros legados anteriores à minimização.
    const logsEmail = await base44.asServiceRole.entities.LogEmail.filter({
      destinatario_email: usuario.email,
      tipo,
    });
    if ((logsEmail || []).some((log: any) =>
      dataSaoPauloISO(log.enviado_em || log.created_date) === hoje
    )) return true;
  }

  if (usuario?.telefone_whatsapp && TIPOS_COM_WHATSAPP.has(tipo)) {
    if (usuario?.id) {
      const logsWhatsapp = await base44.asServiceRole.entities.LogWhatsapp.filter({
        usuario_id: usuario.id,
        tipo,
      });
      if ((logsWhatsapp || []).some((log: any) =>
        dataSaoPauloISO(log.created_date) === hoje
      )) return true;
    } else {
      const numero = normalizarTelefoneBrasil(usuario.telefone_whatsapp);
      const logsWhatsapp = await base44.asServiceRole.entities.LogWhatsapp.filter({
        destinatario_telefone: numero,
        tipo,
      });
      if ((logsWhatsapp || []).some((log: any) =>
        dataSaoPauloISO(log.created_date) === hoje
      )) return true;
    }
  }

  return false;
}

type JanelaAutomacao = {
  diasSemana?: number[];
  inicioMinuto?: number;
  fimMinuto?: number;
};

function horarioSaoPaulo(agora = new Date()): { diaSemana: number; minutoDia: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);

  const mapaDia: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const diaSemana = mapaDia[partes.find((p) => p.type === "weekday")?.value || ""];
  const hora = Number(partes.find((p) => p.type === "hour")?.value || 0);
  const minuto = Number(partes.find((p) => p.type === "minute")?.value || 0);
  return { diaSemana, minutoDia: hora * 60 + minuto };
}

function dentroDaJanela(janela: JanelaAutomacao | undefined, agora = new Date()): boolean {
  if (!janela) return true;
  const { diaSemana, minutoDia } = horarioSaoPaulo(agora);
  if (janela.diasSemana?.length && !janela.diasSemana.includes(diaSemana)) return false;
  if (janela.inicioMinuto == null || janela.fimMinuto == null) return true;
  if (janela.inicioMinuto <= janela.fimMinuto) {
    return minutoDia >= janela.inicioMinuto && minutoDia <= janela.fimMinuto;
  }
  return minutoDia >= janela.inicioMinuto || minutoDia <= janela.fimMinuto;
}

export async function adquirirCooldownAutomacao(
  base44: any,
  chave: string,
  horas: number,
): Promise<{ permitido: boolean; ultimaExecucao: string | null }> {
  const registros = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({ chave });
  let registro = registros?.[0] || null;
  const ultimaExecucao = registro?.valor || null;
  const ultimaMs = ultimaExecucao ? Date.parse(ultimaExecucao) : Number.NaN;
  const janelaMs = horas * 60 * 60 * 1000;

  if (Number.isFinite(ultimaMs) && Date.now() - ultimaMs < janelaMs) {
    return { permitido: false, ultimaExecucao };
  }

  const agora = new Date().toISOString();
  if (registro) {
    await base44.asServiceRole.entities.ConfiguracaoSistema.update(registro.id, { valor: agora });
  } else {
    registro = await base44.asServiceRole.entities.ConfiguracaoSistema.create({
      chave,
      valor: agora,
    });
  }

  return { permitido: true, ultimaExecucao };
}

/**
 * Hardening para functions agendadas que, por limitação da plataforma, também
 * possuem endpoint HTTP. Não tenta fingir que existe uma identidade secreta do
 * scheduler: chamadas sem usuário só executam dentro da janela esperada e uma
 * vez por cooldown; chamadas autenticadas de não-admin são recusadas.
 *
 * O job deve continuar determinístico e não aceitar IDs/alvos vindos do request.
 */
export async function protegerExecucaoAgendada(
  base44: any,
  req: Request,
  opcoes: {
    chave: string;
    cooldownHoras: number;
    janela?: JanelaAutomacao;
  },
): Promise<{
  response: Response | null;
  origem: "admin" | "automacao_ou_http_sem_usuario";
  ultimaExecucao: string | null;
}> {
  if (req.method !== "POST") {
    return {
      response: Response.json({ error: "method_not_allowed" }, { status: 405 }),
      origem: "automacao_ou_http_sem_usuario",
      ultimaExecucao: null,
    };
  }

  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== "admin") {
    return {
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
      origem: "automacao_ou_http_sem_usuario",
      ultimaExecucao: null,
    };
  }

  // Administrador autenticado pode testar manualmente fora da janela; chamadas
  // sem contexto de usuário (scheduler ou HTTP direto) ficam presas à janela.
  if (!user && !dentroDaJanela(opcoes.janela)) {
    return {
      response: Response.json({
        ignored: true,
        reason: "outside_schedule_window",
      }),
      origem: "automacao_ou_http_sem_usuario",
      ultimaExecucao: null,
    };
  }

  const cooldown = await adquirirCooldownAutomacao(
    base44,
    `automation_last_started:${opcoes.chave}`,
    opcoes.cooldownHoras,
  );
  if (!cooldown.permitido) {
    return {
      response: Response.json({
        ignored: true,
        reason: "cooldown",
        ultima_execucao: cooldown.ultimaExecucao,
      }),
      origem: user ? "admin" : "automacao_ou_http_sem_usuario",
      ultimaExecucao: cooldown.ultimaExecucao,
    };
  }

  return {
    response: null,
    origem: user ? "admin" : "automacao_ou_http_sem_usuario",
    ultimaExecucao: cooldown.ultimaExecucao,
  };
}

const CHAVE_LOCK_PRECOS = "auto_update_prices_last_started_at";

// Compatibilidade temporária com chamadas antigas; novas functions agendadas
// devem usar protegerExecucaoAgendada().
export async function adquirirCooldownAtualizacaoPrecos(
  base44: any,
  horas = 20,
): Promise<{ permitido: boolean; ultimaExecucao: string | null }> {
  return adquirirCooldownAutomacao(base44, CHAVE_LOCK_PRECOS, horas);
}
