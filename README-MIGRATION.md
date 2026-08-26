# Pacote de migração — Laboratório de Cozinha

## Estado da análise
Documentação criada sem migrar nem alterar comportamento. Estado geral: **PARTIAL / NO-GO para implementação de cutover** até fechar `docs/32-OPEN-QUESTIONS-AND-GAPS.md`.

## Arquitetura atual
SPA React/Vite + Base44 Auth/Entities/RLS/Functions/Storage/Automations, Mercado Pago, Resend, Wascript e Core IA/arquivos. Ver [01](docs/01-ARCHITECTURE.md).

## Dependências Base44
SDK/plugin, auth/User, Entities/RLS/service role, functions/runtime/secrets, Core, storage, scheduler, hosting, analytics/public settings. Ver [34](docs/34-BASE44-REPLACEMENT-MAP.md).

## Maiores riscos
Auth não exportável, DDL/backups desconhecidos, RLS, IDs/timestamps, storage/ACL, pagamentos/webhooks, jobs divergentes, IA e lock-in invisível.

## Bloqueadores
Export oficial, estratégia de auth, inventário storage, DDL/backup, volumes/SLO, owners DNS/terceiros e reconciliação das automações.

## Estratégia recomendada
Descoberta → destino gerenciado modular → portabilidade por contratos → dry-runs → shadow → cutover reversível → observação → desativação tardia.

## Ordem de leitura
00→01→02→03→04→05→06→08→09→10→11→12→13→14→16→17→18→19→07→21→22→23→24→25→26→27→28→29→30→31→32→33→34→35. Use [Manifest](docs/MANIFEST.md).

## Ordem recomendada da migração
Fechar lacunas; baseline/testes; IaC/observabilidade; auth/API/DB; dados/storage; integrações/jobs; staging/shadow; cutover/rollback; observação.

## Critérios de GO / NO-GO
GO somente quando `22` estiver comprovado e `32` não tiver bloqueadores. Qualquer desconhecido crítico, backup sem restore ou divergência de dados/auth/pagamento é NO-GO.

## Próxima ação recomendada
Solicitar ao Base44/owners os exports e metadados bloqueadores, executar inventário automatizado AST/schema e definir RPO/RTO/arquitetura após sizing.

## Documentos
[00](docs/00-PROJECT-OVERVIEW.md) · [01](docs/01-ARCHITECTURE.md) · [02](docs/02-CODEBASE-INVENTORY.md) · [03](docs/03-FEATURE-CATALOG.md) · [04](docs/04-ROUTES-AND-UI.md) · [05](docs/05-API-REFERENCE.md) · [OpenAPI](docs/openapi.yaml) · [06](docs/06-DATABASE.md) · [07](docs/07-DATA-MIGRATION.md) · [08](docs/08-AUTHENTICATION-AND-AUTHORIZATION.md) · [09](docs/09-CONFIGURATION.md) · [10](docs/10-EXTERNAL-INTEGRATIONS.md) · [11](docs/11-STORAGE.md) · [12](docs/12-JOBS-AND-AUTOMATIONS.md) · [13](docs/13-WEBHOOKS.md) · [14](docs/14-DEPENDENCIES.md) · [15](docs/15-LOCAL-DEVELOPMENT.md) · [16](docs/16-CURRENT-DEPLOYMENT.md) · [17](docs/17-TARGET-ARCHITECTURE.md) · [18](docs/18-PORTABILITY-MATRIX.md) · [19](docs/19-MIGRATION-PLAN.md) · [20](docs/20-MIGRATION-CHECKLIST.md) · [21](docs/21-MIGRATION-ACCEPTANCE-TESTS.md) · [22](docs/22-MIGRATION-ACCEPTANCE-CRITERIA.md) · [23](docs/23-CUTOVER-RUNBOOK.md) · [24](docs/24-ROLLBACK.md) · [25](docs/25-BACKUP-AND-RECOVERY.md) · [26](docs/26-SECURITY.md) · [27](docs/27-SECRETS-INVENTORY.md) · [28](docs/28-OBSERVABILITY.md) · [29](docs/29-OPERATIONS-RUNBOOK.md) · [30](docs/30-TROUBLESHOOTING.md) · [31](docs/31-MIGRATION-RISKS.md) · [32](docs/32-OPEN-QUESTIONS-AND-GAPS.md) · [33](docs/33-BASE44-EXPORT-INVENTORY.md) · [34](docs/34-BASE44-REPLACEMENT-MAP.md) · [35](docs/35-DOCUMENTATION-AUDIT.md). Artefatos: [.env.example](.env.example), [schema](migration/schema.sql).