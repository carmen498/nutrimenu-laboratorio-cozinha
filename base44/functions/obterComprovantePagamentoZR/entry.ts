import { createClientFromRequest } from "npm:@base44/sdk@0.8.48";
import { secrets } from "base44:runtime";
import { DADOS_EMPRESA } from "../../shared/dadosEmpresa.ts";
import { resolverPagadorFiscal } from "../../shared/dadosFiscaisPagador.ts";
import { ofertaZR } from "../../shared/guiaTecnicoZR.ts";
import { resolverStatusOrderMercadoPago } from "../../shared/statusMercadoPago.ts";
import { finalizarEstornoConfirmado } from "../../shared/processarDesistencia.ts";

const MENSAGEM_MP_INDISPONIVEL = "Não conseguimos falar com o Mercado Pago agora para confirmar os dados deste comprovante. Seu pagamento e seu acesso não foram afetados. Tente de novo em alguns minutos.";

function tokenMercadoPago() {
  const ambiente = String(secrets.get("AMBIENTE") || "").trim().toLowerCase();
  return ambiente === "producao"
    ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
    : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
}

function isoOuNull(valor: any) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isFinite(data.getTime()) ? data.toISOString() : null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { pagamento_id } = await req.json().catch(() => ({}));
    const pagamento = pagamento_id
      ? await base44.asServiceRole.entities.Pagamento.get(pagamento_id).catch(() => null)
      : null;
    if (!pagamento || pagamento.usuario_id !== user.id || !ofertaZR(pagamento.plano)) {
      return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }
    if (!pagamento.mercadopago_order_id) {
      return Response.json({ error: "Este pagamento não possui uma transação confirmada." }, { status: 409 });
    }

    const pagador = resolverPagadorFiscal(user);
    if (pagador.faltando.length) {
      return Response.json({
        error: `Complete os dados fiscais em Minha Conta antes de gerar o comprovante: ${pagador.faltando.join(", ")}.`,
        code: "dados_fiscais_incompletos",
        faltando: pagador.faltando,
      }, { status: 409 });
    }

    const token = tokenMercadoPago();
    if (!token) {
      console.error("Token do Mercado Pago ausente ao gerar comprovante", { pagamento_id });
      return Response.json({ error: MENSAGEM_MP_INDISPONIVEL }, { status: 503 });
    }
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/orders/${pagamento.mercadopago_order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const order = await mpResponse.json().catch(() => null);
    if (!mpResponse.ok || !order) {
      console.error("Falha ao confirmar dados do comprovante no Mercado Pago", {
        pagamento_id, order_id: pagamento.mercadopago_order_id, http_status: mpResponse.status,
      });
      return Response.json({ error: MENSAGEM_MP_INDISPONIVEL }, { status: 503 });
    }

    const transacao = order?.transactions?.payments?.[0] || {};
    const statusReal = resolverStatusOrderMercadoPago(order);
    const transacaoId = transacao?.id == null ? null : String(transacao.id);
    const pagoEm = isoOuNull(transacao?.date_approved || transacao?.date_created)
      || pagamento.pago_em || null;
    const estornadoEm = isoOuNull(transacao?.date_last_updated || order?.last_updated_date)
      || pagamento.estornado_em || null;
    const valorEstornado = Number(
      transacao?.amount_refunded ?? order?.total_refunded_amount ?? pagamento.valor_estornado ?? 0
    );

    if (statusReal === "estornado" && pagamento.status !== "estornado") {
      await finalizarEstornoConfirmado(base44, pagamento, null, "abertura_comprovante", {
        mercadopago_payment_id: transacaoId,
        estornado_em: estornadoEm,
        valor_estornado: valorEstornado || Number(pagamento.valor || 0),
      });
    } else {
      const atualizacao: Record<string, any> = {};
      if (transacaoId && transacaoId !== pagamento.mercadopago_payment_id) atualizacao.mercadopago_payment_id = transacaoId;
      if (pagoEm && pagoEm !== pagamento.pago_em) atualizacao.pago_em = pagoEm;
      if (statusReal === "estornado") {
        if (estornadoEm && estornadoEm !== pagamento.estornado_em) atualizacao.estornado_em = estornadoEm;
        if (valorEstornado && valorEstornado !== pagamento.valor_estornado) atualizacao.valor_estornado = valorEstornado;
      }
      if (Object.keys(atualizacao).length) {
        await base44.asServiceRole.entities.Pagamento.update(pagamento.id, atualizacao);
      }
    }

    const acessos = await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.filter({
      user_id: user.id,
      referencia_pagamento_id: pagamento.id,
    });
    const acesso = acessos?.[0] || null;
    const oferta = ofertaZR(pagamento.plano);

    return Response.json({
      emitente: DADOS_EMPRESA,
      pagador: { tipo: pagador.tipo, nome: pagador.nome, cpf_cnpj: pagador.cpf_cnpj },
      plano: oferta?.nome || pagamento.plano,
      acesso: { inicio_em: acesso?.inicio_em || null, fim_em: acesso?.fim_em || null, vitalicio: !!acesso?.vitalicio },
      valor_pago: Number(pagamento.valor || 0),
      forma_pagamento: pagamento.forma_pagamento,
      parcelas: Number(pagamento.parcelas || 1),
      pago_em: pagoEm,
      situacao: statusReal,
      estornado_em: estornadoEm,
      valor_estornado: valorEstornado || (statusReal === "estornado" ? Number(pagamento.valor || 0) : 0),
      transacao: transacaoId || pagamento.mercadopago_payment_id || null,
    });
  } catch (error) {
    console.error("Erro ao gerar comprovante ZR", error);
    return Response.json({ error: MENSAGEM_MP_INDISPONIVEL }, { status: 503 });
  }
}
