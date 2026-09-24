export const VERSAO_POLITICA_RETENCAO = "2026-08-23-v1";

export function mascararEmail(email: unknown): string {
  const valor = String(email || "").trim().toLowerCase();
  const [local, dominio] = valor.split("@");
  if (!local || !dominio) return "***";
  const prefixo = local.slice(0, Math.min(2, local.length));
  return `${prefixo}***@${dominio}`;
}

export function mascararTelefone(telefone: unknown): string {
  const digits = String(telefone || "").replace(/\D/g, "");
  if (!digits) return "***";
  return `***${digits.slice(-4)}`;
}

export function resumirErroOperacional(erro: unknown): string {
  let texto = "";
  if (typeof erro === "string") texto = erro;
  else if (erro && typeof erro === "object") {
    const e = erro as Record<string, unknown>;
    texto = String(e.message || e.error || e.detail || "");
  }

  return texto
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email-redigido]")
    .replace(/\b\+?\d[\d\s().-]{8,}\d\b/g, "[telefone-redigido]")
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{24,}\b/g, "[segredo-redigido]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export async function registrarLogEmail(
  base44: any,
  params: {
    usuarioId?: string | null;
    email: string;
    tipo: string;
    resultado: { ok?: boolean; detalhe_completo?: unknown; error?: unknown };
    pagamentoId?: string | null;
    pedidoDesistenciaId?: string | null;
    eventoChave?: string | null;
    origem?: string | null;
    detalhe?: string | null;
  },
): Promise<void> {
  const status = params.resultado?.ok ? "enviado" : "falhou";
  await base44.asServiceRole.entities.LogEmail.create({
    usuario_id: params.usuarioId || "",
    pagamento_id: params.pagamentoId || "",
    pedido_desistencia_id: params.pedidoDesistenciaId || "",
    evento_chave: params.eventoChave || "",
    origem: params.origem || "",
    destinatario_email: mascararEmail(params.email),
    tipo: params.tipo,
    enviado_em: new Date().toISOString(),
    status,
    detalhe_erro: status === "falhou"
      ? resumirErroOperacional(params.resultado?.detalhe_completo || params.resultado?.error)
      : params.detalhe || undefined,
  });
}

// Registra que um e-mail transacional foi suprimido (n\u00e3o enviado) ou enviado
// com reda\u00e7\u00e3o neutra por falta de produto_compra. Aparece no SaudeOperacionalTab.
export async function registrarLogSupressao(
  base44: any,
  params: {
    usuarioId?: string | null;
    email?: string | null;
    tipo: string;
    motivo: string;
    pagamentoId?: string | null;
    pedidoDesistenciaId?: string | null;
    eventoChave?: string | null;
    origem?: string | null;
  },
): Promise<void> {
  await base44.asServiceRole.entities.LogEmail.create({
    usuario_id: params.usuarioId || "",
    pagamento_id: params.pagamentoId || "",
    pedido_desistencia_id: params.pedidoDesistenciaId || "",
    evento_chave: params.eventoChave || "",
    origem: params.origem || "",
    destinatario_email: mascararEmail(params.email || ""),
    tipo: params.tipo,
    enviado_em: new Date().toISOString(),
    status: "suprimido",
    detalhe_erro: params.motivo,
  });
}

// Um pagamento é de teste quando o mercadopago_order_id começa com "ORDTST".
// Em caso de dúvida (campo vazio, formato inesperado), retorna false — o e-mail
// sai, porque nenhum pagamento real pode deixar de receber notificação.
export function isPagamentoTeste(pagamento: any): boolean {
  const orderId = String(pagamento?.mercadopago_order_id || "").trim();
  return orderId.startsWith("ORDTST");
}

// Verifica se o pagamento é de teste e, se for, registra a supressão do e-mail
// transacional e retorna true (o chamador deve abortar o envio). Se não for
// teste, retorna false e o envio prossegue normalmente.
export async function suprimirSePagamentoTeste(
  base44: any,
  pagamento: any,
  tipo: string,
  origem: string,
  usuario?: any,
): Promise<boolean> {
  if (!isPagamentoTeste(pagamento)) return false;
  await registrarLogSupressao(base44, {
    usuarioId: usuario?.id || pagamento?.usuario_id || null,
    email: usuario?.email || null,
    tipo,
    motivo: `Pagamento de teste (mercadopago_order_id "${pagamento?.mercadopago_order_id}" começa com ORDTST) — e-mail transacional suprimido.`,
    pagamentoId: pagamento?.id,
    origem,
  });
  return true;
}

export async function registrarLogWhatsapp(
  base44: any,
  params: {
    usuarioId?: string | null;
    telefone: string;
    tipo: string;
    modoTeste: boolean;
    status: "enviado" | "falhou" | "simulado" | "suprimido";
    pagamentoId?: string | null;
    detalhe?: string | null;
  },
): Promise<void> {
  await base44.asServiceRole.entities.LogWhatsapp.create({
    usuario_id: params.usuarioId || "",
    pagamento_id: params.pagamentoId || "",
    destinatario_telefone: mascararTelefone(params.telefone),
    tipo: params.tipo,
    modo_teste: params.modoTeste,
    status: params.status,
    detalhe_erro: params.detalhe || "",
  });
}

// Verifica se o pagamento é de teste e, se for, registra a supressão do WhatsApp
// transacional e retorna true (o chamador deve abortar o envio). Se não for
// teste, retorna false e o envio prossegue normalmente.
export async function suprimirWhatsappSePagamentoTeste(
  base44: any,
  pagamento: any,
  tipo: string,
  origem: string,
  usuario?: any,
): Promise<boolean> {
  if (!isPagamentoTeste(pagamento)) return false;
  const telefone = usuario?.telefone_whatsapp || "";
  await registrarLogWhatsapp(base44, {
    usuarioId: usuario?.id || pagamento?.usuario_id || null,
    pagamentoId: pagamento?.id || null,
    telefone: telefone || "***",
    tipo,
    modoTeste: false,
    status: "suprimido",
    detalhe: `Pagamento de teste (mercadopago_order_id "${pagamento?.mercadopago_order_id}" começa com ORDTST) — WhatsApp transacional suprimido. (origem: ${origem})`,
  });
  return true;
}