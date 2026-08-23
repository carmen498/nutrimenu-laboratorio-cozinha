// Cria um pagamento (cartão ou PIX) via Orders API do Mercado Pago para um dos
// planos de assinatura. O preço nunca vem do frontend — é sempre lido de ConfiguracaoPlano.
// A X-Idempotency-Key é derivada no servidor a partir de uma tentativa UUID gerada
// no navegador. Repetições automáticas da MESMA tentativa reutilizam a mesma chave.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { ativarPlanoEEnviarEmail } from "../../shared/ativarAssinaturaPagamento.ts";
import { VERSAO_TERMOS_ATUAL, VERSAO_PRIVACIDADE_ATUAL } from "../../shared/versaoDocumentosLegais.ts";
import { resumirErroOperacional } from "../../shared/governancaLogs.ts";
import { resolverStatusOrderMercadoPago } from "../../shared/statusMercadoPago.ts";
import { avaliarElegibilidadeRenovacao } from "../../shared/regraRenovacao.ts";
import { validarParcelamentoPlano } from "../../shared/parcelamentoPlanos.ts";

const PLANOS_VALIDOS = ["mensal", "anual", "renovacao"];
const FORMAS_VALIDAS = ["cartao", "pix"];
const NOME_PLANOS: Record<string, string> = {
  mensal: "Plano 30 dias — Laboratório de Cozinha",
  anual: "Plano Anual — Laboratório de Cozinha",
  renovacao: "Renovação Anual — Laboratório de Cozinha",
};

// Identificador fixo desta versão do código — altere sempre que este arquivo for editado,
// para confirmar (via campo versao_codigo do Pagamento) se uma tentativa real do usuário
// rodou o deploy mais recente ou uma versão anterior ainda em propagação.
const VERSAO_CODIGO = "v10-2026-08-23-homologacao-prod";

