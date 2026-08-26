# 31 — Registro de riscos

| ID | Risco | Prob. | Impacto | Evidência | Mitigação | Gate |
|---|---|---|---|---|---|---|
| R1 | Auth/senhas não exportáveis | alta | crítico | provedor Base44 | reset/relink/PoC | estratégia aprovada |
| R2 | DDL/índices físicos desconhecidos | alta | alto | só JSONC | gerar/revisar/testar | schema e performance |
| R3 | RLS não equivalente | média | crítico | policies Base44 | matriz/testes negativos | zero acesso cruzado |
| R4 | IDs/timestamps alterados | média | crítico | IDs embutidos | preservar/id_map/checksum | 100% reconcile |
| R5 | storage/ACL/URLs | alta | alto | media/Core | manifest/checksum/ACL | 100% objetos |
| R6 | webhook/pagamento duplicado | média | crítico | MP side effects | HMAC/idempotência/replay | sandbox+produção controlada |
| R7 | jobs duplicados/horário divergente | alta | alto | automations vs JSONC | fonte única/locks | 2 ciclos |
| R8 | secrets/callbacks esquecidos | média | crítico | secret inventory parcial | export dashboards/rotation | checklist fechado |
| R9 | IA muda resultados | alta | alto | Core abstrato | golden prompts/model pin | tolerância aprovada |
| R10 | dados legados inválidos | alta | alto | auditorias existentes | staging/curadoria | zero novos erros |
| R11 | DNS/TLS/cache | média | alto | domínio duplo | TTL/canary/rollback | smoke externo |
| R12 | backups não comprovados | alta | crítico | não encontrado | backup+restore | restore aprovado |
| R13 | logs/alertas insuficientes | alta | alto | parcial | OTEL/SLO/on-call | alertas testados |
| R14 | lock-in invisível | alta | crítico | SDK/plugin/runtime | scan/tráfego/export | zero dependência |
| R15 | truncamento por limites | média | alto | limites 2k/5k | paginação/agregação | contagens iguais |