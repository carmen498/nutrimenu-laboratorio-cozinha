# 00 — Visão executiva

> Estado: **PARTIAL**. `CONFIRMADO` = código/configuração inspecionados; `INFERIDO` = conclusão arquitetural; `NÃO ENCONTRADO` e `AÇÃO NECESSÁRIA` são lacunas explícitas.

## Projeto
- **CONFIRMADO — Nome:** Laboratório de Cozinha (`base44/config.jsonc`).
- **CONFIRMADO — Finalidade:** gestão de receitas, ingredientes, fichas técnicas, cardápios/eventos, compras, custos, preços e comunicação transacional (`src/App.jsx`, `src/pages/*`).
- **CONFIRMADO — Perfis:** `admin` e `user`; assinatura/trial adicionam gates comerciais (`base44/entities/User.jsonc`, `src/components/ProtectedRoute.jsx`).
- **CONFIRMADO — Stack:** React 18, Vite 6, Tailwind, React Router, TanStack Query, Base44 SDK/BaaS, funções TypeScript/Deno (`package.json`, `src/api/base44Client.js`, `base44/functions/*`).
- **CONFIRMADO — Produção:** Base44; domínio padrão `https://laborat-rio-de-cozinha.base44.app` e domínio canônico referenciado `https://laboratoriodecozinha.com.br` (`index.html`).
- **CONFIRMADO — Terceiros:** Mercado Pago, Resend, Wascript, Google Fonts; IA/arquivos via integrações Core Base44.
- **NÃO ENCONTRADO:** tecnologia/versão física do banco, região de banco/storage, SLA, backups, observabilidade central, staging separado.

## Componentes e fluxos críticos
1. Cadastro → OTP → aceite legal → trial → `/app`.
2. Login senha/Google, recuperação de senha e gates de assinatura.
3. CRUD e fork-on-edit de receitas/cardápios; RLS por catálogo/dono.
4. Composição, escalonamento, rendimento, per capita, medidas e sub-receitas.
5. Custos, rateio, formação de preço, snapshots, histórico e recálculo.
6. Checkout cartão/PIX → Mercado Pago → webhook → assinatura → e-mail/WhatsApp.
7. Jobs de trial, plano, pendência e preços.
8. Administração de usuários, planos, templates e campanhas.

## Dados e serviços
- **CONFIRMADO:** entidades Base44 JSON Schema; atributos embutidos `id`, `created_date`, `updated_date`, `created_by_id`; RLS declarativa em entidades.
- **CONFIRMADO:** storage Base44 público/privado através de Core UploadFile/UploadPrivateFile; URLs em campos.
- **CONFIRMADO:** 8 automações cadastradas (6 ativas, 2 históricas arquivadas/inativas; consulta de automações em 2026-08-26).
- **CONFIRMADO:** 53 funções backend listadas pela plataforma; endpoints públicos em `/functions/<nome>`.

## Riscos principais
- Auth, RLS, entidades dinâmicas, funções, automações e storage são serviços proprietários Base44.
- Senhas/sessões/OAuth podem não ser exportáveis; provável reset/relink.
- DDL, índices, constraints físicas e backups não estão no repositório.
- IDs e timestamps embutidos precisam ser preservados ou mapeados.
- Webhook e checkout exigem consistência, assinatura, idempotência e cutover coordenado.
- URLs de arquivos e links de recuperação referenciam infraestrutura atual.

## O que precisa continuar funcionando depois da migração
- Todos os fluxos 1–8 acima, com equivalência de autorização e cálculos.
- Isolamento entre usuários e catálogo público; administradores mantêm acesso global.
- Rastreabilidade de linhagem, caches, histórico de custos e sub-receitas.
- Pagamentos sem duplicidade; ativação/revogação corretas; PIX/cartão; webhooks assinados.
- Entrega/deduplicação de e-mails e WhatsApp; templates e logs.
- Jobs nos horários de São Paulo e retenção/minimização de logs.
- Upload/download/PDF/CSV e integridade das URLs/arquivos.
- Termos/privacidade e provas de aceite.
- Rotas públicas, protegidas, responsividade e domínio/TLS.

Fontes: `src/App.jsx`, `package.json`, `base44/config.jsonc`, `base44/entities/*.jsonc`, `base44/functions/*`, `index.html`.