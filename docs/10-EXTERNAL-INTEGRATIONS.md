# 10 — Integrações externas

| Serviço | Uso/API/auth | Dados | Falha/migração |
|---|---|---|---|
| Mercado Pago | Orders/Payments API; bearer; JS SDK/security.js; webhook HMAC | pagamento, payer, device ID, external_reference | manter idempotência; recriar app/credenciais/webhook; certificar sandbox/prod |
| Resend | API key via `shared/resendEmail.ts` | destinatário, assunto, HTML | logs `LogEmail`; recriar domínio/DNS/remetente/API key; testar SPF/DKIM/DMARC |
| Wascript | token; `shared/notificarWascript.ts` | telefone e template | modo teste; recriar token/templates/canal e opt-in |
| Google OAuth | Base44 Auth | identidade/email | registrar novo OAuth client e redirect; relink possivelmente necessário |
| Core InvokeLLM | funções de análise/preço/tag | texto/arquivos e contexto web | escolher provedor/modelo, prompts, schema e custos; testes golden |
| Core Upload/File | frontend | arquivos/URLs | migrar objetos e ACL; substituir API |
| Google Fonts | CSS público | nenhum dado de negócio | hospedar localmente se política exigir |
| media.base44.com | imagens públicas | assets | baixar e re-hospedar antes do desligamento |
| CEP/links externos | uso pontual a confirmar | endereço | **PARTIAL:** inventário automatizado de hosts pendente |

## Mercado Pago
Endpoints confirmados: `api.mercadopago.com/v1/orders/{id}`, `/v1/payments/{id}`; criação em `criarPagamentoMercadoPago`. Webhook atual: `https://laborat-rio-de-cozinha.base44.app/functions/webhookMercadoPago`. Retry é do provedor; handler responde 200 em falhas não recuperáveis de resolução e 500 em exceção. Timeout explícito **NÃO ENCONTRADO**.

## Procedimento por integração
1. Criar contas/projetos do destino e ambientes separados.
2. Configurar secret manager, egress, DNS e allowlists.
3. Reproduzir templates/prompts/configs sem dados pessoais.
4. Executar contract tests e falhas simuladas.
5. Fazer shadow sem efeitos ou com destinatários de teste.
6. Trocar URLs/credenciais no cutover; manter antigas durante rollback.
7. Rotacionar segredos após estabilização.

Fontes: `base44/functions/criarPagamentoMercadoPago`, `webhookMercadoPago`, `campanhaEmail`, `base44/shared/*`, `src/lib/mercadoPagoConfig.js`.