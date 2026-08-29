import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { ativarCompraPagamento } from "../../shared/ativarCompraPagamento.ts";

const NONCE = "hml-custos-20260829-6f7d7f8b-21f8-46d6-b23d-a9cfd1c2d6ee";
const USER_ID = "6a8ee59b65972cf2635543cf";
const APP_VERSION = "sandbox-custos-hml-v1-2026-08-29";
const TEST_BUYER_EMAIL = "test@testuser.com";

async function mpJson(url: string, options: RequestInit, accessToken: string) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

async function criarCardToken() {
  const publicKey = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
  const res = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card_number: "5480832801033311",
      expiration_month: 11,
      expiration_year: 2030,
      security_code: "123",
      cardholder: {
        name: "APRO",
        identification: { type: "CPF", number: "12345678909" },
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.id) throw new Error(`card_token_failed:${res.status}:${data?.message || data?.error || "unknown"}`);
  return data.id as string;
}

function resolverStatus(order: any): string {
  const pay = order?.transactions?.payments?.[0];
  const raw = String(pay?.status || order?.status || "pending").toLowerCase();
  if (["approved", "processed", "accredited"].includes(raw)) return "approved";
  if (["rejected", "failed"].includes(raw)) return "rejected";
  if (["cancelled", "canceled", "expired"].includes(raw)) return "cancelled";
  return "pending";
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.nonce !== NONCE) return Response.json({ error: "not_found" }, { status: 404 });
    const plano = body?.plano === "custos_anual" ? "custos_anual" : "custos_mensal";
    const combinado = body?.combinado === true;
    const basePlano = combinado ? (body?.base_plano === "anual" ? "anual" : "mensal") : null;

    const base44 = createClientFromRequest(req);
    const accessToken = secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
    if (!accessToken) return Response.json({ error: "sandbox_token_missing" }, { status: 500 });

    const configs = await base44.asServiceRole.entities.ConfiguracaoPlano.list("ordem", 100);
    const addonConfig = (configs || []).find((p: any) => p.plano_id === plano && p.produto === "laboratorio_custos");
    const baseConfig = basePlano ? (configs || []).find((p: any) => p.plano_id === basePlano && (!p.produto || p.produto === "laboratorio_cozinha")) : null;
    if (!addonConfig || !(Number(addonConfig.valor_cobranca) > 0)) throw new Error("addon_price_missing");
    if (basePlano && (!baseConfig || !(Number(baseConfig.valor_cobranca) > 0))) throw new Error("base_price_missing");

    const valorCustos = Number(addonConfig.valor_cobranca);
    const valorCozinha = baseConfig ? Number(baseConfig.valor_cobranca) : 0;
    const valorTotal = valorCustos + valorCozinha;
    const produtoCompra = combinado ? "cozinha_mais_custos" : "laboratorio_custos";
    const planoPagamento = combinado ? basePlano : plano;

    const cardToken = await criarCardToken();
    const pagamento = await base44.asServiceRole.entities.Pagamento.create({
      usuario_id: USER_ID,
      plano: planoPagamento,
      produto_compra: produtoCompra,
      addon_plano_id: plano,
      valor_cozinha: valorCozinha,
      valor_custos: valorCustos,
      forma_pagamento: "cartao",
      valor: valorTotal,
      parcelas: 1,
      status: "pending",
      idempotency_key: `hml:${crypto.randomUUID()}`,
      versao_codigo: APP_VERSION,
    });

    const descricao = combinado
      ? `Laboratório de Cozinha ${basePlano} + Laboratório de Custos ${plano}`
      : `Laboratório de Custos ${plano}`;
    const idempotencyKey = crypto.randomUUID();
    const orderBody: any = {
      type: "online",
      processing_mode: "automatic",
      external_reference: pagamento.id,
      total_amount: valorTotal.toFixed(2),
      payer: { email: TEST_BUYER_EMAIL },
      transactions: {
        payments: [{
          amount: valorTotal.toFixed(2),
          payment_method: {
            id: "master",
            type: "credit_card",
            token: cardToken,
            installments: 1,
          },
        }],
      },
    };

    const { res, data } = await mpJson("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify(orderBody),
    }, accessToken);

    if (!res.ok) {
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, {
        status: "rejected",
        detalhe_erro: `sandbox hml HTTP ${res.status}: ${data?.message || data?.error || "unknown"}`.slice(0, 500),
      });
      return Response.json({
        ok: false,
        etapa: "order",
        http_status: res.status,
        pagamento_id: pagamento.id,
        mp_error: data?.message || data?.error || null,
        mp_cause: data?.cause || data?.errors || null,
        mp_validation: data ? {
          code: data.code || null,
          message: data.message || null,
          error: data.error || null,
          details: data.details || null,
          errors: data.errors || null,
          cause: data.cause || null,
        } : null,
      }, { status: 200 });
    }

    const status = resolverStatus(data);
    await base44.asServiceRole.entities.Pagamento.update(pagamento.id, {
      mercadopago_order_id: data?.id || "",
      status,
    });
    const pagamentoAtualizado = await base44.asServiceRole.entities.Pagamento.get(pagamento.id);
    if (status === "approved") await ativarCompraPagamento(base44, pagamentoAtualizado);

    return Response.json({
      ok: true,
      ambiente: "sandbox",
      plano,
      combinado,
      base_plano: basePlano,
      valor_custos: valorCustos,
      valor_cozinha: valorCozinha,
      valor_total: valorTotal,
      pagamento_id: pagamento.id,
      order_id: data?.id || null,
      payment_id: data?.transactions?.payments?.[0]?.id || null,
      status,
      status_detail: data?.transactions?.payments?.[0]?.status_detail || null,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
