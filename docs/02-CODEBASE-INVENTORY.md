# 02 — Inventário do código

## Diretórios
| Diretório | Responsabilidade | Chamadores/saídas | Side effects | Risco |
|---|---|---|---|---|
| `src/pages` | rotas e orquestração de telas | Router → SDK/Components | CRUD, functions, navegação | médio |
| `src/components` | UI e fluxos reutilizáveis | pages | formulários, uploads, pagamentos | médio |
| `src/lib` | regras, cálculos, auth/contexto, PDF/CSV | pages/components | SDK, storage local, impressão | alto nos módulos de custo/auth |
| `src/api` | cliente Base44 | todo frontend | token/API | alto |
| `base44/entities` | schemas e RLS | SDK/functions | persistência/autorização | crítico |
| `base44/functions` | APIs/serverless | frontend, jobs, webhooks | DB, terceiros, e-mail | crítico |
| `base44/shared` | regras backend compartilhadas | functions | DB/terceiros | crítico |
| `scripts` | testes operacionais/segurança | npm scripts | podem acessar ambientes | alto; usar credenciais controladas |
| `docs` | segurança/go-live e este pacote | humanos/CI | nenhum | baixo |

## Entrypoints
- Frontend: `index.html` → `src/main.jsx` → `src/App.jsx`.
- Build: `vite.config.js`, `base44/config.jsonc`, `package.json`.
- Backend: cada `base44/functions/<nome>/entry.ts`.
- Automação: registros Base44 + quatro `function.jsonc` versionados.

## Domínios do código
- Receitas/ingredientes: `src/pages/Receitas.jsx`, `ReceitaAberta.jsx`, `Ingredientes.jsx`; `src/lib/ingredienteReceita*`, `rendimentoReceita`, `subreceitaUtils`.
- Cardápios/eventos: `Cardapios*`, `Planejamento*`, relatórios/PDF.
- Custos: `src/pages/Custos*`, `src/lib/custos/*`, `base44/functions/salvarCalculoCusto` e normalizações/curadorias.
- Comercial: `Planos`, checkout, Mercado Pago, status/ativação/revogação.
- Comunicação/admin: `AdminComunicacao`, templates, campanhas, Resend/Wascript.
- Segurança/go-live: RLS, retenção, preflight, scripts e `docs/security`.

## Gerado/plataforma versus específico
- **CONFIRMADO Base44/boilerplate:** `src/api/base44Client.js`, padrão `AuthContext`, entity SDK, function runtime, `@base44/vite-plugin`, arquivos de entidade/agente.
- **Projeto específico:** regras gastronômicas, custos, pagamentos, comunicação, telas e PDFs.
- **Substituível:** Radix/shadcn, Tailwind, React Query, lucide, PDF/CSV.
- **Acoplado:** toda chamada `base44.*`, `createClientFromRequest`, `base44:runtime`, entidades/RLS, automações, Core integrations.

## Dependências específicas do Base44
| Dependência | Onde/uso | Impacto | Substituto |
|---|---|---|---|
| `@base44/sdk` | frontend/functions | sem CRUD/auth/functions | cliente REST próprio + auth |
| vite plugin | `vite.config.js` | build sem injeções/notifiers | Vite padrão + config explícita |
| Entities/RLS | `base44/entities` | sem banco/isolamento | DB+ORM/API+policies |
| Auth | páginas/AuthContext | login/cadastro quebram | IdP ou auth própria |
| Functions/runtime/secrets | `base44/functions` | APIs/jobs/webhook quebram | runtime serverless/container + secret manager |
| Core | IA/upload/e-mail/arquivo | fluxos de IA/storage quebram | APIs equivalentes |
| Automations | plataforma/function.jsonc | jobs param | scheduler/fila |
| Hosting/analytics | plugin/publicação | deploy/telemetria | CDN/hosting/analytics |

Inventário nominal de páginas, entidades e funções: `03`, `04`, `05`, `06`.