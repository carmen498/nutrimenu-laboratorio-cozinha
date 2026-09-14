import { secrets } from "base44:runtime";
import { sendEmailViaResend } from "./resendEmail.ts";
import { renderTemplateEmail } from "./templateEmail.ts";
import { revogarCompraEstorno } from "./revogarCompraEstorno.ts";
import { registrarLogEmail, resumirErroOperacional } from "./governancaLogs.ts";
import { resolverStatusOrderMercadoPago } from "./statusMercadoPago.ts";
import { dataHoraUtcBase44, formatarPrazoDesistenciaBrasilia } from "./prazoDesistencia.ts";

const MP_BASE = "https://api.mercadopago.com/v1/orders";
const BACKOFF_MINUTOS = [15, 60, 360, 1440];

function accessTokenMercadoPago(): string {
  const ambiente = String(secrets.get("AMBIENTE") || "").trim().toLowerCase();
  return ambiente === "producao"
    ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
    : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
}

function proximaTentativa(tentativas: number): string {
  const minutos = BACKOFF_MINUTOS[Math.min(Math.max(tentativas - 1, 0), BACKOFF_MINUTOS.length - 1)];
  return new Date(Date.now() + minutos * 60_000).toISOString();
}

function resumoMp(status: number, data: any): string {
  return resumirErroOperacional(`HTTP ${status} — ${data?.code || data?.error || data?.message || data?.status || "sem detalhe"}`);
}

export function validarCronologiaPedido(pedido: any, pagamento: any, origem: string): boolean {
  const compra = dataHoraUtcBase44(pedido?.compra_em || pagamento?.created_date);
  const solicitacao = dataHoraUtcBase44(pedido?.solicitado_em || pedido?.created_date);
  const valido = Number.isFinite(compra.getTime()) && Number.isFinite(solicitacao.getTime()) && solicitacao.getTime() >= compra.getTime();
  if (!valido) {
    console.error("INCONSISTENCIA_CRONOLOGIA_PEDIDO_DESISTENCIA", {
      origem,
      pedido_id: pedido?.id || null,
      pagamento_id: pagamento?.id || pedido?.pagamento_id || null,
      compra_em: pedido?.compra_em || pagamento?.created_date || null,
      solicitado_em: pedido?.solicitado_em || pedido?.created_date || null,
    });
  }
  return valido;
}

export function criarChaveIdempotenciaReembolso(pedidoId: string): string {
  return `desistencia-refund:${pedidoId}`;
}

async function consultarOrder(orderId: string) {
  const response = await fetch(`${MP_BASE}/${orderId}`, {
    headers: { Authorization: `Bearer ${accessTokenMercadoPago()}` },
  });
  const data = await response.json().catch(() => null);
  return { response, data, status: data ? resolverStatusOrderMercadoPago(data) : "pending" };
}

