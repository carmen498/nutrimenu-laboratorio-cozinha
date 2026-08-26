# 01 — Arquitetura atual

## Visão real
- **Frontend (CONFIRMADO):** SPA React/Vite; `src/main.jsx` → `src/App.jsx`; layouts `AppLayout`/`CustosLayout`; estado local React e cache TanStack Query.
- **Backend (CONFIRMADO):** Base44 BaaS + funções HTTP Deno em `base44/functions/*/entry.ts`; módulos comuns em `base44/shared/*`.
- **Dados (CONFIRMADO):** entidades Base44 e RLS declarativa. Tecnologia física do banco: **NÃO ENCONTRADO**.
- **Auth (CONFIRMADO):** Base44 Auth, senha, OTP e Google OAuth; token no cliente; User embutido.
- **Storage (CONFIRMADO):** Core UploadFile/UploadPrivateFile e URLs persistidas.
- **Assíncrono (CONFIRMADO):** automações Base44 scheduled/entity; webhooks Mercado Pago.

## Contexto
```mermaid
flowchart LR
 U[Usuário/Admin] -->|HTTPS| SPA[React SPA]
 SPA --> SDK[Base44 SDK]
 SDK --> AUTH[Base44 Auth]
 SDK --> DB[Entidades + RLS]
 SDK --> FN[Funções serverless]
 SDK --> ST[Storage/Core]
 FN --> MP[Mercado Pago]
 FN --> RE[Resend]
 FN --> WA[Wascript]
 FN --> AI[Core IA/Web/File]
 MP -->|webhook assinado| FN
 SCH[Base44 Scheduler] --> FN
```

## Componentes
```mermaid
flowchart TB
 subgraph Browser
  APP[App/AuthProvider/Router]
  UI[Páginas e componentes]
  Q[TanStack Query]
 end
 subgraph Base44
  A[Auth]
  E[Entity API + RLS]
  F[53 funções]
  S[Storage/Core]
  J[8 automações]
 end
 APP --> UI --> Q --> E
 UI --> A
 UI --> F
 UI --> S
 J --> F
 F --> E
```

## Deployment atual
```mermaid
flowchart LR
 SRC[Repositório] -->|npm ci| BUILD[Vite build / dist]
 BUILD --> HOST[Hosting Base44]
 FUNC[base44/functions] --> DENO[Runtime serverless Base44]
 ENT[base44/entities] --> BAAS[Schema/RLS Base44]
 AUTO[Automations] --> SCHED[Scheduler Base44/AWS Scheduler indicado pela plataforma]
 DNS[Domínio próprio/DNS] --> HOST
```
`AWS Scheduler` é **CONFIRMADO** apenas pelos ARNs retornados pelo inventário; detalhes de conta/região são gerenciados pela plataforma.

## Fluxo de dados
```mermaid
flowchart LR
 FORM[Formulários] --> VALID[Validação cliente/servidor]
 VALID --> ENT[Entidades]
 VALID --> FN[Funções]
 FN --> EXT[Terceiros]
 EXT --> WH[Webhook]
 WH --> VERIFY[HMAC + refetch no provedor]
 VERIFY --> ENT
 ENT --> LOG[Logs/Históricos]
 FILE[Uploads] --> STORAGE[Storage] --> URL[URL em entidade]
 RET[Job retenção] -->|limpa/apaga| LOG
```

## Estado
- Stateful: entidades/User, storage, sessões/tokens, configurações, automações, cache Query, formulários e `sessionStorage` de fluxos auth/evento.
- Stateless: componentes de apresentação, calculadoras puras em `src/lib`, handlers HTTP entre chamadas (exceto persistência externa).

## Base44 a substituir
Auth, Entity API/RLS, SDK, funções/runtime, scheduler, storage/Core, integrações IA/e-mail/arquivo, analytics, hosting e publicação.

Fontes: `src/App.jsx`, `src/lib/AuthContext.jsx`, `src/api/base44Client.js`, `vite.config.js`, `base44/*`.