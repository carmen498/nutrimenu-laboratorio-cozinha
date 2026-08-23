import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

const TIPOS_EMAIL_TRANSACIONAL = [
  "boas_vindas",
  "trial_expirando",
  "trial_vencido",
  "pagamento_aprovado",
  "pagamento_recusado",
  "pagamento_estornado",
  "plano_vencendo",
  "pagamento_pendente_lembrete",
];

function contarPor<T extends Record<string, any>>(itens: T[], campo: keyof T) {
  const contagem: Record<string, number> = {};
  for (const item of itens || []) {
    const chave = String(item?.[campo] ?? "sem_valor");
    contagem[chave] = (contagem[chave] || 0) + 1;
  }
  return contagem;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const ambiente = String(secrets.get("AMBIENTE") || "").trim().toLowerCase();
    const mpProd = Boolean(secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD"));
    const mpSandbox = Boolean(secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX"));
    const webhookSecret = Boolean(secrets.get("MERCADOPAGO_WEBHOOK_SECRET"));
    const resend = Boolean(secrets.get("RESEND_API_KEY"));
    const wascriptToken = Boolean(secrets.get("WASCRIPT_API_TOKEN"));
    const wascriptModoTeste = secrets.get("WASCRIPT_MODO_TESTE") !== "false";

    const [planos, templates, pagamentosRecentes, webhooksRecentes] = await Promise.all([
      base44.asServiceRole.entities.ConfiguracaoPlano.list("ordem", 100),
      base44.asServiceRole.entities.TemplateEmail.list("-created_date", 100),
      base44.asServiceRole.entities.Pagamento.list("-created_date", 20),
      base44.asServiceRole.entities.LogWebhookMercadoPago.list("-created_date", 20),
    ]);

    const mapaPlanos = Object.fromEntries((planos || []).map((p: any) => [p.plano_id, p]));
    const bloqueios: string[] = [];
    const avisos: string[] = [];

    if (!["producao", "sandbox"].includes(ambiente)) {
      bloqueios.push("AMBIENTE deve ser 'producao' ou 'sandbox'.");
    }
    if (ambiente === "producao" && !mpProd) bloqueios.push("Token Mercado Pago de produção ausente.");
    if (ambiente === "sandbox" && !mpSandbox) bloqueios.push("Token Mercado Pago sandbox ausente.");
    if (!webhookSecret) bloqueios.push("MERCADOPAGO_WEBHOOK_SECRET ausente.");
    if (!resend) bloqueios.push("RESEND_API_KEY ausente.");

    for (const id of ["mensal", "anual"]) {
      const plano = mapaPlanos[id];
      if (!plano) {
        bloqueios.push(`Configuração do plano ${id} ausente.`);
        continue;
      }
      if (!(Number(plano.valor_cobranca) > 0)) bloqueios.push(`Plano ${id} sem valor_cobranca válido.`);
      if (!(Number(plano.preco_exibido) >= 0)) bloqueios.push(`Plano ${id} sem preco_exibido válido.`);
    }

    const templatesPorTipo = Object.fromEntries((templates || []).map((t: any) => [t.tipo, t]));
    for (const tipo of TIPOS_EMAIL_TRANSACIONAL) {
      const template = templatesPorTipo[tipo];
      if (template?.status === "rascunho") {
        avisos.push(`Template ${tipo} está em rascunho; o envio transacional ficará desativado.`);
      }
    }

    if (mapaPlanos.renovacao) {
      avisos.push("Plano Renovação existe na configuração, mas o checkout pago atual aceita apenas mensal e anual.");
    }
    if (!wascriptToken || wascriptModoTeste) {
      avisos.push("WhatsApp está sem token ou em modo de teste; não bloqueia o checkout, mas mensagens reais podem não ser enviadas.");
    }

    return Response.json({
      executado_em: new Date().toISOString(),
      go_codigo: bloqueios.length === 0,
      ambiente,
      credenciais: {
        mercadopago_ambiente_atual_configurado: ambiente === "producao" ? mpProd : ambiente === "sandbox" ? mpSandbox : false,
        mercadopago_webhook_secret: webhookSecret,
        resend_api_key: resend,
        wascript_api_token: wascriptToken,
        wascript_modo_teste: wascriptModoTeste,
      },
      planos: ["trial", "mensal", "anual", "renovacao"].map((id) => ({
        plano_id: id,
        configurado: Boolean(mapaPlanos[id]),
        valor_cobranca_configurado: mapaPlanos[id]?.valor_cobranca != null,
        preco_exibido_configurado: mapaPlanos[id]?.preco_exibido != null,
      })),
      templates_email: TIPOS_EMAIL_TRANSACIONAL.map((tipo) => ({
        tipo,
        origem: templatesPorTipo[tipo] ? "admin" : "fallback_codigo",
        status: templatesPorTipo[tipo]?.status || "ativo_por_fallback",
      })),
      operacao_recente: {
        pagamentos_por_status_ultimos_20: contarPor(pagamentosRecentes || [], "status"),
        pagamentos_por_versao_ultimos_20: contarPor(pagamentosRecentes || [], "versao_codigo"),
        webhooks_por_resultado_ultimos_20: contarPor(webhooksRecentes || [], "resultado"),
        webhooks_por_versao_ultimos_20: contarPor(webhooksRecentes || [], "versao_codigo"),
      },
      bloqueios,
      avisos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return Response.json({ error: message }, { status: 500 });
  }
}