async function enviarEmailEventoUmaVez(base44: any, params: {
  usuario: any;
  pagamento: any;
  pedido?: any | null;
  tipo: "pagamento_estornado" | "pagamento_contestado" | "pagamento_encerrado";
  origem: string;
}) {
  const { usuario, pagamento, pedido, tipo, origem } = params;
  if (!usuario?.email) return { ok: false, error: "Usuário sem e-mail cadastrado" };

  const eventoChave = `${tipo}:${pagamento.id}`;
  const existentes = await base44.asServiceRole.entities.LogEmail.filter({ evento_chave: eventoChave }).catch(() => []);
  if ((existentes || []).some((item: any) => item.status === "enviado")) {
    return { ok: true, duplicado: true };
  }

  const nome = usuario.nome_completo || usuario.full_name || "";
  const defaults = {
    pagamento_estornado: {
      assunto: "Seu pagamento foi estornado",
      corpo: "<p>Olá {{nome}}, o estorno integral do seu pagamento foi confirmado pelo Mercado Pago.</p><p>O acesso vinculado exclusivamente a esse pagamento foi encerrado. O valor aparecerá conforme o prazo do banco ou da operadora do cartão.</p>",
    },
    pagamento_contestado: {
      assunto: "Contestação registrada no seu pagamento",
      corpo: "<p>Olá {{nome}}, o Mercado Pago informou uma contestação no seu pagamento.</p><p>Por segurança, o acesso vinculado exclusivamente a esse pagamento foi interrompido. Este aviso não significa que você pediu desistência. Se não reconhece a contestação, entre em contato conosco e com o Mercado Pago.</p>",
    },
    pagamento_encerrado: {
      assunto: "Seu pagamento foi encerrado pelo Mercado Pago",
      corpo: "<p>Olá {{nome}}, o Mercado Pago informou que este pagamento foi encerrado.</p><p>O acesso vinculado exclusivamente a esse pagamento foi interrompido. Este aviso não é confirmação de desistência nem alteração da renovação do seu plano. Se precisar de esclarecimentos, fale conosco.</p>",
    },
  } as const;
  const padrao = defaults[tipo];
  const { assunto, html, ativo } = await renderTemplateEmail(base44, tipo, nome, padrao.assunto, padrao.corpo);
  if (!ativo) return { ok: false, error: `Template '${tipo}' está em rascunho` };

  const resultado = await sendEmailViaResend(base44, {
    to: usuario.email,
    subject: assunto,
    html,
    produto: pagamento.produto_compra,
    idempotencyKey: eventoChave,
  });
  await registrarLogEmail(base44, {
    usuarioId: usuario.id,
    email: usuario.email,
    tipo,
    resultado,
    pagamentoId: pagamento.id,
    pedidoDesistenciaId: pedido?.id,
    eventoChave,
    origem,
  });
  return resultado;
}

export async function enviarAvisoClienteEventoPagamento(
  base44: any,
  pagamento: any,
  tipo: "pagamento_contestado" | "pagamento_encerrado",
  origem: string,
) {
  const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  return enviarEmailEventoUmaVez(base44, { usuario, pagamento, tipo, origem });
}

export async function finalizarEstornoConfirmado(
  base44: any,
  pagamento: any,
  pedidoOpcional: any | null = null,
  origem = "webhook_mercado_pago",
  dadosMercadoPago: {
    mercadopago_payment_id?: string | null;
    estornado_em?: string | null;
    valor_estornado?: number | null;
  } = {},
) {
  const agora = new Date().toISOString();
  await base44.asServiceRole.entities.Pagamento.update(pagamento.id, {
    status: "estornado",
    estornado_em: dadosMercadoPago.estornado_em || pagamento.estornado_em || agora,
    valor_estornado: Number(dadosMercadoPago.valor_estornado ?? pagamento.valor_estornado ?? pagamento.valor ?? 0),
    ...(dadosMercadoPago.mercadopago_payment_id
      ? { mercadopago_payment_id: String(dadosMercadoPago.mercadopago_payment_id) }
      : {}),
  });
  const revogacao = await revogarCompraEstorno(base44, pagamento);

  let pedido = pedidoOpcional;
  if (!pedido) {
    const pedidos = await base44.asServiceRole.entities.PedidoDesistencia.filter({ pagamento_id: pagamento.id }).catch(() => []);
    pedido = pedidos?.[0] || null;
  }
  if (pedido && pedido.status !== "concluido") {
    await base44.asServiceRole.entities.PedidoDesistencia.update(pedido.id, {
      status: "concluido",
      concluido_em: agora,
      codigo_resultado_reembolso: "refund_confirmed",
      detalhe_reembolso: "Estorno integral confirmado pelo Mercado Pago.",
      proxima_tentativa_em: null,
    });
  }

  const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  const email = await enviarEmailEventoUmaVez(base44, {
    usuario,
    pagamento,
    pedido,
    tipo: "pagamento_estornado",
    origem,
  });
  if (pedido) {
    await base44.asServiceRole.entities.PedidoDesistencia.update(pedido.id, {
      cliente_email_status: email.ok ? "enviado" : "falhou",
      cliente_email_enviado_em: email.ok ? agora : null,
    });
  }
  return { revogacao, pedido_id: pedido?.id || null, email };
}

