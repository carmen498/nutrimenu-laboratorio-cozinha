# Manifest da documentação

| Documento | Finalidade | Status | Fonte |
|---|---|---|---|
| `README-MIGRATION.md` | índice/decisão | COMPLETE | pacote |
| `00-PROJECT-OVERVIEW.md` | visão executiva | PARTIAL | App/config/inventário |
| `01-ARCHITECTURE.md` | arquitetura/diagramas | PARTIAL | código/Base44 |
| `02-CODEBASE-INVENTORY.md` | árvore/acoplamento | PARTIAL | árvore/package |
| `03-FEATURE-CATALOG.md` | catálogo funcional | PARTIAL | pages/functions/entities |
| `04-ROUTES-AND-UI.md` | rotas/telas | PARTIAL | App/pages |
| `05-API-REFERENCE.md` | APIs | PARTIAL | functions |
| `openapi.yaml` | OpenAPI | PARTIAL | funções inspecionadas |
| `06-DATABASE.md` | dados/RLS/ER | PARTIAL | entity JSONC |
| `migration/schema.sql` | staging portável | PARTIAL | inferido dos entities |
| `07-DATA-MIGRATION.md` | export/import/reconcile | COMPLETE | requisitos |
| `08-AUTHENTICATION-AND-AUTHORIZATION.md` | auth/matriz | PARTIAL | auth/User/RLS |
| `09-CONFIGURATION.md` | configurações | PARTIAL | secrets/config/code |
| `.env.example` | template seguro | PARTIAL | config + destino inferido |
| `10-EXTERNAL-INTEGRATIONS.md` | terceiros | PARTIAL | functions/shared |
| `11-STORAGE.md` | objetos | BLOCKED | Core/fields; metadata ausente |
| `12-JOBS-AND-AUTOMATIONS.md` | jobs | PARTIAL | automations/function.jsonc |
| `13-WEBHOOKS.md` | callbacks | PARTIAL | webhook MP |
| `14-DEPENDENCIES.md` | pacotes/runtime | COMPLETE | package.json |
| `15-LOCAL-DEVELOPMENT.md` | execução | PARTIAL | scripts/config |
| `16-CURRENT-DEPLOYMENT.md` | deploy atual | PARTIAL | Base44 config |
| `17-TARGET-ARCHITECTURE.md` | arquitetura destino | PARTIAL | requisitos; sizing ausente |
| `18-PORTABILITY-MATRIX.md` | portabilidade | COMPLETE | inventário |
| `19-MIGRATION-PLAN.md` | fases/gates | COMPLETE | requisitos |
| `20-MIGRATION-CHECKLIST.md` | checklist | COMPLETE | plano |
| `21-MIGRATION-ACCEPTANCE-TESTS.md` | equivalência | PARTIAL | catálogo; fixtures pendentes |
| `22-MIGRATION-ACCEPTANCE-CRITERIA.md` | aceite | COMPLETE | requisitos |
| `23-CUTOVER-RUNBOOK.md` | troca | PARTIAL | volumes/owners pendentes |
| `24-ROLLBACK.md` | reversão | PARTIAL | journal/owners pendentes |
| `25-BACKUP-AND-RECOVERY.md` | DR | BLOCKED | Base44/RPO ausentes |
| `26-SECURITY.md` | controles | PARTIAL | code/RLS/docs security |
| `27-SECRETS-INVENTORY.md` | nomes/rotação | PARTIAL | secret names |
| `28-OBSERVABILITY.md` | telemetria | PARTIAL | logs/automations |
| `29-OPERATIONS-RUNBOOK.md` | operação | PARTIAL | arquitetura proposta |
| `30-TROUBLESHOOTING.md` | diagnóstico | PARTIAL | issues/código |
| `31-MIGRATION-RISKS.md` | riscos | COMPLETE | análise |
| `32-OPEN-QUESTIONS-AND-GAPS.md` | lacunas | COMPLETE | auditoria |
| `33-BASE44-EXPORT-INVENTORY.md` | export pré-saída | COMPLETE | inventário |
| `34-BASE44-REPLACEMENT-MAP.md` | substituições | COMPLETE | acoplamentos |
| `35-DOCUMENTATION-AUDIT.md` | auditoria final | COMPLETE | segunda passagem |

`PARTIAL/BLOCKED` exigem as ações em `32`; não são aceitos como conclusão de migração.