async function derivarIdempotencyKey(usuarioId: string, tentativaId: unknown): Promise<string> {
  const tentativa = typeof tentativaId === "string" && /^[0-9a-f-]{36}$/i.test(tentativaId)
    ? tentativaId.toLowerCase()
    : crypto.randomUUID();
  const bytes = new TextEncoder().encode(`${usuarioId}:${tentativa}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { plano, forma_pagamento, token, installments, payer, aceite_termos, tentativa_id } = body;

    if (aceite_termos !== true) {
      return Response.json({
        error: "É necessário aceitar os Termos de Uso e a Política de Privacidade para concluir a contratação",
        code: "legal_acceptance_required",
      }, { status: 400 });
    }
    if (user.role !== "admin" && user.termos_versao_aceita !== VERSAO_TERMOS_ATUAL) {
      return Response.json({
        error: "Aceite a versão vigente dos Termos de Uso antes de contratar um plano",
        code: "current_terms_acceptance_required",
      }, { status: 409 });
    }
    if (!PLANOS_VALIDOS.includes(plano)) {
      return Response.json({ error: "Plano inválido" }, { status: 400 });
    }
    if (plano === "renovacao") {
      const elegibilidade = avaliarElegibilidadeRenovacao(user);
      if (!elegibilidade.elegivel) {
        return Response.json({
          error: "Renovação indisponível para esta assinatura neste momento",
          code: "renovacao_indisponivel",
          motivo: elegibilidade.motivo,
          dias_para_expiracao: elegibilidade.diasParaExpiracao ?? null,
        }, { status: 409 });
      }
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
    const cpfLimpo = typeof payer?.cpf === "string" ? payer.cpf.replace(/\D/g, "") : "";
    if (forma_pagamento === "pix" && !cpfLimpo) {
      return Response.json({ error: "CPF do pagador é obrigatório para pagamento via PIX" }, { status: 400 });
    }

    // Preço vem sempre do servidor (ConfiguracaoPlano), nunca do frontend — é a mesma
    // fonte editada pelo admin em Administração > Planos e exibida na tela pública.
    const configsPlano = await base44.asServiceRole.entities.ConfiguracaoPlano.filter({ plano_id: plano });
    const configPlano = configsPlano?.[0];
    if (!configPlano || configPlano.valor_cobranca == null) {
      return Response.json({ error: `Preço não configurado para o plano ${plano}` }, { status: 500 });
    }
    const valor = Number(configPlano.valor_cobranca);
    if (!(valor > 0)) {
      return Response.json({ error: `Preço inválido para o plano ${plano}` }, { status: 500 });
    }
    const valorFormatado = valor.toFixed(2);
    const parcelas = forma_pagamento === "cartao" ? (parseInt(installments, 10) || 1) : 1;
    const parcelamento = validarParcelamentoPlano(plano, parcelas);
    if (!parcelamento.valido) {
      return Response.json({
        error: `Parcelamento inválido para o plano ${plano}. Máximo permitido: ${parcelamento.maximo}x`,
        code: "parcelamento_invalido",
        max_parcelas: parcelamento.maximo,
      }, { status: 400 });
    }

    // A prova da contratação é gerada no servidor no instante da tentativa.
    // O frontend informa apenas que houve ação explícita; versão e timestamp
    // nunca são aceitos do cliente.
    const aceiteContratacaoEm = new Date().toISOString();

    // A tentativa é criada no frontend uma única vez por clique. Se a chamada HTTP
    // for repetida automaticamente, o mesmo tentativa_id gera a mesma chave no MP.
    const idempotencyKey = await derivarIdempotencyKey(user.id, tentativa_id);

    // Se a MESMA tentativa já chegou ao backend anteriormente, reutiliza o registro
    // interno e não chama a API do Mercado Pago de novo.
    const pagamentosExistentes = await base44.asServiceRole.entities.Pagamento.filter({ idempotency_key: idempotencyKey });
    const pagamentoExistente = (pagamentosExistentes || []).find((p: any) => p.usuario_id === user.id);
    if (pagamentoExistente && (pagamentoExistente.mercadopago_order_id || pagamentoExistente.status !== "pending")) {
      const respostaExistente = {
        pagamentoId: pagamentoExistente.id,
        orderId: pagamentoExistente.mercadopago_order_id || null,
        status: pagamentoExistente.status,
        qrCode: pagamentoExistente.qr_code || null,
        qrCodeBase64: pagamentoExistente.qr_code_base64 || null,
        idempotent: true,
      };
      if (["rejected", "cancelled", "estornado"].includes(pagamentoExistente.status)) {
        return Response.json({
          error: pagamentoExistente.status === "rejected" ? "Pagamento recusado" : "Pagamento não concluído",
          ...respostaExistente,
        }, { status: 400 });
      }
      return Response.json(respostaExistente);
    }

    // Se houve falha de rede depois de criar o registro interno, mas antes de salvar
    // o order_id, uma repetição da MESMA tentativa reutiliza o registro e a mesma
    // X-Idempotency-Key para consultar/criar com segurança no Mercado Pago.
    const pagamento = pagamentoExistente || await base44.asServiceRole.entities.Pagamento.create({
      usuario_id: user.id,
      plano,
      forma_pagamento,
      valor,
      parcelas,
      status: "pending",
      idempotency_key: idempotencyKey,
      termos_aceitos_em: aceiteContratacaoEm,
      termos_versao_aceita: VERSAO_TERMOS_ATUAL,
      privacidade_versao_aceita: VERSAO_PRIVACIDADE_ATUAL,
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
        // CPF exigido pelo Mercado Pago para pagamentos PIX no Brasil.
        ...(forma_pagamento === "pix" && cpfLimpo ? { identification: { type: "CPF", number: cpfLimpo } } : {}),
      },
    };

    // A Orders API não aceita a propriedade "items" em pedidos PIX (retorna
    // HTTP 400 "unsupported_properties") — só é suportada no fluxo de cartão.
    if (forma_pagamento === "cartao") {
      orderBody.items = [
        {
          title: descricaoPlano,
          description: descricaoPlano,
          unit_price: valorFormatado,
          quantity: 1,
        },
      ];
    }

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
      console.log("Mercado Pago recusou a criação da order", { http_status: mpResponse.status, pagamento_id: pagamento.id });
      const causaDetalhada = Array.isArray(mpData?.cause) && mpData.cause.length
        ? mpData.cause.map((c: any) => c.description || c.code).join("; ")
        : Array.isArray(mpData?.errors) && mpData.errors.length
          ? mpData.errors.map((e: any) => `${e.code || ""} ${e.message || ""}`.trim()).join("; ")
          : null;
      const mensagemPrincipal = mpData?.message || mpData?.error || causaDetalhada || "sem mensagem";
      const detalheSeguro = resumirErroOperacional(`HTTP ${mpResponse.status} — ${mensagemPrincipal}${causaDetalhada && mensagemPrincipal !== causaDetalhada ? ` (${causaDetalhada})` : ""}`);
      const orderIdFalha = mpData?.data?.id || mpData?.id || undefined;
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, {
        status: "rejected",
        detalhe_erro: detalheSeguro.slice(0, 500),
        ...(orderIdFalha ? { mercadopago_order_id: orderIdFalha } : {}),
      });
      return Response.json({
        error: "Não foi possível processar o pagamento",
        detalhe: detalheSeguro.slice(0, 300),
        pagamentoId: pagamento.id,
        status: "rejected",
      }, { status: 400 });
    }

    console.log("Order criada no Mercado Pago", { order_id: mpData?.id || null, status: mpData?.status || null, pagamento_id: pagamento.id });

    const pagamentoTransacao = mpData?.transactions?.payments?.[0];
    const qrCode = pagamentoTransacao?.payment_method?.qr_code
      || mpData?.point_of_interaction?.transaction_data?.qr_code
      || null;
    const qrCodeBase64 = pagamentoTransacao?.payment_method?.qr_code_base64
      || mpData?.point_of_interaction?.transaction_data?.qr_code_base64
      || null;

    const statusOrder = resolverStatusOrderMercadoPago(mpData);

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
    } else if (["rejected", "cancelled", "estornado"].includes(statusOrder)) {
      return Response.json({
        error: statusOrder === "rejected" ? "Pagamento recusado" : "Pagamento não concluído",
        pagamentoId: pagamento.id,
        orderId: mpData?.id,
        status: statusOrder,
      }, { status: 400 });
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