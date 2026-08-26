# 18 — Matriz de portabilidade

| Componente | Atual | Base44? | Exportável? | Mudança | Risco |
|---|---|---:|---:|---|---|
| UI/regra React | fonte JS/JSX | parcial | sim | trocar SDK | médio |
| Cálculos/PDF/CSV | `src/lib` | baixo | sim | adaptar dados | médio |
| API backend | funções Deno | alto | fonte sim | portar runtime/SDK/secrets | alto |
| Banco/schema | entities JSONC | alto | schema lógico sim; DDL não | gerar DDL/API | crítico |
| Dados | entidades | alto | a confirmar | export paginado | crítico |
| Auth/senhas | Base44 Auth | alto | desconhecido | IdP/reset/relink | crítico |
| RLS | JSON declarativo | alto | regras sim | reimplementar/testar | crítico |
| Storage | Core/media | alto | arquivos a exportar | mover/rewrite URLs | alto |
| Jobs | automations | alto | metadados sim | scheduler/queue | alto |
| Webhook | function | médio | código sim | nova URL/secret | crítico |
| Pagamento | Mercado Pago | não | config parcial | reconfigurar callback | alto |
| E-mail | Resend | não | templates/dados sim | domínio/key | médio |
| WhatsApp | Wascript | não | templates sim | canal/token | médio |
| IA | Core | alto | prompts/código sim | escolher API/modelo | alto |
| Domínio/DNS/TLS | Base44+externo | parcial | acesso a confirmar | cutover | alto |
| Secrets | Base44 | alto | valores não devem exportar em docs | recriar/rotacionar | alto |
| Logs/analytics | Base44+entidades | alto | parcial | stack nova | alto |
| Backups | implícito/desconhecido | alto | desconhecido | política/restore | crítico |

Gate geral: nenhum item crítico pode permanecer `desconhecido` no GO de cutover.