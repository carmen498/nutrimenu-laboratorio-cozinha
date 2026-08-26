# 27 — Inventário de segredos

Nenhum valor é registrado.

| Nome | Consumidor/fornecedor | Ambiente/finalidade | Obtenção/rotação | Destino |
|---|---|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN_PROD` | payment functions/MP | produção API | painel MP; rotacionar coordenado | secret manager backend |
| `MERCADOPAGO_ACCESS_TOKEN_SANDBOX` | payment functions/MP | teste API | painel MP | secret manager staging |
| `MERCADOPAGO_WEBHOOK_SECRET` | webhook/MP | HMAC | configuração webhook MP | secret manager webhook |
| `RESEND_API_KEY` | shared email/Resend | envio | painel Resend; revogar antiga | secret manager worker/API |
| `WASCRIPT_API_TOKEN` | WhatsApp/Wascript | envio | fornecedor | secret manager worker |
| `WASCRIPT_MODO_TESTE` | WhatsApp | feature flag | operação | config por ambiente |
| Auth/OAuth credentials | Base44/Google | login | **NÃO ENCONTRADO**; novo client | IdP secret manager |
| DB/storage/session keys destino | novo | infraestrutura | gerar via KMS | secret manager/IaC ref |

`AMBIENTE` não é segredo, mas controla qual token MP é usado. Rotacionar todos após cutover; nunca copiar valores para repo, docs, logs ou frontend.