export async function avisarSuporteDesistencia(base44: any, pedido: any, pagamento: any, usuario: any) {
  const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }).catch(() => []);
  const dataHora = dataHoraUtcBase44(pedido.solicitado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const prazoLegal = formatarPrazoDesistenciaBrasilia(pagamento.prazo_desistencia_em);
  const valor = Number(pagamento.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const html = `<p><strong>Novo pedido de desistência.</strong></p><p><strong>Cliente:</strong> ${usuario.nome_completo || usuario.full_name || usuario.email}<br><strong>Plano:</strong> ${pedido.plano_nome || pagamento.plano}<br><strong>Valor:</strong> ${valor}<br><strong>Pagamento:</strong> ${pagamento.id}<br><strong>Hora do clique:</strong> ${dataHora} (horário de Brasília)<br><strong>Prazo legal:</strong> ${prazoLegal}</p><p>O estorno automático foi iniciado.</p>`;

  const resultados = [];
  for (const admin of admins || []) {
    if (!admin.email) continue;
    const eventoChave = `desistencia_solicitada_suporte:${pedido.id}:${admin.id}`;
    const resultado = await sendEmailViaResend(base44, {
      to: admin.email,
      subject: `Pedido de desistência — pagamento ${pagamento.id}`,
      html,
      produto: pagamento.produto_compra,
      idempotencyKey: eventoChave,
    });
    await registrarLogEmail(base44, {
      usuarioId: admin.id,
      email: admin.email,
      tipo: "desistencia_solicitada_suporte",
      resultado,
      pagamentoId: pagamento.id,
      pedidoDesistenciaId: pedido.id,
      eventoChave,
      origem: "clique_desistencia",
    });
    resultados.push(resultado);
  }
  const ok = resultados.some((r: any) => r.ok);
  const erro = ok ? "" : resumirErroOperacional(resultados[0]?.error || "Nenhum e-mail de suporte disponível");
  await base44.asServiceRole.entities.PedidoDesistencia.update(pedido.id, {
    suporte_aviso_status: ok ? "enviado" : "falhou",
    suporte_avisado_em: ok ? new Date().toISOString() : null,
    suporte_aviso_erro: erro || null,
  });
  if (!ok) console.error("Falha ao avisar suporte sobre desistência", { pedido_id: pedido.id, erro });
  return { ok, error: erro || undefined };
}

async function avisarFalhaReembolso(base44: any, pedido: any, pagamento: any, detalhe: string) {
  const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }).catch(() => []);
  for (const admin of admins || []) {
    if (!admin.email) continue;
    const eventoChave = `desistencia_falha_reembolso_suporte:${pedido.id}:${pedido.tentativas_reembolso || 0}:${admin.id}`;
    const resultado = await sendEmailViaResend(base44, {
      to: admin.email,
      subject: `Falha no estorno automático — pagamento ${pagamento.id}`,
      html: `<p>O Mercado Pago recusou ou não concluiu o estorno automático.</p><p><strong>Pedido:</strong> ${pedido.id}<br><strong>Pagamento:</strong> ${pagamento.id}<br><strong>Resultado:</strong> ${detalhe}</p><p>O direito de arrependimento permanece registrado e uma nova tentativa foi agendada.</p>`,
      produto: pagamento.produto_compra,
      idempotencyKey: eventoChave,
    });
    await registrarLogEmail(base44, {
      usuarioId: admin.id, email: admin.email, tipo: "desistencia_falha_reembolso_suporte",
      resultado, pagamentoId: pagamento.id, pedidoDesistenciaId: pedido.id,
      eventoChave, origem: "reprocessamento_automatico",
    });
  }
}

async function atualizarPendente(base44: any, pedido: any, status: "aguardando_confirmacao" | "falha_reembolso", tentativas: number, codigo: string, detalhe: string) {
  const dados = {
    status,
    tentativas_reembolso: tentativas,
    ultima_tentativa_em: new Date().toISOString(),
    proxima_tentativa_em: proximaTentativa(tentativas),
    codigo_resultado_reembolso: codigo,
    detalhe_reembolso: detalhe,
  };
  await base44.asServiceRole.entities.PedidoDesistencia.update(pedido.id, dados);
  return { status, resultado: codigo, proxima_tentativa_em: dados.proxima_tentativa_em };
}

