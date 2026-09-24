// Rotina agendada: encerra cobranças PIX pendentes há mais de 72 horas.
//
// REGRAS OBRIGATÓRIAS:
// 1. NÃO decide se algo foi pago — só age sobre cobrança cujo estado na origem
//    continua pendente. Antes de encerrar, reconfirma o status no provedor; se
//    voltar aprovado, não encerra e registra "aprovada_fora_prazo".
// 2. Encerrar = marcar como "expirada". Nunca apaga, nunca marca como paga,
//    nunca marca como cancelada pelo cliente.
// 3. Nenhum registro com pagamento aprovado é tocado (o filtro status=pending
//    já garante isso na query; a reconfirmação na origem é a segunda barreira).
// 4. Cada encerramento gera um LogEncerramentoPix com: qual cobrança, quando
//    foi gerada, quando expirou, qual estado conferido na origem.
// 5. Idempotente: a query filtra status=pending; após encerrar, o status vira
//    "expirada" e uma segunda execução não encontra o registro.
//
// Modo simulação: simular=true (padrão) apenas reporta o que faria, sem gravar.
// Modo execução: simular=false aplica o gate de automação (janela + cooldown)
//    e executa os encerramentos de fato.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { obterCredencialMercadoPago } from "../../shared/mercadoPagoCredencial.ts";
import { resolverStatusOrderMercadoPago } from "../../shared/statusMercadoPago.ts";
import { protegerExecucaoAgendada } from "../../shared/protecoesAutomacao.ts";

