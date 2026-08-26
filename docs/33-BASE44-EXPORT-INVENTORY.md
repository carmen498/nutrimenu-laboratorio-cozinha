# 33 — Inventário de exportação Base44

| Item | Onde | Formato/processo | Risco se faltar |
|---|---|---|---|
| Source completo + lockfile + histórico | repo/editor | archive/git bundle | código irrecuperável |
| Entities/schema/RLS | `base44/entities` | JSONC + export plataforma | perda modelo/policies |
| Dados todas entidades | Base44 DB | JSONL/CSV paginado + manifest | perda/corrupção |
| User/perfis/aceites/roles | Auth/User | export autorizado sem secrets | contas/relações |
| Auth metadata/OAuth config | Base44/Auth provider | export config | login impossível |
| Arquivos públicos/privados | Core/media | objetos + URI/ACL/SHA | links quebrados |
| Functions/shared | `base44/functions`, `shared` | source archive | APIs/jobs perdidos |
| Automations/workflows | plataforma + function.jsonc | JSON/export/screenshot aprovado | jobs perdidos/duplicados |
| Configs/templates/prompts | entidades/código | JSON versionado | comportamento muda |
| Secrets names | settings | inventário; valores via rotação segura | integrações param |
| Webhooks/callbacks | MP/OAuth/terceiros | export dashboards | eventos/login param |
| Domínio/DNS/TLS | registrar/DNS/Base44 | zone export e owners | cutover impossível |
| Logs/auditoria necessários | entities/platform | export conforme retenção | sem reconciliação/incidente |
| Analytics/métricas | Base44/plugin | export agregado sem PII | sem baseline |
| Deployment/version metadata | Base44 | manifest da release | baseline incerta |
| Emails/templates/status | Template*/ConfigEmail | JSON | comunicação muda |
| Planos/preços | ConfiguracaoPlano | JSON + checksum | cobrança errada |
| Documentação/testes | `docs`, `scripts` | repo | conhecimento/evidência |
| Backups/snapshots | plataforma | export/prova restore | sem rollback |

Antes de perder acesso: executar export, criptografar, controlar acesso, testar leitura/restore e obter duas cópias verificadas.