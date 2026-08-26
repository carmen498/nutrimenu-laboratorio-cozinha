# 19 — Plano de migração

Princípio: Base44 permanece referência até equivalência comprovada.

| Fase | Pré-requisitos/ações | Validação e gate | Rollback |
|---|---|---|---|
| 0 Descoberta | fechar `32`, volumes, DDL, SLAs, owners | manifest COMPLETE, riscos aceitos | nenhum impacto |
| 1 Destino | IaC dev/staging, IdP, DB, storage, secrets, observabilidade | deploy/restore/health testados | destruir ambiente não produtivo |
| 2 Código | abstrair SDK, portar API/functions/Core | build + contract/golden tests | branch/release anterior |
| 3 Banco | gerar DDL tipado, índices, RLS, migrations | schema diff, constraints, planos | migration down/snapshot |
| 4 Dados | export/transform/import/reconciliar | 100% contagem/IDs/checksum | descartar batch |
| 5 Storage | copiar, checksum, ACL, rewrite URL | 100% manifest | manter URLs antigas |
| 6 Auth | importar perfis/roles/aceites; reset/relink | matriz e testes negativos | Base44 auth ativo |
| 7 Integrações | MP, Resend, Wascript, IA, jobs/webhooks | sandbox/fixtures/2 ciclos | callbacks/jobs antigos |
| 8 Shadow | tráfego sintético/read-only, comparação | zero crítico; diferenças explicadas | desligar shadow |
| 9 Cutover | freeze, delta, smoke, DNS/tráfego | GO formal | runbook 24 |
| 10 Pós | monitorar, reconciliar writes, suporte | janela estável aprovada | conforme PNR |
| 11 Desativação | só após retenção e export final | nenhuma dependência oculta | manter arquivo/conta durante retenção |

## Gates obrigatórios
Backup restaurado; segurança aprovada; acceptance tests; dados e arquivos reconciliados; jobs/webhooks certificados; rollback ensaiado; owners presentes; comunicação e janela aprovadas.

## Riscos por fase
Auth/dados/webhook são críticos; DNS/storage altos; UI/código médios. Nenhuma fase avança por “implementado”: exige evidência versionada.