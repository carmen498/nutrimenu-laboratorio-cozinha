import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const [configs, entitlements] = await Promise.all([
      base44.asServiceRole.entities.ConfiguracaoAddonCustos.filter({ chave: "laboratorio_custos" }),
      base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({ modulo: "laboratorio_custos" }),
    ]);

    const bloqueios: string[] = [];
    const avisos: string[] = [];
    if ((configs || []).length > 1) bloqueios.push("Há mais de uma configuração comercial para o Laboratório de Custos.");
    const config = (configs || [])[0] || null;

    if (!config) {
      avisos.push("Configuração comercial ainda não criada; o módulo permanece fechado para clientes.");
    } else {
      if (config.venda_habilitada && !config.modulo_habilitado) bloqueios.push("Venda habilitada com módulo comercial desligado.");
      if (config.venda_habilitada && !(Number(config.preco_exibido) > 0)) bloqueios.push("Venda habilitada sem preço exibido válido.");
      if (config.venda_habilitada && !(Number(config.valor_cobranca) > 0)) bloqueios.push("Venda habilitada sem valor de cobrança server-side válido.");
      if (config.venda_habilitada && !config.periodo_exibido) bloqueios.push("Venda habilitada sem periodicidade definida.");
      if (config.venda_habilitada && !String(config.versao_oferta || "").trim()) bloqueios.push("Venda habilitada sem versão da oferta para rastreabilidade.");
    }

    // O checkout do add-on ainda não foi implementado por decisão de produto.
    // Mantemos este bloqueio explícito para impedir um falso GO comercial.
    const checkoutAddonIntegrado = false;
    if (config?.venda_habilitada && !checkoutAddonIntegrado) bloqueios.push("Checkout/webhook do add-on ainda não está integrado e homologado.");
    if (!config?.venda_habilitada) avisos.push("Venda do add-on permanece desabilitada, como esperado nesta etapa.");

    const porStatus: Record<string, number> = {};
    for (const acesso of entitlements || []) {
      const status = String(acesso.status || "sem_status");
      porStatus[status] = (porStatus[status] || 0) + 1;
    }

    return Response.json({
      executado_em: new Date().toISOString(),
      modulo_habilitado: Boolean(config?.modulo_habilitado),
      venda_habilitada: Boolean(config?.venda_habilitada),
      checkout_addon_integrado: checkoutAddonIntegrado,
      oferta: config ? {
        preco_configurado: Number(config.preco_exibido || 0) > 0,
        valor_cobranca_configurado: Number(config.valor_cobranca || 0) > 0,
        periodo_exibido: config.periodo_exibido || null,
        versao_oferta: config.versao_oferta || null,
      } : null,
      entitlements_por_status: porStatus,
      go_tecnico: bloqueios.filter((b) => !b.includes("Checkout/webhook")).length === 0,
      go_comercial: Boolean(config?.venda_habilitada) && checkoutAddonIntegrado && bloqueios.length === 0,
      bloqueios,
      avisos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return Response.json({ error: message }, { status: 500 });
  }
}
