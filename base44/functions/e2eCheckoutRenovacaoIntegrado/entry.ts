import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const USER_ID = '6a8c4db1844fdf64672f1f5c';
const EMAIL = 'nutrimenu-e2e-mt7av3joda2596@emalupe.com';
const PUBLIC_KEY = 'APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2';

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.id !== USER_ID || user.email !== EMAIL) return Response.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const scenario = body?.scenario === 'rejected' ? 'OTHE' : 'APRO';
  const tentativa = typeof body?.tentativa_id === 'string' ? body.tentativa_id : crypto.randomUUID();
  const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_number: '5480832801033311', security_code: '123', expiration_month: 11, expiration_year: 2030,
      cardholder: { name: scenario, identification: { type: 'CPF', number: '12345678909' } },
    }),
  });
  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.id) return Response.json({ error: 'sandbox_card_token_failed', http_status: tokenRes.status }, { status: 502 });
  try {
    const result = await base44.functions.invoke('criarPagamentoMercadoPago', {
      plano: 'renovacao', tentativa_id: tentativa, forma_pagamento: 'cartao', aceite_termos: true,
      token: tokenData.id, installments: 6, payment_method_id: 'master',
      payer: { email: EMAIL, cpf: '12345678909' }, e2e_sandbox_renovacao: '2026-08-24-integrado',
    });
    return Response.json({ ok: true, tentativa_id: tentativa, checkout: result?.data || result });
  } catch (error: any) {
    return Response.json({ ok: false, tentativa_id: tentativa, checkout_error: error?.response?.data || error?.message || String(error) }, { status: 200 });
  }
}
