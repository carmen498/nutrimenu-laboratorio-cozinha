# 13 — Webhooks

## Mercado Pago
- Origem: Mercado Pago; destino atual: `https://laborat-rio-de-cozinha.base44.app/functions/webhookMercadoPago`.
- Eventos: order/payment e ações derivadas.
- Autenticação: HMAC-SHA256 do manifesto `id:{data.id};request-id:{x-request-id};ts:{ts};` com `MERCADOPAGO_WEBHOOK_SECRET`.
- Payload mínimo: `data.id`, `type/topic`, `action`; corpo bruto não persistido.
- Segurança: busca recurso novamente no provedor; não confia no payload.
- Idempotência: status final já aplicado não repete efeitos.
- Side effects: Pagamento, User/assinatura, LogWebhook, e-mail/WhatsApp, revogação em estorno.
- Respostas: 401 assinatura; 200 recebido/processado; 500 erro inesperado.
- Retry/timeout do provedor: **NÃO ENCONTRADO**; logs estruturados existentes.

## URLs a alterar
Webhook Mercado Pago e quaisquer callbacks OAuth/reset que apontem ao domínio Base44. **AÇÃO NECESSÁRIA:** exportar configuração do dashboard de cada provedor e pesquisar URLs absolutas antes do cutover.

## Migração
Registrar URL destino paralela se o provedor permitir; validar secret novo; replay de fixtures assinadas; testes de duplicidade, atraso, ordem invertida e estorno; monitorar 2xx/latência; manter endpoint antigo durante rollback; trocar só após reconciliação.