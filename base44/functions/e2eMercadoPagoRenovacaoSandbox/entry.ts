import { secrets } from "base44:runtime";

const E2E_KEY = "gxpl05WF6DG6n1X5h8qUz84HrkmWduW_9t__lqAz8hE";
const MP_API = "https://api.mercadopago.com";
const PUBLIC_KEY_SANDBOX = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const VALOR = "99.00";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function mp(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (req.headers.get("x-e2e-key") !== E2E_KEY) return json({ error: "forbidden" }, 403);

    const token = String(secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX") || "").trim();
    if (!token) return json({ ok: false, code: "sandbox_token_missing" }, 500);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "probe");

    if (acao === "probe") {
      const { response, data } = await mp("/users/me", token, { method: "GET" });
      return json({
        ok: response.ok,
        http_status: response.status,
        sandbox_token_present: true,
        account_id: data?.id || null,
        account_email_test: typeof data?.email === "string" ? data.email.endsWith("@testuser.com") : null,
        site_id: data?.site_id || null,
      }, response.ok ? 200 : 502);
    }

    if (acao === "pix") {
      const idem = crypto.randomUUID();
      const externalReference = `e2e-renovacao-pix-${Date.now()}`;
      const payload = {
        type: "online",
        processing_mode: "automatic",
        external_reference: externalReference,
        description: "E2E Renovacao Sandbox - PIX",
        total_amount: VALOR,
        payer: {
          email: "test@testuser.com",
          identification: { type: "CPF", number: "12345678909" },
        },
        transactions: {
          payments: [{
            amount: VALOR,
            payment_method: { id: "pix", type: "bank_transfer" },
          }],
        },
      };
      const created = await mp("/v1/orders", token, {
        method: "POST",
        headers: { "X-Idempotency-Key": idem },
        body: JSON.stringify(payload),
      });
      const orderId = created.data?.id || null;
      const fetched = orderId ? await mp(`/v1/orders/${orderId}`, token, { method: "GET" }) : null;
      const payment = fetched?.data?.transactions?.payments?.[0] || created.data?.transactions?.payments?.[0];
      return json({
        ok: created.response.ok && Boolean(orderId) && Boolean(fetched?.response.ok),
        create_http: created.response.status,
        get_http: fetched?.response.status || null,
        order_id: orderId,
        external_reference: externalReference,
        order_status: fetched?.data?.status || created.data?.status || null,
        payment_status: payment?.status || null,
        payment_status_detail: payment?.status_detail || null,
        qr_code_present: Boolean(payment?.payment_method?.qr_code),
        amount: payment?.amount || null,
        error: created.response.ok ? null : (created.data?.message || created.data?.error || created.data),
      }, created.response.ok ? 200 : 502);
    }

    if (acao === "card_token") {
      const scenario = body?.scenario === "rejected" ? "OTHE" : "APRO";
      const tokenResponse = await fetch(`${MP_API}/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC_KEY_SANDBOX)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_number: "5480832801033311",
          security_code: "123",
          expiration_month: 11,
          expiration_year: 2030,
          cardholder: {
            name: scenario,
            identification: { type: "CPF", number: "12345678909" },
          },
        }),
      });
      const tokenData = await tokenResponse.json().catch(() => null);
      return json({
        ok: tokenResponse.ok && Boolean(tokenData?.id),
        http_status: tokenResponse.status,
        scenario,
        token_id: tokenData?.id || null,
        payment_method_id: tokenData?.payment_method_id || null,
        error: tokenResponse.ok ? null : (tokenData?.message || tokenData?.error || tokenData),
      }, tokenResponse.ok ? 200 : 502);
    }

    if (acao === "card_order") {
      const cardToken = String(body?.card_token || "");
      const scenario = body?.scenario === "rejected" ? "rejected" : "approved";
      if (!cardToken) return json({ error: "card_token_required" }, 400);
      const installments = Number(body?.installments || 6);
      const idem = String(body?.idempotency_key || crypto.randomUUID());
      const externalReference = String(body?.external_reference || `e2e-renovacao-card-${scenario}-${Date.now()}`);
      const payload = {
        type: "online",
        processing_mode: "automatic",
        external_reference: externalReference,
        description: `E2E Renovacao Sandbox - Card ${scenario}`,
        total_amount: VALOR,
        payer: { email: "test@testuser.com" },
        items: [{ title: "Renovacao anual", description: "Renovacao anual", unit_price: VALOR, quantity: 1 }],
        transactions: {
          payments: [{
            amount: VALOR,
            payment_method: {
              id: "master",
              type: "credit_card",
              token: cardToken,
              installments,
            },
          }],
        },
      };
      const created = await mp("/v1/orders", token, {
        method: "POST",
        headers: { "X-Idempotency-Key": idem },
        body: JSON.stringify(payload),
      });
      const orderId = created.data?.id || null;
      const fetched = orderId ? await mp(`/v1/orders/${orderId}`, token, { method: "GET" }) : null;
      const payment = fetched?.data?.transactions?.payments?.[0] || created.data?.transactions?.payments?.[0];
      return json({
        ok: created.response.ok && Boolean(orderId),
        create_http: created.response.status,
        get_http: fetched?.response.status || null,
        order_id: orderId,
        external_reference: externalReference,
        idempotency_key_echo: idem,
        order_status: fetched?.data?.status || created.data?.status || null,
        order_status_detail: fetched?.data?.status_detail || created.data?.status_detail || null,
        payment_status: payment?.status || null,
        payment_status_detail: payment?.status_detail || null,
        amount: payment?.amount || null,
        installments: payment?.payment_method?.installments || installments,
        error: created.response.ok ? null : (created.data?.message || created.data?.error || created.data),
      }, created.response.ok ? 200 : 502);
    }

    if (acao === "get_order") {
      const orderId = String(body?.order_id || "");
      if (!orderId) return json({ error: "order_id_required" }, 400);
      const fetched = await mp(`/v1/orders/${encodeURIComponent(orderId)}`, token, { method: "GET" });
      const payment = fetched.data?.transactions?.payments?.[0];
      return json({
        ok: fetched.response.ok,
        http_status: fetched.response.status,
        order_id: fetched.data?.id || orderId,
        order_status: fetched.data?.status || null,
        order_status_detail: fetched.data?.status_detail || null,
        payment_status: payment?.status || null,
        payment_status_detail: payment?.status_detail || null,
        amount: payment?.amount || null,
        external_reference: fetched.data?.external_reference || null,
      }, fetched.response.ok ? 200 : 502);
    }

    if (acao === "refund") {
      const orderId = String(body?.order_id || "");
      if (!orderId) return json({ error: "order_id_required" }, 400);
      const idem = crypto.randomUUID();
      const refunded = await mp(`/v1/orders/${encodeURIComponent(orderId)}/refund`, token, {
        method: "POST",
        headers: { "X-Idempotency-Key": idem },
      });
      const fetched = await mp(`/v1/orders/${encodeURIComponent(orderId)}`, token, { method: "GET" });
      return json({
        ok: refunded.response.ok && fetched.response.ok,
        refund_http: refunded.response.status,
        get_http: fetched.response.status,
        order_id: orderId,
        refund_status: refunded.data?.status || null,
        order_status: fetched.data?.status || null,
        order_status_detail: fetched.data?.status_detail || null,
        refunds: Array.isArray(fetched.data?.transactions?.refunds) ? fetched.data.transactions.refunds.length : 0,
        error: refunded.response.ok ? null : (refunded.data?.message || refunded.data?.error || refunded.data),
      }, refunded.response.ok ? 200 : 502);
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "unknown_error" }, 500);
  }
}
