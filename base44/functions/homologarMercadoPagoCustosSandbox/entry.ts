import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

const NONCE = "hml-webhook-e2e-20260829-6e8cf845-c6f5-4a93-a83b-454fe118a30e";
const USER_ID = "6a8ee59b65972cf2635543cf";
const PUBLIC_KEY = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const WEBHOOK = "https://app.laboratoriodecozinha.com.br/api/apps/6a2b263c4c1cb1e47d54d8b7/functions/webhookMercadoPago";

async function j(res: Response) { return await res.json().catch(() => null); }
async function mp(url: string, opts: RequestInit, token: string) {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  return { res, data: await j(res) };
}
async function cardToken() {
  const res = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC_KEY)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card_number: "5480832801033311", expiration_month: 11, expiration_year: 2030, security_code: "123", cardholder: { name: "APRO", identification: { type: "CPF", number: "12345678909" } } }),
  });
  const data = await j(res);
  if (!res.ok || !data?.id) throw new Error(`card_token_failed:${res.status}`);
  return data.id as string;
}
async function hmacHex(secret: string, manifest: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(manifest));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sendWebhook(orderId: string, action: string, requestId?: string, ts?: string) {
  const secret = String(secrets.get("MERCADOPAGO_WEBHOOK_SECRET") || "").trim();
  if (!secret) throw new Error("webhook_secret_missing");
  const reqId = requestId || crypto.randomUUID();
  const timestamp = ts || String(Date.now());
  const manifest = `id:${orderId.toLowerCase()};request-id:${reqId};ts:${timestamp};`;
  const signature = await hmacHex(secret, manifest);
  const body = { action, api_version: "v1", date_created: new Date().toISOString(), id: crypto.randomUUID(), live_mode: false, type: "order", user_id: "sandbox", data: { id: orderId } };
  const res = await fetch(`${WEBHOOK}?data.id=${encodeURIComponent(orderId)}&type=order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-id": reqId, "x-signature": `ts=${timestamp},v1=${signature}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await j(res), request_id: reqId, ts: timestamp };
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.nonce !== NONCE) return Response.json({ error: "not_found" }, { status: 404 });
    const base44 = createClientFromRequest(req);
    const token = secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
    if (!token) return Response.json({ error: "sandbox_token_missing" }, { status: 500 });
    const acao = String(body?.acao || "");

    if (acao === "card_create") {
      const ct = await cardToken();
      const pagamento = await base44.asServiceRole.entities.Pagamento.create({ usuario_id: USER_ID, plano: "mensal", produto_compra: "cozinha_mais_custos", addon_plano_id: "custos_mensal", valor_cozinha: 29.90, valor_custos: 8.90, valor: 38.80, parcelas: 1, forma_pagamento: "cartao", status: "pending", idempotency_key: `hml-wh-card:${crypto.randomUUID()}`, versao_codigo: "sandbox-webhook-e2e-2026-08-29" });
      const key = crypto.randomUUID();
      const { res, data } = await mp("https://api.mercadopago.com/v1/orders", { method: "POST", headers: { "X-Idempotency-Key": key }, body: JSON.stringify({ type: "online", processing_mode: "automatic", external_reference: pagamento.id, description: "HML webhook card", total_amount: "38.80", payer: { email: "test@testuser.com" }, transactions: { payments: [{ amount: "38.80", payment_method: { id: "master", type: "credit_card", token: ct, installments: 1 } }] } }) }, token);
      if (!res.ok) return Response.json({ ok: false, etapa: "card_order", http_status: res.status, errors: data?.errors || null, pagamento_id: pagamento.id });
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { mercadopago_order_id: data.id });
      return Response.json({ ok: true, pagamento_id: pagamento.id, order_id: data.id, mp_status: data.status, status_detail: data?.transactions?.payments?.[0]?.status_detail || null });
    }

    if (acao === "pix_create") {
      const pagamento = await base44.asServiceRole.entities.Pagamento.create({ usuario_id: USER_ID, plano: "custos_mensal", produto_compra: "laboratorio_custos", addon_plano_id: "custos_mensal", valor_cozinha: 0, valor_custos: 8.90, valor: 8.90, parcelas: 1, forma_pagamento: "pix", status: "pending", idempotency_key: `hml-wh-pix:${crypto.randomUUID()}`, versao_codigo: "sandbox-webhook-e2e-2026-08-29" });
      const key = crypto.randomUUID();
      const { res, data } = await mp("https://api.mercadopago.com/v1/orders", { method: "POST", headers: { "X-Idempotency-Key": key }, body: JSON.stringify({ type: "online", processing_mode: "automatic", external_reference: pagamento.id, description: "HML webhook pix", total_amount: "8.90", payer: { email: "test@testuser.com" }, transactions: { payments: [{ amount: "8.90", payment_method: { id: "pix", type: "bank_transfer" } }] } }) }, token);
      if (!res.ok) return Response.json({ ok: false, etapa: "pix_order", http_status: res.status, errors: data?.errors || null, pagamento_id: pagamento.id });
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { mercadopago_order_id: data.id, qr_code: data?.transactions?.payments?.[0]?.payment_method?.qr_code || null, qr_code_base64: data?.transactions?.payments?.[0]?.payment_method?.qr_code_base64 || null });
      return Response.json({ ok: true, pagamento_id: pagamento.id, order_id: data.id, mp_status: data.status, payment_status: data?.transactions?.payments?.[0]?.status || null });
    }

    if (acao === "webhook") {
      const orderId = String(body?.order_id || "");
      if (!orderId) return Response.json({ error: "order_id_required" }, { status: 400 });
      const out = await sendWebhook(orderId, String(body?.event_action || "order.processed"), body?.request_id, body?.ts);
      return Response.json({ ok: out.status >= 200 && out.status < 300, ...out });
    }

    if (acao === "refund") {
      const pagamento = await base44.asServiceRole.entities.Pagamento.get(String(body?.pagamento_id || "")).catch(() => null);
      if (!pagamento?.mercadopago_order_id) return Response.json({ error: "pagamento_order_missing" }, { status: 400 });
      const { res, data } = await mp(`https://api.mercadopago.com/v1/orders/${pagamento.mercadopago_order_id}/refund`, { method: "POST", headers: { "X-Idempotency-Key": crypto.randomUUID() } }, token);
      return Response.json({ ok: res.ok, http_status: res.status, order_id: pagamento.mercadopago_order_id, mp_status: data?.status || null, status_detail: data?.status_detail || null });
    }

    return Response.json({ error: "acao_invalida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
