# 16 — Deployment atual

## Confirmado
- Config: `npm ci`, `npm run build`, saída `./dist`, serve dev `npm run dev` (`base44/config.jsonc`).
- Hosting/publicação, funções, entities, RLS, secrets e automations são geridos pelo Base44.
- Vite plugin injeta notificadores, analytics e edição visual.
- Produção padrão: `laborat-rio-de-cozinha.base44.app`; domínio próprio referenciado em `index.html`.

## Fluxo inferido
Commit/editor → build Vite → publicação hosting; schemas/functions são implantados pela plataforma; secrets ficam fora do repo; automações referenciam funções. Ordem e atomicidade exatas: **NÃO ENCONTRADO**.

## Implícito Base44 a tornar explícito
Infra/IaC, runtime Deno, gateway, TLS/CDN, auth, banco, schema apply, RLS, storage, scheduler, logs, secret injection, rollback/versionamento, backups e health checks.

## Ações pré-migração
Exportar configuração de domínio/DNS/certificados, histórico de deploy, versão publicada, automações, secrets names, schema/dados/storage/logs e baseline de testes. Não assumir que editar código publica imediatamente; realizar Publish controlado.