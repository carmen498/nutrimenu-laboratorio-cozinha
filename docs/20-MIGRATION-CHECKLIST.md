# 20 — Checklist operacional

## Descoberta
- [ ] Inventário revisado por produto/engenharia/operação
- [ ] Provar contagens/volumes/SLAs
- [ ] Fechar itens bloqueadores de `32`
## Código
- [ ] Portar frontend/backend
- [ ] Provar build, lint, typecheck e suites
- [ ] Provar ausência de chamadas Base44 em runtime
## Banco/dados
- [ ] Gerar/revisar DDL e RLS
- [ ] Testar migrations e rollback
- [ ] Exportar e importar dry-run
- [ ] Provar contagens, IDs, checksums, relações e dinheiro
## Auth
- [ ] Definir estratégia de senha/OAuth/sessão
- [ ] Provar todos roles/status e negações entre tenants
## Storage
- [ ] Inventariar e copiar objetos
- [ ] Provar checksum, MIME, ACL e signed URL
## Integrações/jobs
- [ ] Recriar MP/Resend/Wascript/IA
- [ ] Provar webhooks, replay e idempotência
- [ ] Recriar jobs sem duplicidade
- [ ] Provar dois ciclos ou execução controlada
## Infra/segurança/observabilidade
- [ ] IaC, TLS, secrets, backups e restore
- [ ] Provar health, logs, métricas, alertas e auditoria
- [ ] Executar testes de vulnerabilidade/PII
## Cutover
- [ ] Aprovar freeze/janela/owners
- [ ] Executar snapshot e delta
- [ ] Provar smoke/reconciliação antes do tráfego
- [ ] Alterar DNS/webhooks com TTL planejado
## Pós-cutover
- [ ] Provar fluxos reais controlados
- [ ] Reconciliar writes/pagamentos/comunicações
- [ ] Encerrar observação formalmente
## Rollback
- [ ] Ensaiar `24-ROLLBACK.md`
- [ ] Provar restauração e retorno de DNS/jobs/webhooks
## Desativação Base44
- [ ] Export final e retenção legal
- [ ] Provar zero tráfego, jobs, callbacks, arquivos e segredos dependentes
- [ ] Só então aprovar desativação e rotação final