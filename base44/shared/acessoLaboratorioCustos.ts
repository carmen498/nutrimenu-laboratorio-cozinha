import { avaliarAcessoAssinaturaServer } from "./acessoAssinatura.ts";

export function avaliarAcessoLaboratorioCustosServer(
  user: any,
  config: any,
  entitlement: any,
  agora = new Date(),
) {
  if (!user) return { temAcesso: false, motivo: "sem_usuario" };
  if (user.role === "admin") return { temAcesso: true, motivo: "admin_beta" };

  const base = avaliarAcessoAssinaturaServer(user, agora);
  if (!base.temAcesso) return { temAcesso: false, motivo: "plano_base_inativo", motivoBase: base.motivo };

  if (!config?.modulo_habilitado) return { temAcesso: false, motivo: "comercial_indisponivel" };
  if (!entitlement || entitlement.status !== "ativo") return { temAcesso: false, motivo: "addon_nao_contratado" };

  if (entitlement.inicio_em) {
    const inicio = new Date(entitlement.inicio_em);
    if (!Number.isNaN(inicio.getTime()) && inicio > agora) return { temAcesso: false, motivo: "addon_ainda_nao_iniciado" };
  }
  if (entitlement.fim_em) {
    const fim = new Date(entitlement.fim_em);
    if (!Number.isNaN(fim.getTime()) && fim < agora) return { temAcesso: false, motivo: "addon_expirado" };
  }

  return { temAcesso: true, motivo: "addon_ativo", entitlement };
}

export async function exigirAcessoLaboratorioCustos(base44: any, agora = new Date()) {
  const user = await base44.auth.me();
  if (!user) {
    return { user: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (user.role === "admin") return { user, acesso: { temAcesso: true, motivo: "admin_beta" }, response: null };

  const [configs, entitlements] = await Promise.all([
    base44.asServiceRole.entities.ConfiguracaoAddonCustos.filter({ chave: "laboratorio_custos" }),
    base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: "laboratorio_custos" }),
  ]);
  const config = (configs || [])[0] || null;
  const entitlement = (entitlements || []).find((e: any) => e.status === "ativo") || (entitlements || [])[0] || null;
  const acesso = avaliarAcessoLaboratorioCustosServer(user, config, entitlement, agora);

  if (!acesso.temAcesso) {
    return {
      user,
      acesso,
      response: Response.json({ error: "Acesso ao Laboratório de Custos necessário", code: "cost_lab_access_required", motivo: acesso.motivo }, { status: 403 }),
    };
  }

  return { user, acesso, config, entitlement, response: null };
}
