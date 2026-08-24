import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { avaliarElegibilidadeRenovacao } from '../../shared/regraRenovacao.ts';
import { validarParcelamentoPlano } from '../../shared/parcelamentoPlanos.ts';
import { ativarPlanoEEnviarEmail } from '../../shared/ativarAssinaturaPagamento.ts';
import { resolverStatusOrderMercadoPago } from '../../shared/statusMercadoPago.ts';
import { VERSAO_TERMOS_ATUAL, VERSAO_PRIVACIDADE_ATUAL } from '../../shared/versaoDocumentosLegais.ts';

const USER_ID = '6a8c4db1844fdf64672f1f5c';
const EMAIL = 'nutrimenu-e2e-mt7av3joda2596@emalupe.com';
const PUBLIC_KEY = 'APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2';
const VERSAO = 'v11-2026-08-23-renovacao-e2e-integrado';

async function idem(userId: string, tentativaId: string) {
  const bytes = new TextEncoder().encode(`${userId}:${tentativaId.toLowerCase()}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.id !== USER_ID || user.email !== EMAIL) return Response.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const scenario = body?.scenario === 'rejected' ? 'OTHE' : 'APRO';
  const tentativa = typeof body?.tentativa_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.tentativa_id) ? body.tentativa_id : crypto.randomUUID();
  if (user.termos_versao_aceita !== VERSAO_TERMOS_ATUAL) return Response.json({ error: 'current_terms_acceptance_required' }, { status: 409 });
  const eleg = avaliarElegibilidadeRenovacao(user);
  if (!eleg.elegivel) return Response.json({ error: 'renovacao_indisponivel', motivo: eleg.motivo }, { status: 409 });
  const parcelas = Number(body?.installments || 6);
  const parcelamento = validarParcelamentoPlano('renovacao', parcelas);
  if (!parcelamento.valido) return Response.json({ error: 'parcelamento_invalido', max_parcelas: parcelamento.maximo }, { status: 400 });
  const cfg = (await base44.asServiceRole.entities.ConfiguracaoPlano.filter({ plano_id: 'renovacao' }))?.[0];
  const valor = Number(cfg?.valor_cobranca);
  if (!(valor > 0)) return Response.json({ error: 'preco_invalido' }, { status: 500 });
  const key = await idem(user.id, tentativa);
  const existentes = await base44.asServiceRole.entities.Pagamento.filter({ idempotency_key: key });
  const existente = (existentes || []).find((p: any) => p.usuario_id === user.id);
  if (existente && (existente.mercadopago_order_id || existente.status !== 'pending')) {
    return Response.json({ ok: true, pagamentoId: existente.id, orderId: existente.mercadopago_order_id || null, status: existente.status, idempotent: true, tentativa_id: tentativa });
  }
  const pagamento = existente || await base44.asServiceRole.entities.Pagamento.create({
    usuario_id: user.id, plano: 'renovacao', forma_pagamento: 'cartao', valor, parcelas, status: 'pending',
    idempotency_key: key, termos_aceitos_em: new Date().toISOString(), termos_versao_aceita: VERSAO_TERMOS_ATUAL,
    privacidade_versao_aceita: VERSAO_PRIVACIDADE_ATUAL, versao_codigo: VERSAO,
  });
  const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_number: '5480832801033311', security_code: '123', expiration_month: 11, expiration_year: 2030,
      cardholder: { name: scenario, identification: { type: 'CPF', number: '12345678909' } } }),
  });
  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.id) return Response.json({ error: 'sandbox_card_token_failed' }, { status: 502 });
  const accessToken = secrets.get('MERCADOPAGO_ACCESS_TOKEN_SANDBOX');
  const mpRes = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Idempotency-Key': key },
    body: JSON.stringify({ type: 'online', processing_mode: 'automatic', external_reference: pagamento.id,
      description: 'Renovação Anual — Laboratório de Cozinha', total_amount: valor.toFixed(2),
      payer: { email: 'TEST_USER_360639484@testuser.com' },
      items: [{ title: 'Renovação Anual — Laboratório de Cozinha', description: 'Renovação Anual — Laboratório de Cozinha', unit_price: valor.toFixed(2), quantity: 1 }],
      transactions: { payments: [{ amount: valor.toFixed(2), payment_method: { id: 'master', type: 'credit_card', token: tokenData.id, installments: parcelas } }] } }),
  });
  const mp = await mpRes.json().catch(() => null);
  if (!mpRes.ok) {
    const orderId = mp?.data?.id || mp?.id || undefined;
    await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: 'rejected', detalhe_erro: `E2E sandbox HTTP ${mpRes.status}` , ...(orderId ? { mercadopago_order_id: orderId } : {}) });
    return Response.json({ ok: false, pagamentoId: pagamento.id, orderId: orderId || null, status: 'rejected', tentativa_id: tentativa, provider_http: mpRes.status });
  }
  const status = resolverStatusOrderMercadoPago(mp);
  await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { mercadopago_order_id: mp.id, status });
  if (status === 'approved') await ativarPlanoEEnviarEmail(base44, pagamento);
  return Response.json({ ok: true, pagamentoId: pagamento.id, orderId: mp.id, status, idempotent: false, tentativa_id: tentativa, valor, parcelas, versao_codigo: VERSAO });
}
