// Webhook do Mercado Pago — recebe notificações de pagamento.
// Endpoint público, sem autenticação de usuário (chamado pelo Mercado Pago).
//
// TODO (pendente MERCADOPAGO_WEBHOOK_SECRET): antes de confiar em qualquer dado
// deste payload, validar o header "x-signature" (HMAC-SHA256 via Web Crypto,
// SubtleCrypto assíncrono) contra o manifest (ts + id + request-id) usando
// esse secret. Só depois disso buscar o pagamento na API do Mercado Pago pelo
// ID recebido (nunca confiar nos dados do corpo da notificação) e atualizar o
// registro interno correspondente.

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => null);

    console.log("Notificação recebida do Mercado Pago:", JSON.stringify(body));

    // Validação de assinatura ainda não implementada — aguardando MERCADOPAGO_WEBHOOK_SECRET.

    return Response.json({ received: true });
  } catch (error) {
    console.log("Erro ao processar notificação do Mercado Pago:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}