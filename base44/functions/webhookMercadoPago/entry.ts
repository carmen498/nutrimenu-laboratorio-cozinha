// Webhook do Mercado Pago — recebe notificações de pagamento.
// Endpoint público, sem autenticação de usuário (chamado pelo Mercado Pago).
//
// Valida o header "x-signature" (HMAC-SHA256) contra o manifest
// "id:{data.id};request-id:{x-request-id};ts:{ts};" usando MERCADOPAGO_WEBHOOK_SECRET,
// conforme especificação do Mercado Pago.
//
// Depois de validar a assinatura, busca a order na API do Mercado Pago pelo ID
// recebido (nunca confia nos dados do corpo da notificação) e atualiza o registro
// interno correspondente (entidade Pagamento) e, se aprovado, a assinatura do usuário.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { ativarPlanoEEnviarEmail } from "../../shared/ativarAssinaturaPagamento.ts";
import { revogarAcessoEstorno } from "../../shared/revogarAcessoEstorno.ts";
import { enviarNotificacaoWhatsapp } from "../../shared/notificarWascript.ts";
import { validarAssinatura } from "../../shared/validarAssinaturaMercadoPago.ts";

// Identificador de versão temporário — usado para confirmar sem ambiguidade, olhando o
// corpo_bruto gravado em LogWebhookMercadoPago, que o endpoint público está executando
// esta versão do código (com o .toLowerCase() no manifest da assinatura) e não uma
// versão anterior em cache. Remover depois de confirmado.
const VERSAO_CODIGO = "manifest-lowercase-fix-v2";

