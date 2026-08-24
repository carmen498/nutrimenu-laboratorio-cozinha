import { secrets } from "base44:runtime";

const KEY = "V4LNlCBIK7biQsdHbj6zCdmwPaA3YPxB3RPy2RTtB-0";
const API = "https://api.mercadopago.com";
const PUBLIC_KEY_SANDBOX = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const VALOR = "99.00";

function out(data: unknown, status = 200) { return Response.json(data, { status }); }
async function mp(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const data = await r.json().catch(() => null);
  return { r, data };
}

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return out({ error: "method_not_allowed" }, 405);
    if (req.headers.get("x-e2e-key") !== KEY) return out({ error: "forbidden" }, 403);
    const token = String(secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX") || "").trim();
    if (!token) return out({ ok: false, code: "sandbox_token_missing" }, 500);
    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "probe");

    if (acao === "probe") {
      const x = await mp("/users/me", token, { method: "GET" });
      return out({ ok: x.r.ok, http_status: x.r.status, sandbox_token_present: true, account_id: x.data?.id || null, account_email_test: typeof x.data?.email === "string" ? x.data.email.endsWith("@testuser.com") : null, site_id: x.data?.site_id || null }, x.r.ok ? 200 : 502);
    }

    if (acao === "pix") {
      const idem = crypto.randomUUID();
      const ref = `e2e-renovacao-pix-${Date.now()}`;
      const payload = { type: "online", processing_mode: "automatic", external_reference: ref, description: "E2E Renovacao Sandbox PIX", total_amount: VALOR, payer: { email: "test@testuser.com", identification: { type: "CPF", number: "12345678909" } }, transactions: { payments: [{ amount: VALOR, payment_method: { id: "pix", type: "bank_transfer" } }] } };
      const c = await mp("/v1/orders", token, { method: "POST", headers: { "X-Idempotency-Key": idem }, body: JSON.stringify(payload) });
      const id = c.data?.id || null;
      const g = id ? await mp(`/v1/orders/${id}`, token, { method: "GET" }) : null;
      const p = g?.data?.transactions?.payments?.[0] || c.data?.transactions?.payments?.[0];
      return out({ ok: c.r.ok && !!id && !!g?.r.ok, create_http: c.r.status, get_http: g?.r.status || null, order_id: id, external_reference: ref, order_status: g?.data?.status || c.data?.status || null, payment_status: p?.status || null, payment_status_detail: p?.status_detail || null, qr_code_present: Boolean(p?.payment_method?.qr_code), amount: p?.amount || null, error: c.r.ok ? null : (c.data?.message || c.data?.error || c.data) }, c.r.ok ? 200 : 502);
    }

    if (acao === "card_token") {
      const scenario = body?.scenario === "rejected" ? "OTHE" : "APRO";
      const r = await fetch(`${API}/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC_KEY_SANDBOX)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_number: "5480832801033311", security_code: "123", expiration_month: 11, expiration_year: 2030, cardholder: { name: scenario, identification: { type: "CPF", number: "12345678909" } } }) });
      const d = await r.json().catch(() => null);
      return out({ ok: r.ok && !!d?.id, http_status: r.status, scenario, token_id: d?.id || null, payment_method_id: d?.payment_method_id || null, error: r.ok ? null : (d?.message || d?.error || d) }, r.ok ? 200 : 502);
    }

    if (acao === "card_order") {
      const cardToken = String(body?.card_token || "");
      if (!cardToken) return out({ error: "card_token_required" }, 400);
      const installments = Number(body?.installments || 6);
      const idem = String(body?.idempotency_key || crypto.randomUUID());
      const scenario = body?.scenario === "rejected" ? "rejected" : "approved";
      const ref = String(body?.external_reference || `e2e-renovacao-card-${scenario}-${Date.now()}`);
      const payload = { type: "online", processing_mode: "automatic", external_reference: ref, description: `E2E Renovacao Sandbox Card ${scenario}`, total_amount: VALOR, payer: { email: "test@testuser.com" }, items: [{ title: "Renovacao anual", description: "Renovacao anual", unit_price: VALOR, quantity: 1 }], transactions: { payments: [{ amount: VALOR, payment_method: { id: "master", type: "credit_card", token: cardToken, installments } }] } };
      const c = await mp("/v1/orders", token, { method: "POST", headers: { "X-Idempotency-Key": idem }, body: JSON.stringify(payload) });
      const id = c.data?.id || null;
      const g = id ? await mp(`/v1/orders/${id}`, token, { method: "GET" }) : null;
      const p = g?.data?.transactions?.payments?.[0] || c.data?.transactions?.payments?.[0];
      return out({ ok: c.r.ok && !!id, create_http: c.r.status, get_http: g?.r.status || null, order_id: id, external_reference: ref, idempotency_key_echo: idem, order_status: g?.data?.status || c.data?.status || null, order_status_detail: g?.data?.status_detail || c.data?.status_detail || null, payment_status: p?.status || null, payment_status_detail: p?.status_detail || null, amount: p?.amount || null, installments: p?.payment_method?.installments || installments, error: c.r.ok ? null : (c.data?.message || c.data?.error || c.data) }, c.r.ok ? 200 : 502);
    }

    if (acao === "get_order") {
      const id = String(body?.order_id || ""); if (!id) return out({ error: "order_id_required" }, 400);
      const g = await mp(`/v1/orders/${encodeURIComponent(id)}`, token, { method: "GET" });
      const p = g.data?.transactions?.payments?.[0];
      return out({ ok: g.r.ok, http_status: g.r.status, order_id: g.data?.id || id, order_status: g.data?.status || null, order_status_detail: g.data?.status_detail || null, payment_status: p?.status || null, payment_status_detail: p?.status_detail || null, amount: p?.amount || null, external_reference: g.data?.external_reference || null }, g.r.ok ? 200 : 502);
    }

    if (acao === "refund") {
      const id = String(body?.order_id || ""); if (!id) return out({ error: "order_id_required" }, 400);
      const r = await mp(`/v1/orders/${encodeURIComponent(id)}/refund`, token, { method: "POST", headers: { "X-Idempotency-Key": crypto.randomUUID() } });
      const g = await mp(`/v1/orders/${encodeURIComponent(id)}`, token, { method: "GET" });
      return out({ ok: r.r.ok && g.r.ok, refund_http: r.r.status, get_http: g.r.status, order_id: id, refund_status: r.data?.status || null, order_status: g.data?.status || null, order_status_detail: g.data?.status_detail || null, refunds: Array.isArray(g.data?.transactions?.refunds) ? g.data.transactions.refunds.length : 0, error: r.r.ok ? null : (r.data?.message || r.data?.error || r.data) }, r.r.ok ? 200 : 502);
    }

    return out({ error: "acao_invalida" }, 400);
  } catch (e) { return out({ error: e instanceof Error ? e.message : "unknown_error" }, 500); }
}