const VERSAO_CODIGO = "encerrar-pix-v1-2026-09-24";
const LIMITE_HORAS = 72;
const MP_ORDER_URL = "https://api.mercadopago.com/v1/orders";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const simular = body?.simular !== false;

    // Em modo simulação, pula o gate (sem cooldown/janela) para permitir
    // chamadas manuais de diagnóstico a qualquer momento.
    if (!simular) {
      const gate = await protegerExecucaoAgendada(base44, req, {
        chave: "encerrarPixPendenteExpirado",
        cooldownHoras: 20,
        janela: { inicioMinuto: 9 * 60, fimMinuto: 9 * 60 + 30 },
      });
      if (gate.response) return gate.response;
    }

    const limite = new Date(Date.now() - LIMITE_HORAS * 60 * 60 * 1000);

    // Busca todas as cobranças PIX ainda pendentes. O filtro de 72h é aplicado
    // em memória porque a query de entidade não suporta operador $lt em data.
    const pendentes = await base44.asServiceRole.entities.Pagamento.filter({
      forma_pagamento: "pix",
      status: "pending",
    });

    const alvos = (pendentes || []).filter((p: any) => {
      const criado = new Date(p.created_date);
      return Number.isFinite(criado.getTime()) && criado <= limite;
    });

    const { accessToken } = obterCredencialMercadoPago();
    const resultados: any[] = [];
    let expiradas = 0;
    let aprovadasForaPrazo = 0;
    let ignoradas = 0;
    let errosConsulta = 0;

    for (const pagamento of alvos) {
      const orderId = String(pagamento.mercadopago_order_id || "").trim();
      const geradaEm = pagamento.created_date || null;

      if (!orderId) {
        // Sem order_id não há como reconfirmar na origem — não encerra.
        errosConsulta++;
        resultados.push({
          pagamento_id: pagamento.id,
          plano: pagamento.plano,
          valor: pagamento.valor,
          gerada_em: geradaEm,
          acao: "erro_consulta",
          status_origem: null,
          detalhe: "Pagamento sem mercadopago_order_id — impossível reconfirmar na origem.",
        });
        continue;
      }

      // Reconfirma o estado atual no provedor de pagamento.
      let statusOrigem: string | null = null;
      let detalheErro: string | null = null;
      try {
        const mpResp = await fetch(`${MP_ORDER_URL}/${orderId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mpResp.ok) {
          detalheErro = `MP API HTTP ${mpResp.status}`;
        } else {
          const order = await mpResp.json().catch(() => null);
          if (order) {
            statusOrigem = resolverStatusOrderMercadoPago(order);
          } else {
            detalheErro = "Resposta vazia do Mercado Pago.";
          }
        }
      } catch (e: any) {
        detalheErro = `Falha ao consultar MP: ${e?.message || "erro desconhecido"}`;
      }

      // Não conseguiu confirmar o estado — não encerra (regra 1).
      if (statusOrigem === null) {
        errosConsulta++;
        resultados.push({
          pagamento_id: pagamento.id,
          mercadopago_order_id: orderId,
          plano: pagamento.plano,
          valor: pagamento.valor,
          gerada_em: geradaEm,
          acao: "erro_consulta",
          status_origem: null,
          detalhe: detalheErro,
        });
        if (!simular) {
          await base44.asServiceRole.entities.LogEncerramentoPix.create({
            pagamento_id: pagamento.id,
            mercadopago_order_id: orderId,
            acao: "erro_consulta",
            status_origem: "",
            gerada_em: geradaEm,
            expirada_em: null,
            versao_codigo: VERSAO_CODIGO,
            detalhe: detalheErro,
          });
        }
        continue;
      }

      // Aprovado na origem: NÃO toca. Registra como aprovada fora do prazo.
      if (statusOrigem === "approved") {
        aprovadasForaPrazo++;
        resultados.push({
          pagamento_id: pagamento.id,
          mercadopago_order_id: orderId,
          plano: pagamento.plano,
          valor: pagamento.valor,
          gerada_em: geradaEm,
          acao: "aprovada_fora_prazo",
          status_origem: statusOrigem,
        });
        if (!simular) {
          await base44.asServiceRole.entities.LogEncerramentoPix.create({
            pagamento_id: pagamento.id,
            mercadopago_order_id: orderId,
            acao: "aprovada_fora_prazo",
            status_origem: statusOrigem,
            gerada_em: geradaEm,
            expirada_em: null,
            versao_codigo: VERSAO_CODIGO,
            detalhe: "Pagamento aprovado no provedor após 72h — registro preservado.",
          });
        }
        continue;
      }

      // Ainda pendente na origem: encerra.
      if (statusOrigem === "pending") {
        expiradas++;
        const expiradaEm = simular ? null : new Date().toISOString();
        resultados.push({
          pagamento_id: pagamento.id,
          mercadopago_order_id: orderId,
          plano: pagamento.plano,
          valor: pagamento.valor,
          gerada_em: geradaEm,
          acao: "expirada",
          status_origem: statusOrigem,
          expirada_em: expiradaEm,
        });
        if (!simular) {
          await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "expirada" });
          await base44.asServiceRole.entities.LogEncerramentoPix.create({
            pagamento_id: pagamento.id,
            mercadopago_order_id: orderId,
            acao: "expirada",
            status_origem: statusOrigem,
            gerada_em: geradaEm,
            expirada_em: expiradaEm,
            versao_codigo: VERSAO_CODIGO,
            detalhe: "Cobrança PIX pendente há mais de 72h — encerrada após reconfirmação no provedor.",
          });
        }
        continue;
      }

      // Status terminal não-aprovado na origem (cancelled, rejected, estornado...).
      // Não encerra — já está resolvida de outra forma.
      ignoradas++;
      resultados.push({
        pagamento_id: pagamento.id,
        mercadopago_order_id: orderId,
        plano: pagamento.plano,
        valor: pagamento.valor,
        gerada_em: geradaEm,
        acao: "ignorada_status_origem",
        status_origem: statusOrigem,
      });
      if (!simular) {
        await base44.asServiceRole.entities.LogEncerramentoPix.create({
          pagamento_id: pagamento.id,
          mercadopago_order_id: orderId,
          acao: "ignorada_status_origem",
          status_origem: statusOrigem,
          gerada_em: geradaEm,
          expirada_em: null,
          versao_codigo: VERSAO_CODIGO,
          detalhe: `Status na origem (${statusOrigem}) já é terminal — registro não tocado.`,
        });
      }
    }

    return Response.json({
      simular,
      versao: VERSAO_CODIGO,
      processados: alvos.length,
      expiradas,
      aprovadas_fora_prazo: aprovadasForaPrazo,
      ignoradas,
      erros_consulta: errosConsulta,
      resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}