export default async function(req: Request): Promise<Response> {
  try {
    console.log(`webhookMercadoPago rodando versão: ${VERSAO_CODIGO}`);
    const url = new URL(req.url);
    const body = await req.json().catch(() => null);

    const dataId = url.searchParams.get("data.id") || body?.data?.id || null;
    const tipoNotificacao = body?.type || body?.topic || url.searchParams.get("type") || null;
    const corpoBruto = `VERSAO:${VERSAO_CODIGO} | ${JSON.stringify(body).slice(0, 1900)}`;

    // Log persistido de toda notificação recebida — o console.log não é acessível
    // retroativamente, então este é o único jeito de diagnosticar depois o que
    // o Mercado Pago realmente enviou e em qual ponto o processamento parou.
    const base44Log = createClientFromRequest(req);
    async function registrarLog(campos: Record<string, unknown>) {
      await base44Log.asServiceRole.entities.LogWebhookMercadoPago.create({
        data_id: dataId || "",
        tipo_notificacao: tipoNotificacao,
        corpo_bruto: corpoBruto,
        ...campos,
      }).catch((e: any) => console.log("Falha ao gravar LogWebhookMercadoPago:", e.message));
    }

    const { valida: assinaturaValida, diagnostico: diagnosticoAssinatura } = await validarAssinatura(req, dataId);
    if (!assinaturaValida) {
      console.log("Assinatura inválida na notificação do Mercado Pago:", JSON.stringify(diagnosticoAssinatura));
      await registrarLog({
        assinatura_valida: false,
        resultado: "assinatura_invalida",
        corpo_bruto: `${corpoBruto} | DIAGNOSTICO: ${JSON.stringify(diagnosticoAssinatura)}`,
      });
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }

    console.log("Notificação recebida do Mercado Pago:", JSON.stringify(body));

    if (!dataId) {
      await registrarLog({ assinatura_valida: true, resultado: "sem_data_id" });
      return Response.json({ received: true });
    }

    // Decide qual recurso buscar na API do Mercado Pago com base no tipo/tópico da notificação:
    // "order" (cartão, Orders API) -> /v1/orders/{id} ; "payment" (ex: PIX) -> /v1/payments/{id}.
    // Cobre tanto o valor puro ("order"/"payment") quanto variações com ação ("order.processed"/"payment.updated").
    const tipoNormalizado = (tipoNotificacao || "").toLowerCase();
    let recursoTipo: "order" | "payment" | null = null;
    if (tipoNormalizado.includes("payment")) {
      recursoTipo = "payment";
    } else if (tipoNormalizado.includes("order")) {
      recursoTipo = "order";
    }

    if (!recursoTipo) {
      console.log(`Tipo de notificação não mapeado: ${tipoNotificacao}`);
      await registrarLog({
        assinatura_valida: true,
        resultado: "tipo_nao_mapeado",
        corpo_bruto: `${corpoBruto} | tipo de notificação não mapeado: ${tipoNotificacao}`,
      });
      return Response.json({ received: true });
    }

    const base44 = createClientFromRequest(req);

    const ambiente = secrets.get("AMBIENTE");
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");

    // Busca o recurso na API do Mercado Pago — nunca confia nos dados do corpo da notificação.
    const recursoUrl = recursoTipo === "payment"
      ? `https://api.mercadopago.com/v1/payments/${dataId}`
      : `https://api.mercadopago.com/v1/orders/${dataId}`;
    const recursoResponse = await fetch(recursoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const recurso = await recursoResponse.json().catch(() => null);

    if (!recursoResponse.ok || !recurso) {
      console.log(`Não foi possível buscar ${recursoTipo} no Mercado Pago:`, JSON.stringify(recurso));
      await registrarLog({ assinatura_valida: true, resultado: "order_nao_encontrada" });
      return Response.json({ error: `${recursoTipo}_not_found` }, { status: 200 });
    }

    const pagamentoId = recurso.external_reference;
    if (!pagamentoId) {
      console.log(`${recursoTipo} sem external_reference — nada a atualizar.`);
      await registrarLog({ assinatura_valida: true, resultado: "sem_data_id" });
      return Response.json({ received: true });
    }

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(() => null);
    if (!pagamento) {
      console.log("Pagamento interno não encontrado para external_reference:", pagamentoId);
      await registrarLog({ assinatura_valida: true, resultado: "pagamento_interno_nao_encontrado", pagamento_id: pagamentoId });
      return Response.json({ received: true });
    }

    let novoStatus: string | null = null;
    if (recursoTipo === "order") {
      // Fluxo de cartão (Orders API) — lógica inalterada.
      const paymentStatus = recurso.transactions?.payments?.[0]?.status;
      if (recurso.status === "processed") {
        novoStatus = "approved";
      } else if (paymentStatus === "refunded") {
        novoStatus = "estornado";
      } else if (recurso.status === "canceled" || paymentStatus === "cancelled") {
        novoStatus = "cancelled";
      } else if (paymentStatus === "rejected") {
        novoStatus = "rejected";
      }
    } else {
      // Fluxo de payment direto (ex: PIX) — status já vem direto no recurso.
      if (recurso.status === "approved") {
        novoStatus = "approved";
      } else if (recurso.status === "rejected") {
        novoStatus = "rejected";
      } else if (recurso.status === "refunded") {
        novoStatus = "estornado";
      } else if (recurso.status === "cancelled") {
        novoStatus = "cancelled";
      }
    }

    if (!novoStatus) {
      console.log(`Status do ${recursoTipo} ainda não é final:`, recurso.status);
      await registrarLog({ assinatura_valida: true, resultado: "status_nao_final", pagamento_id: pagamentoId });
      return Response.json({ received: true });
    }

    if (novoStatus === "approved") {
      // Idempotência: se este Pagamento já estava "approved" antes desta notificação
      // (por exemplo, já foi ativado de forma síncrona na criação da order), não
      // reprocessa — evita reenviar o e-mail ou somar a data de expiração de novo.
      const jaEstavaAprovado = pagamento.status === "approved";
      if (!jaEstavaAprovado) {
        await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "approved" });
        await ativarPlanoEEnviarEmail(base44, pagamento);
      } else {
        console.log("Pagamento já estava approved — ativação ignorada (idempotência).");
      }
    } else {
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: novoStatus });

      // Estorno reverte um acesso que já havia sido concedido — revoga o plano do
      // usuário. "rejected"/"cancelled" são tentativas que nunca ativaram nada.
      if (novoStatus === "estornado") {
        await revogarAcessoEstorno(base44, pagamento.usuario_id);
      }

      // Dispara o e-mail transacional de pagamento recusado/estornado, apenas se o
      // template correspondente estiver com status "ativo" (Comunicação > Transacionais).
      // O e-mail de aprovado é disparado dentro de ativarPlanoEEnviarEmail, acima.
      let tipoEmail: string | null = null;
      if (novoStatus === "rejected") tipoEmail = "pagamento_recusado";
      else if (novoStatus === "estornado") tipoEmail = "pagamento_estornado";

      if (tipoEmail) {
        const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
        if (usuario?.email) {
          const nome = usuario.nome_completo || usuario.full_name || "";
          const DEFAULTS: Record<string, { assunto: string; corpo: string }> = {
            pagamento_recusado: {
              assunto: "Não conseguimos aprovar seu pagamento",
              corpo: `<p>Olá {{nome}}, não conseguimos aprovar o pagamento da sua assinatura.</p><p>Verifique os dados do cartão ou tente outra forma de pagamento para continuar com acesso ao Laboratório de Cozinha.</p>`,
            },
            pagamento_estornado: {
              assunto: "Seu pagamento foi estornado",
              corpo: `<p>Olá {{nome}}, informamos que o valor do seu pagamento foi estornado.</p><p>O reembolso será processado pelo Mercado Pago e deve aparecer no seu extrato em alguns dias, conforme o prazo do seu banco ou operadora de cartão.</p><p>Se tiver dúvidas, é só nos chamar.</p>`,
            },
          };
          const { assunto: defaultAssunto, corpo: defaultCorpo } = DEFAULTS[tipoEmail];

          const { assunto, html, ativo } = await renderTemplateEmail(base44, tipoEmail, nome, defaultAssunto, defaultCorpo);

          if (ativo) {
            const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
            await base44.asServiceRole.entities.LogEmail.create({
              destinatario_email: usuario.email,
              tipo: tipoEmail,
              enviado_em: new Date().toISOString(),
              status: resultado.ok ? "enviado" : "falhou",
              detalhe_erro: resultado.ok ? undefined : (resultado.detalhe_completo || resultado.error),
            });
          } else {
            console.log(`Template "${tipoEmail}" está em rascunho — e-mail não enviado.`);
          }
        }

        if (usuario && novoStatus === "rejected") {
          await enviarNotificacaoWhatsapp(base44, "pagamento_recusado", usuario).catch((e: any) =>
            console.log("Falha ao enviar WhatsApp de pagamento recusado:", e.message)
          );
        } else if (usuario && novoStatus === "estornado") {
          await enviarNotificacaoWhatsapp(base44, "pagamento_estornado", usuario).catch((e: any) =>
            console.log("Falha ao enviar WhatsApp de pagamento estornado:", e.message)
          );
        }
      }
    }

    await registrarLog({ assinatura_valida: true, resultado: "processado", pagamento_id: pagamentoId, status_resolvido: novoStatus });

    return Response.json({ received: true, status: novoStatus });
  } catch (error) {
    console.log("Erro ao processar notificação do Mercado Pago:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}