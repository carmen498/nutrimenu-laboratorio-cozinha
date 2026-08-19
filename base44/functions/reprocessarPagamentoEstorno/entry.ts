// Função administrativa para reprocessar manualmente um pagamento cujo webhook de
// order.refunded não foi aplicado (ex: assinatura inválida do Mercado Pago).
// Só admins podem chamar. Sempre reconsulta a order real no Mercado Pago antes de
// marcar como estornado — nunca confia apenas no pedido do admin.
// Réplica da lógica do ramo "estornado" de webhookMercadoPago/entry.ts (e-mail
// transacional "pagamento_estornado", se o template estiver ativo).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { revogarAcessoEstorno } from "../../shared/revogarAcessoEstorno.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pagamentoId } = await req.json().catch(() => ({}));
    if (!pagamentoId) {
      return Response.json({ error: "pagamentoId é obrigatório" }, { status: 400 });
    }

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(() => null);
    if (!pagamento) {
      return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }
    if (!pagamento.mercadopago_order_id) {
      return Response.json({ error: "Pagamento sem mercadopago_order_id" }, { status: 400 });
    }

    const ambiente = secrets.get("AMBIENTE");
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");

    // Reconsulta a order real no Mercado Pago para confirmar que está de fato
    // reembolsada antes de marcar como estornado.
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/orders/${pagamento.mercadopago_order_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await mpResponse.json().catch(() => null);

    if (!mpResponse.ok || !order) {
      return Response.json({ error: "Não foi possível consultar a order no Mercado Pago", detalhe: order }, { status: 400 });
    }

    const paymentStatus = order.transactions?.payments?.[0]?.status;
    if (paymentStatus !== "refunded") {
      return Response.json({ error: `Order ainda não está reembolsada no Mercado Pago (status do pagamento: ${paymentStatus})` }, { status: 400 });
    }

    await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "estornado" });
    await revogarAcessoEstorno(base44, pagamento.usuario_id);

    const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);

    let emailDisparado = false;
    let emailMotivoNaoDisparo: string | null = null;

    if (usuario?.email) {
      const nome = usuario.nome_completo || usuario.full_name || "";
      const defaultAssunto = "Seu pagamento foi estornado";
      const defaultCorpo = `<p>Olá {{nome}}, informamos que o valor do seu pagamento foi estornado.</p><p>O reembolso será processado pelo Mercado Pago e deve aparecer no seu extrato em alguns dias, conforme o prazo do seu banco ou operadora de cartão.</p><p>Se tiver dúvidas, é só nos chamar.</p>`;

      const { assunto, html, ativo } = await renderTemplateEmail(base44, "pagamento_estornado", nome, defaultAssunto, defaultCorpo);

      if (ativo) {
        const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
        await base44.asServiceRole.entities.LogEmail.create({
          destinatario_email: usuario.email,
          tipo: "pagamento_estornado",
          enviado_em: new Date().toISOString(),
          status: resultado.ok ? "enviado" : "falhou",
        });
        emailDisparado = resultado.ok === true;
        if (!resultado.ok) emailMotivoNaoDisparo = resultado.error || "Falha desconhecida ao enviar";
      } else {
        emailMotivoNaoDisparo = "Template 'pagamento_estornado' está em rascunho (status != ativo) — e-mail não disparado";
      }
    } else {
      emailMotivoNaoDisparo = "Usuário sem e-mail cadastrado";
    }

    // Não há template/gatilho de WhatsApp para "pagamento_estornado" (apenas para
    // pagamento_recusado e plano_vencendo) — nenhum WhatsApp é disparado aqui.

    return Response.json({
      ok: true,
      pagamentoId: pagamento.id,
      status_pagamento_mp: paymentStatus,
      novo_status_pagamento: "estornado",
      email_disparado: emailDisparado,
      email_motivo_nao_disparo: emailMotivoNaoDisparo,
      whatsapp_disparado: false,
      whatsapp_motivo: "Não existe template/gatilho de WhatsApp para pagamento estornado",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}