export async function processarReembolsoDesistencia(
  base44: any,
  pedido: any,
  pagamento: any,
  opcoes: { consultarAntes?: boolean; origem?: string } = {},
) {
  const orderId = pedido.mercadopago_order_id || pagamento.mercadopago_order_id;
  const chave = pedido.idempotency_key_reembolso || criarChaveIdempotenciaReembolso(pedido.id);
  const tentativas = Number(pedido.tentativas_reembolso || 0) + 1;
  const origem = opcoes.origem || "clique_desistencia";

  if (!orderId) {
    const detalhe = "Pagamento sem mercadopago_order_id.";
    const r = await atualizarPendente(base44, pedido, "falha_reembolso", tentativas, "order_id_ausente", detalhe);
    await avisarFalhaReembolso(base44, { ...pedido, tentativas_reembolso: tentativas }, pagamento, detalhe);
    return r;
  }

  if (opcoes.consultarAntes) {
    try {
      const consulta = await consultarOrder(orderId);
      if (consulta.response.ok && consulta.status === "estornado") {
        await finalizarEstornoConfirmado(base44, pagamento, pedido, origem);
        return { status: "concluido", resultado: "refund_confirmed_by_get" };
      }
      if (!consulta.response.ok) {
        return atualizarPendente(base44, pedido, "aguardando_confirmacao", tentativas, "get_ambiguous", resumoMp(consulta.response.status, consulta.data));
      }
    } catch (error) {
      return atualizarPendente(base44, pedido, "aguardando_confirmacao", tentativas, "get_timeout", resumirErroOperacional(error));
    }
  }

  let response: Response;
  let data: any;
  try {
    response = await fetch(`${MP_BASE}/${orderId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessTokenMercadoPago()}`,
        "X-Idempotency-Key": chave,
      },
    });
    data = await response.json().catch(() => null);
  } catch (error) {
    try {
      const consulta = await consultarOrder(orderId);
      if (consulta.response.ok && consulta.status === "estornado") {
        await finalizarEstornoConfirmado(base44, pagamento, pedido, origem);
        return { status: "concluido", resultado: "refund_confirmed_after_timeout" };
      }
    } catch (_) {
      // A ambiguidade permanece registrada; a próxima execução consultará antes de repetir.
    }
    return atualizarPendente(base44, pedido, "aguardando_confirmacao", tentativas, "post_timeout", resumirErroOperacional(error));
  }

  if (response.ok && resolverStatusOrderMercadoPago(data) === "estornado") {
    await finalizarEstornoConfirmado(base44, pagamento, pedido, origem);
    return { status: "concluido", resultado: "refund_confirmed_by_post" };
  }

  const codigo = String(data?.code || data?.error || `http_${response.status}`);
  const ambiguo = response.ok || response.status >= 500 || response.status === 423 ||
    ["order_refund_already_in_process", "order_already_refunded"].includes(codigo);
  if (ambiguo) {
    try {
      const consulta = await consultarOrder(orderId);
      if (consulta.response.ok && consulta.status === "estornado") {
        await finalizarEstornoConfirmado(base44, pagamento, pedido, origem);
        return { status: "concluido", resultado: "refund_confirmed_after_ambiguous_response" };
      }
    } catch (_) {
      // Aguarda confirmação agendada.
    }
    return atualizarPendente(base44, pedido, "aguardando_confirmacao", tentativas, codigo, resumoMp(response.status, data));
  }

  const detalhe = resumoMp(response.status, data);
  const resultado = await atualizarPendente(base44, pedido, "falha_reembolso", tentativas, codigo, detalhe);
  await avisarFalhaReembolso(base44, { ...pedido, tentativas_reembolso: tentativas }, pagamento, detalhe);
  return resultado;
}
