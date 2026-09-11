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
import { ativarCompraPagamento } from "../../shared/ativarCompraPagamento.ts";
import { revogarCompraEstorno } from "../../shared/revogarCompraEstorno.ts";
import { enviarNotificacaoWhatsapp } from "../../shared/notificarWascript.ts";
import { validarAssinatura } from "../../shared/validarAssinaturaMercadoPago.ts";
import { registrarLogEmail, resumirErroOperacional } from "../../shared/governancaLogs.ts";
import { resolverStatusOrderMercadoPago, resolverStatusPaymentMercadoPago } from "../../shared/statusMercadoPago.ts";

// Versão persistida apenas como metadado técnico; o corpo bruto da notificação
// não é armazenado por política de minimização de dados.
const VERSAO_CODIGO = "webhook-v8-2026-09-11-sem-assinatura-separada";

export default async function(req: Request): Promise<Response> {
  let dataIdContexto: string | null = null;
  let tipoContexto: string | null = null;
  let acaoContexto: string | null = null;
  try {
    console.log(`webhookMercadoPago rodando versão: ${VERSAO_CODIGO}`);
    const url = new URL(req.url);
    const body = await req.json().catch(() => null);

    const dataIdBruto = url.searchParams.get("data.id") ?? body?.data?.id ?? null;
    const dataId = dataIdBruto == null ? null : String(dataIdBruto).trim();
    const tipoNotificacao = body?.type || body?.topic || url.searchParams.get("type") || null;
    const acaoNotificacao = typeof body?.action === "string" ? body.action : null;
    dataIdContexto = dataId;
    tipoContexto = tipoNotificacao;
    acaoContexto = acaoNotificacao;

    // Log estruturado e mínimo: IDs técnicos e resultado do processamento.
    // Não persiste corpo bruto, assinatura, request-id, e2e_id ou payload do provedor.
    const base44Log = createClientFromRequest(req);
    async function registrarLog(campos: Record<string, unknown>) {
      await base44Log.asServiceRole.entities.LogWebhookMercadoPago.create({
        data_id: dataId || "",
        tipo_notificacao: tipoNotificacao,
        acao_notificacao: acaoNotificacao,
        versao_codigo: VERSAO_CODIGO,
        ...campos,
      }).catch((e: any) => console.log("Falha ao gravar LogWebhookMercadoPago:", e.message));
    }

    const { valida: assinaturaValida, diagnostico: diagnosticoAssinatura } = await validarAssinatura(req, dataId);
    if (!assinaturaValida) {
      console.log("Assinatura inválida na notificação do Mercado Pago", diagnosticoAssinatura);
      // Requisição sem header x-signature não é uma notificação do Mercado Pago
      // (varredura, teste manual, monitor). Separar os dois casos é o que torna a
      // métrica "assinatura inválida" utilizável: só ela indica secret/manifest errados.
      const semAssinatura = diagnosticoAssinatura?.x_signature_presente === false;
      await registrarLog({
        assinatura_valida: false,
        resultado: semAssinatura ? "sem_assinatura" : "assinatura_invalida",
        diagnostico_resumo: JSON.stringify(diagnosticoAssinatura),
      });
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }

    console.log("Notificação válida recebida do Mercado Pago", { data_id: dataId, tipo: tipoNotificacao, acao: acaoNotificacao });

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
      });
      return Response.json({ received: true });
    }

    const base44 = createClientFromRequest(req);

    // A origem já foi autenticada por HMAC acima, então live_mode pode decidir qual
    // credencial consulta o recurso. Isso permite homologação sandbox sem alterar o
    // AMBIENTE global do checkout produtivo e mantém produção em live_mode=true.
    const ambiente = String(secrets.get("AMBIENTE") || "").trim().toLowerCase();
    const notificacaoSandbox = body?.live_mode === false;
    const notificacaoProducao = body?.live_mode === true;
    const accessToken = notificacaoSandbox
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX")
      : notificacaoProducao
        ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
        : ambiente === "producao"
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
      console.log(`Não foi possível buscar ${recursoTipo} no Mercado Pago`, { data_id: dataId, http_status: recursoResponse.status });
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

    const novoStatus = recursoTipo === "order"
      ? resolverStatusOrderMercadoPago(recurso)
      : resolverStatusPaymentMercadoPago(recurso);

    if (novoStatus === "pending") {
      console.log(`Status do ${recursoTipo} ainda não é final:`, recurso.status);
      await registrarLog({ assinatura_valida: true, resultado: "status_nao_final", pagamento_id: pagamentoId });
      return Response.json({ received: true });
    }

    // Idempotência para TODOS os estados finais. Replays legítimos do Mercado Pago
    // (ou repetição da mesma notificação assinada) não devem reenviar e-mail/WhatsApp,
    // reativar plano nem executar revogação de estorno uma segunda vez.
    if (pagamento.status === novoStatus) {
      // Se a gravação do pagamento ocorreu, mas a atualização do usuário falhou,
      // um replay aprovado repara a liberação. O helper ignora quem já foi ativado.
      if (novoStatus === "approved") await ativarCompraPagamento(base44, pagamento);
      console.log(`Pagamento já estava ${novoStatus} — efeitos colaterais ignorados (idempotência).`);
      await registrarLog({ assinatura_valida: true, resultado: "processado", pagamento_id: pagamentoId, status_resolvido: novoStatus });
      return Response.json({ received: true, status: novoStatus, idempotent: true });
    }

    if (novoStatus === "approved") {
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: "approved" });
      await ativarCompraPagamento(base44, pagamento);
    } else {
      await base44.asServiceRole.entities.Pagamento.update(pagamento.id, { status: novoStatus });

      // Estorno reverte um acesso que já havia sido concedido — revoga o plano do
      // usuário. "rejected"/"cancelled" são tentativas que nunca ativaram nada.
      if (novoStatus === "estornado") {
        const revogacao = await revogarCompraEstorno(base44, pagamento);
        console.log("Resultado da revogação por estorno", { pagamento_id: pagamento.id, revogacao });
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
            await registrarLogEmail(base44, {
              usuarioId: usuario.id,
              email: usuario.email,
              tipo: tipoEmail,
              resultado,
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
    const detalheSeguro = resumirErroOperacional(error?.message || "Falha inesperada no webhook").slice(0, 500);
    console.log("Erro ao processar notificação do Mercado Pago:", detalheSeguro);
    try {
      const base44Erro = createClientFromRequest(req);
      await base44Erro.asServiceRole.entities.LogWebhookMercadoPago.create({
        data_id: dataIdContexto || "",
        tipo_notificacao: tipoContexto,
        acao_notificacao: acaoContexto,
        versao_codigo: VERSAO_CODIGO,
        resultado: "erro_processamento",
        diagnostico_resumo: detalheSeguro,
      });
    } catch (logError) {
      console.log("Falha ao registrar erro do webhook:", logError?.message || "erro desconhecido");
    }
    // Confirma o recebimento para impedir uma tempestade de novas tentativas 5xx.
    // A conciliação administrativa reconsulta a order e repara o estado com segurança.
    return Response.json({ received: true, error: "processing_failed" });
  }
}