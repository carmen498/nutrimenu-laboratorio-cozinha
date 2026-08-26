# 34 — Mapa Base44 → novo ambiente

| Base44 | Uso | Código dependente | Substituto | Equivalência |
|---|---|---|---|---|
| SDK client | auth/entities/functions/Core | `src/api`, todo frontend | API client/OIDC | mesmos contratos/erros |
| Auth/User | identidade/OTP/OAuth | auth pages/context/guards | IdP + user profile | matriz `08` |
| Entities | CRUD/schema | pages/functions | PostgreSQL+API/ORM | contagem/IDs/schema |
| RLS | isolamento | JSONC | DB policies + service auth | testes negativos |
| Service role | operações privilegiadas | functions/shared | service account/DB role | least privilege/audit |
| Functions runtime | APIs/webhooks | `base44/functions` | serverless/container TS | contract tests |
| Runtime secrets | chaves | functions | secret manager | rotação/acesso |
| Automations | schedules/triggers | platform/function.jsonc | scheduler+queue/CDC | horário/dedupe/retry |
| Core Upload | arquivos | uploads/imports | S3 compatible + signed URL | SHA/ACL |
| Core InvokeLLM | IA | análise/preço/tags | LLM API/provider abstraction | golden tests |
| Core email (se usado) | envio | chamadas Core | Resend/SMTP | entrega/log |
| Hosting/publish | SPA/TLS/CDN | build/plugin | CDN/PaaS/IaC | rotas/performance/TLS |
| Vite plugin | injeções/analytics/editor | `vite.config.js` | Vite padrão + tools | build sem dependência |
| Analytics | eventos | SDK/plugin | analytics/OTEL | eventos/baseline |
| Public settings | bootstrap auth | AuthContext | config endpoint | disponibilidade/segurança |
| File signed URL | privado | downloads | object storage signer | expiração/ACL |

Critério final: scan estático sem `base44` no bundle/runtime destino, network capture sem hosts Base44 e operação completa após bloquear egress Base44 em staging.