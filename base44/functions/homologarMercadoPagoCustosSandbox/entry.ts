import { secrets } from "base44:runtime";

const NONCE = "promote-check-20260830-9c94e6d8-63f1-46df-8d29-5dcb0f7542cb";
const WEBHOOK = "https://app.laboratoriodecozinha.com.br/api/apps/6a2b263c4c1cb1e47d54d8b7/functions/webhookMercadoPago";

async function hmacHex(secret: string, manifest: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(manifest));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.nonce !== NONCE) return Response.json({ error: "not_found" }, { status: 404 });
    const orderId = String(body?.order_id || "");
    if (!orderId) return Response.json({ error: "order_id_required" }, { status: 400 });
    const secret = String(secrets.get("MERCADOPAGO_WEBHOOK_SECRET") || "").trim();
    if (!secret) return Response.json({ error: "webhook_secret_missing" }, { status: 500 });
    const requestId = crypto.randomUUID();
    const ts = String(Date.now());
    const manifest = `id:${orderId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const signature = await hmacHex(secret, manifest);
    const eventBody = { action: "order.refunded", api_version: "v1", date_created: new Date().toISOString(), id: crypto.randomUUID(), live_mode: false, type: "order", user_id: "sandbox", data: { id: orderId } };
    const res = await fetch(`${WEBHOOK}?data.id=${encodeURIComponent(orderId)}&type=order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${signature}` },
      body: JSON.stringify(eventBody),
    });
    const data = await res.json().catch(() => null);
    return Response.json({ ok: res.ok, status: res.status, data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}