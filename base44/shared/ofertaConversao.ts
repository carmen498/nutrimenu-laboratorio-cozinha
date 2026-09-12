// Oferta de fim de trial (48 h): desconto na primeira assinatura, decidido SEMPRE
// no servidor. A expiração fica persistida em User.oferta_conversao_expira_em e
// só é definida uma vez por conta. O percentual vem de ConfiguracaoPlano
// (desconto_primeira_assinatura_pct) dos planos mensal/anual do Laboratório de Cozinha.
import { hojeSaoPauloISO } from "./acessoAssinatura.ts";

export const OFERTA_CONVERSAO_HORAS = 48;
const PLANOS_OFERTA = ["mensal", "anual"];

function diasEntreISO(inicio: string, fim: string): number | null {
  const a = Date.parse(`${inicio}T00:00:00Z`);
  const b = Date.parse(`${fim}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

// Elegível: em trial e (faltam ≤ 2 dias da janela OU já usou ≥ 6 dos 7 dias).
export function trialNoFim(user: any, agora = new Date()): boolean {
  if (!user || user.role === "admin" || user.status_assinatura !== "trial") return false;
  const hoje = hojeSaoPauloISO(agora);
  const diasRestantes = /^\d{4}-\d{2}-\d{2}$/.test(user.data_expiracao || "") ? diasEntreISO(hoje, user.data_expiracao) : null;
  const diasUsados = new Set(Array.isArray(user.trial_dias_uso) ? user.trial_dias_uso : []).size;
  return (diasRestantes != null && diasRestantes <= 2) || diasUsados >= 6;
}

export async function nuncaPagou(base44: any, userId: string): Promise<boolean> {
  const aprovados = await base44.asServiceRole.entities.Pagamento.filter({ usuario_id: userId, status: "approved" }, undefined, 1);
  return (aprovados || []).length === 0;
}

export async function descontosOfertaConversao(base44: any): Promise<Record<string, number>> {
  const configs = await base44.asServiceRole.entities.ConfiguracaoPlano.list();
  const descontos: Record<string, number> = {};
  for (const id of PLANOS_OFERTA) {
    const cfg = (configs || []).find((p: any) => p.plano_id === id && (!p.produto || p.produto === "laboratorio_cozinha"));
    const pct = Number(cfg?.desconto_primeira_assinatura_pct || 0);
    descontos[id] = pct > 0 && pct < 100 ? pct : 0;
  }
  return descontos;
}

export function aplicarDescontoOferta(valor: number, pct: number): number {
  return Math.round(valor * (1 - pct / 100) * 100) / 100;
}

// Resolve o estado da oferta para o usuário. Com ativarSeElegivel=true (tela de
// planos) grava a expiração na primeira visita elegível; no checkout usa false e
// só honra uma oferta já iniciada e ainda dentro do prazo.
export async function resolverOfertaConversao(base44: any, user: any, { ativarSeElegivel = false } = {}, agora = new Date()) {
  const inativa = { ativa: false, expira_em: user?.oferta_conversao_expira_em || null, descontos: {} as Record<string, number> };
  if (!user || user.role === "admin" || user.status_assinatura !== "trial") return inativa;

  const descontos = await descontosOfertaConversao(base44);
  if (!Object.values(descontos).some((v) => v > 0)) return inativa;
  if (!(await nuncaPagou(base44, user.id))) return inativa;

  let expiraEm: string | null = user.oferta_conversao_expira_em || null;
  if (!expiraEm) {
    if (!ativarSeElegivel || !trialNoFim(user, agora)) return inativa;
    expiraEm = new Date(agora.getTime() + OFERTA_CONVERSAO_HORAS * 3600000).toISOString();
    await base44.asServiceRole.entities.User.update(user.id, { oferta_conversao_expira_em: expiraEm });
  } else if (Date.parse(expiraEm) <= agora.getTime()) {
    return { ...inativa, expira_em: expiraEm };
  }

  return { ativa: true, expira_em: expiraEm, descontos };
}