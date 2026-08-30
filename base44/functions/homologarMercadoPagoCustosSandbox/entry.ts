import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

const NONCE = "hml-webhook-20260829-0cbef8f9-a7b8-4c64-9d9f-b7b3cc3a34d2";
const USER_ID = "6a8ee59b65972cf2635543cf";
const PUBLIC_KEY = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const WEBHOOK_URL = "https://app.laboratoriodecozinha.com.br/api/apps/6a2b263c4c1cb1e47d54d8b7/functions/webhookMercadoPago";

async function json(res: Response) { return await res.json().catch(() => null); }

async function cardToken() {
  const res = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card_number: "5480832801033311",
      expiration_month: 11,
      expiration_year: 2030,
      security_code: "123",
      cardholder: { name: "APRO", identification: { type: "CPF", number: "12345678909" } },
    }),
  });
  const data = await json(res);
  if (!res.ok || !data?.id) throw new Error(`card_token_failed:${res.status}`);
  return data.id;
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.nonce !== NONCE) return Response.json({ error: "not_found" }, { status: 404 });
    const base44 = createClientFromRequest(req);
    const accessToken = secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
    if (!accessToken) return Response.json({ error: "sandbox_token_missing" }, { status: 500 });

    const token = await cardToken();
    const pagamento = await base44.asServiceRole.entities.Pagamento.create({
      usuario_id: USER_ID,
      plano: "mensal",
      produto_compra: "cozinha_mais_custos",
      addon_plano_id: "custos_mensal",
      valor_cozinha: 29.90,
      valor_custos: 8.90,
      valor: 38.80,
      parcelas: 1,
      forma_pagamento: "cartao",
      status: "pending",
      idempotency_key: `hml-webhook:${crypto.randomUUID()}`,
      versao_codigo: "sandbox-webhook-e2e-2026-08-29",
    });

    const key = crypto.randomUUID();
    const orderRes = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": key,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        external_reference: pagamento.id,
        description: "HML webhook — Cozinha 30 dias + Custos 30 dias",
        total_amount: "38.80",
        notification_url: WEBHOOK_URL,
        payer: { email: "test@testuser.com" },
        transactions: {
          payments: [{
            amount: "38.80",
            payment_method: { id: "master", type: "credit_card", token, installments: 1 },
          }],
        },
      }),
    });
    const order = await json(orderRes);
    if (!orderRes.ok) {
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "rejected", detalhe_erro: `HML webhook order HTTP ${orderRes.status}` });
      return Response.json({ ok: false, http_status: orderRes.status, pagamento_id: pagamento.id, errors: order?.errors || null });
    }
    await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { mercadopago_order_id: order.id });
    const pay = order?.transactions?.payments?.[0] || {};
    return Response.json({ ok: true, pagamento_id: pagamento.id, order_id: order.id, mp_status: order.status, payment_status: pay.status, status_detail: pay.status_detail, notification_url: WEBHOOK_URL });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
