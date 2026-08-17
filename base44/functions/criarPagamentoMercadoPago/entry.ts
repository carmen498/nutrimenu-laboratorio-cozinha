// Cria um pagamento (cartão ou PIX) via Orders API do Mercado Pago para um dos
// planos de assinatura. O preço nunca vem do frontend — é sempre lido do AppConfig.
// A X-Idempotency-Key é gerada aqui no servidor, no início da execução, e salva
// junto ao registro Pagamento (status "pending") antes de chamar o Mercado Pago.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { ativarPlanoEEnviarEmail } from "../../shared/ativarAssinaturaPagamento.ts";

const PLANOS_VALIDOS = ["diario", "mensal", "anual"];
const FORMAS_VALIDAS = ["cartao", "pix"];
const NOME_PLANOS: Record<string, string> = {
  diario: "Plano Diário — Laboratório de Cozinha",
  mensal: "Plano Mensal — Laboratório de Cozinha",
  anual: "Plano Anual — Laboratório de Cozinha",
};

// Identificador fixo desta versão do código — altere sempre que este arquivo for editado,
// para confirmar (via campo versao_codigo do Pagamento) se uma tentativa real do usuário
// rodou o deploy mais recente ou uma versão anterior ainda em propagação.
const VERSAO_CODIGO = "v5-2026-08-17-15h33-ativacao-sincrona";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { plano, forma_pagamento, token, installments, payer } = body;

    if (!PLANOS_VALIDOS.includes(plano)) {
      return Response.json({ error: "Plano inválido" }, { status: 400 });
    }
    if (!FORMAS_VALIDAS.includes(forma_pagamento)) {
      return Response.json({ error: "Forma de pagamento inválida" }, { status: 400 });
    }
    if (forma_pagamento === "cartao" && !token) {
      return Response.json({ error: "Token do cartão é obrigatório" }, { status: 400 });
    }
    if (!payer?.email) {
      return Response.json({ error: "E-mail do pagador é obrigatório" }, { status: 400 });
    }

    // Preço vem sempre do servidor (AppConfig), nunca do frontend.
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ chave: `preco_plano_${plano}` });
    const config = configs?.[0];
    if (!config?.valor) {
      return Response.json({ error: `Preço não configurado para o plano ${plano}` }, { status: 500 });
    }
    const valor = parseFloat(config.valor);
    const valorFormatado = valor.toFixed(2);
    const parcelas = forma_pagamento === "cartao" ? (parseInt(installments, 10) || 1) : 1;

    // Chave de idempotência gerada no servidor, por tentativa.
    const idempotencyKey = crypto.randomUUID();

    const pagamento = await base44.asServiceRole.entities.Pagamento.create({
      usuario_id: user.id,
      plano,
      forma_pagamento,
      valor,
      parcelas,
      status: "pending",
      idempotency_key: idempotencyKey,
      versao_codigo: VERSAO_CODIGO,
    });

    const ambiente = secrets.get("AMBIENTE");
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");

    // Em sandbox, o Mercado Pago só aceita e-mails de comprador de teste
    // (terminados em @testuser.com). Como o e-mail real do usuário logado
    // não serve para isso, usamos um comprador de teste fixo nesse ambiente.
    const payerEmail = ambiente === "producao" || payer.email.endsWith("@testuser.com")
      ? payer.email
      : "TEST_USER_360639484@testuser.com";

    if (!accessToken) {
      return Response.json({ error: "Credencial do Mercado Pago não configurada para o ambiente atual" }, { status: 500 });
    }

    const descricaoPlano = NOME_PLANOS[plano];

    // Nome do pagador, para aparecer identificado no painel do Mercado Pago
    // (sem isso o campo "comprador" fica em branco na conciliação).
    const nomeCompleto = (user.full_name || "").trim();
    const [primeiroNome, ...restoNome] = nomeCompleto ? nomeCompleto.split(/\s+/) : [""];
    const sobrenome = restoNome.join(" ");

    const orderBody: Record<string, unknown> = {
      type: "online",
      processing_mode: "automatic",
      external_reference: pagamento.id,
      description: descricaoPlano,
      total_amount: valorFormatado,
      payer: {
        email: payerEmail,
        ...(primeiroNome ? { first_name: primeiroNome } : {}),
        ...(sobrenome ? { last_name: sobrenome } : {}),
      },
      items: [
        {
          id: plano,
          title: descricaoPlano,
          description: descricaoPlano,
          unit_price: valorFormatado,
          quantity: 1,
        },
      ],
    };

    if (forma_pagamento === "pix") {
      orderBody.transactions = {
        payments: [
          {
            amount: valorFormatado,
            payment_method: { id: "pix", type: "bank_transfer" },
          },
        ],
      };
    } else {
      orderBody.transactions = {
        payments: [
          {
            amount: valorFormatado,
            payment_method: {
              id: body.payment_method_id || "master",
              type: "credit_card",
              token,
              installments: parcelas,
            },
          },
        ],
      };
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(orderBody),
    });

    const mpData = await mpResponse.json().catch(() => null);

    if (!mpResponse.ok) {
      console.log("Erro ao criar order no Mercado Pago:", JSON.stringify(mpData));
      const causaDetalhada = Array.isArray(mpData?.cause) && mpData.cause.length
        ? mpData.cause.map((c: any) => c.description || c.code).join("; ")
        : Array.isArray(mpData?.errors) && mpData.errors.length
          ? mpData.errors.map((e: any) => `${e.code || ""} ${e.message || ""}`.trim()).join("; ")
          : null;
      const mensagemPrincipal = mpData?.message || mpData?.error || causaDetalhada || "sem mensagem";
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, {
        status: "rejected",
        detalhe_erro: `HTTP ${mpResponse.status} — ${mensagemPrincipal}${causaDetalhada && mensagemPrincipal !== causaDetalhada ? ` (${causaDetalhada})` : ""}`,
      });
      return Response.json({ error: "Não foi possível processar o pagamento", detalhe: mpData }, { status: 400 });
    }

    console.log("Order criada no Mercado Pago:", JSON.stringify(mpData));

    const pagamentoTransacao = mpData?.transactions?.payments?.[0];
    const qrCode = pagamentoTransacao?.payment_method?.qr_code
      || mpData?.point_of_interaction?.transaction_data?.qr_code
      || null;
    const qrCodeBase64 = pagamentoTransacao?.payment_method?.qr_code_base64
      || mpData?.point_of_interaction?.transaction_data?.qr_code_base64
      || null;

    const statusOrder = mpData?.status === "processed" ? "approved" : "pending";

    await base44.asServiceRole.entities.Pagamento.update(pagamento.id, {
      mercadopago_order_id: mpData?.id,
      status: statusOrder,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
    });

    // Aprovação instantânea (cartão): libera o plano e dispara o e-mail agora mesmo,
    // sem depender do webhook assíncrono. O Pagamento acabou de ser criado como
    // "pending" acima, então essa é sempre a primeira vez que ele vira "approved" —
    // se o webhook chegar depois para esta mesma order, ele vai encontrar o Pagamento
    // já "approved" e pular a reativação (idempotência tratada no webhook).
    if (statusOrder === "approved") {
      await ativarPlanoEEnviarEmail(base44, pagamento);
    }

    return Response.json({
      pagamentoId: pagamento.id,
      orderId: mpData?.id,
      status: statusOrder,
      qrCode,
      qrCodeBase64,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}