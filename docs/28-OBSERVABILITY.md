# 28 — Observabilidade

## Atual confirmado
- `console.log` em funções; logs de execução Base44.
- Entidades: `LogEmail`, `LogWhatsapp`, `LogWebhookMercadoPago`, logs de preço/retenção/curadoria/normalização.
- Automações retornam último status e falhas consecutivas.
- Plugin Vite com `analyticsTracker`; `base44.analytics.track` disponível, uso completo não inventariado.

## Não encontrado
Tracing distribuído, métricas de infraestrutura/negócio centralizadas, dashboards, uptime, alert rules/on-call, retention de console logs, health endpoints.

## Destino
- OpenTelemetry trace ID/request ID/run ID; logs JSON sem PII/secrets.
- Métricas: HTTP status/latência, DB, fila, job, webhook, checkout, envio, auth, storage.
- Health: liveness/readiness e dependências; uptime externo para SPA/API/webhook.
- Alertas: 5xx/SLO, webhook failure, job atraso/falha, fila/DLQ, auth spike, pagamento divergente, storage/DB, certificado/segredo.
- Dashboards por fluxo crítico; auditoria de admin/dados.

## Equivalência
Baseline atual antes da migração; correlation IDs nos dois ambientes; comparar taxas/latências e resultados. Observabilidade operacional é gate, não pós-tarefa.