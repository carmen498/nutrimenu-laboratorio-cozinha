# 29 — Runbook operacional

| Incidente/operação | Procedimento | Confirmação |
|---|---|---|
| Deploy | checks → migration compatível → API/workers → SPA → smoke → monitorar | versão, health, métricas, fluxo crítico |
| Rollback | congelar, release anterior, migration segura, reconcile | smoke e integridade |
| Migration DB | backup/restore testado, expand-contract, transação/lotes | schema diff/count/checksum |
| Banco indisponível | declarar incidente, pausar writes/jobs, failover/restore | queries, lag, integridade |
| Storage falha | bloquear uploads, manter metadados, failover/retry | checksum/ACL/download |
| API externa falha | circuit breaker, retry idempotente, DLQ, status ao usuário | backlog zerado sem duplicidade |
| Segredo expira/vaza | revogar, rotacionar, redeploy, auditar logs | credencial antiga falha, nova funciona |
| Auth falha | validar IdP/JWKS/clock/callback; não bypassar | login/logout/reset/roles |
| Job travado | adquirir lock, parar, inspecionar run ID, retry controlado | uma execução, dedupe/log |
| Webhook falha | validar HMAC/URL, replay por ID, reconciliar provedor | status interno=provedor |
| Indisponibilidade | incident commander, comunicação, rollback/failover | SLO e smoke |

## Investigação
Registrar tempo, versão, request/run/payment IDs técnicos, métricas e mudanças; nunca copiar tokens/PII. Preservar evidência, produzir timeline/causa/ações e testar correção.

## Owners
Produto, engenharia, dados, segurança, operações, suporte e fornecedores: **AÇÃO NECESSÁRIA** nomear titulares/on-call/escalonamento.