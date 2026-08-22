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

export async function notificacaoJaProcessadaHoje(
  base44: any,
  tipo: string,
  usuario: { email?: string; telefone_whatsapp?: string },
): Promise<boolean> {
  const hoje = hojeSaoPauloISO();

  if (usuario?.email) {
    const logsEmail = await base44.asServiceRole.entities.LogEmail.filter({
      destinatario_email: usuario.email,
      tipo,
    });
    if ((logsEmail || []).some((log: any) =>
      dataSaoPauloISO(log.enviado_em || log.created_date) === hoje
    )) return true;
  }

  if (usuario?.telefone_whatsapp) {
    const numero = normalizarTelefoneBrasil(usuario.telefone_whatsapp);
    const logsWhatsapp = await base44.asServiceRole.entities.LogWhatsapp.filter({
      destinatario_telefone: numero,
      tipo,
    });
    if ((logsWhatsapp || []).some((log: any) =>
      dataSaoPauloISO(log.created_date) === hoje
    )) return true;
  }

  return false;
}

const CHAVE_LOCK_PRECOS = "auto_update_prices_last_started_at";

export async function adquirirCooldownAtualizacaoPrecos(
  base44: any,
  horas = 20,
): Promise<{ permitido: boolean; ultimaExecucao: string | null }> {
  const registros = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({
    chave: CHAVE_LOCK_PRECOS,
  });
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
      chave: CHAVE_LOCK_PRECOS,
      valor: agora,
    });
  }

  return { permitido: true, ultimaExecucao };
}
