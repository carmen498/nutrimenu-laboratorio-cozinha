# 09 — Configuração

| Variável/config | Obrigatória | Ambiente | Finalidade/consumidor | Origem | Segredo? |
|---|---:|---|---|---|---:|
| `AMBIENTE` | sim | backend | sandbox/produção MP | secret Base44 | não sensível |
| `MERCADOPAGO_ACCESS_TOKEN_PROD` | prod | backend | API MP | Mercado Pago | sim |
| `MERCADOPAGO_ACCESS_TOKEN_SANDBOX` | dev/test | backend | API MP | Mercado Pago | sim |
| `MERCADOPAGO_WEBHOOK_SECRET` | prod | webhook | HMAC | Mercado Pago | sim |
| `RESEND_API_KEY` | email | backend | envio | Resend | sim |
| `WASCRIPT_API_TOKEN` | WhatsApp | backend | envio | Wascript | sim |
| `WASCRIPT_MODO_TESTE` | sim | backend | simulação | operação | não |
| `VITE_BASE44_APP_ID` | atual | frontend | app Base44 | plataforma | não |
| `VITE_BASE44_FUNCTIONS_VERSION` | atual opcional | frontend | versão funções | plataforma | não |
| `VITE_BASE44_APP_BASE_URL` | atual opcional | frontend | URL app | plataforma | não |
| `BASE44_LEGACY_SDK_IMPORTS` | build opcional | build | compatibilidade | build | não |
| app ID fallback | atual | frontend | SDK | `app-params.js` | não |
| domínio canônico | prod | HTML/auth | reset/links | `index.html` | não |

Configurações persistidas: `ConfiguracaoPlano`, `ConfiguracaoEmail`, `ConfiguracaoCarmen`, `ConfiguracaoSistema`, `ConfiguracaoAddonCustos`, `ConfiguracaoCustosUsuario`, `AppConfig`.

## Ambientes
- Produção Base44: **CONFIRMADO**.
- Sandbox Mercado Pago selecionado por `AMBIENTE`: **CONFIRMADO**.
- Staging independente e banco separado: **NÃO ENCONTRADO**.

## Migração
Substituir variáveis Base44 por `API_BASE_URL`, `AUTH_*`, `DATABASE_URL`, `STORAGE_*`, `SCHEDULER_*`, `PUBLIC_APP_URL`; manter segredos em secret manager; separar dev/staging/prod; nunca embutir access token.

Ver `.env.example` e `27-SECRETS-INVENTORY.md`.