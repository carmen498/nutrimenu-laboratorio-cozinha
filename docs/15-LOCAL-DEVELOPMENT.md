# 15 — Desenvolvimento local

## Pré-requisitos confirmados
Node 20.x, npm >=10 e credenciais Base44 adequadas (`package.json`).

## Projeto atual conectado ao Base44
```bash
npm ci
cp .env.example .env.local
npm run dev
```
Configurar apenas variáveis Base44 necessárias; segredos backend permanecem no secret store Base44, não no frontend.

## Verificações confirmadas
```bash
npm run typecheck
npm run lint
npm run build
npm run test:security
npm run test:cost-scaling
npm run test:cost-signature
npm run test:cost-reference
npm run test:cost-lab
npm run test:go-live
```
Suite completa: `npm run maintenance:check`; release: `npm run release:check`. Alguns scripts acessam ambiente real/temporário: revisar fonte e usar tenant de teste.

## Banco/migrations/seed
No estado atual são geridos pelo Base44; comando local **NÃO ENCONTRADO**. Para destino independente, definir compose/IaC, aplicar DDL gerado e seed somente de configuração/catálogos aprovados.

## Build/preview
```bash
npm run build
npm run preview
```
Artefato `dist` (`base44/config.jsonc`).

## Troubleshooting
- App ID nulo: conferir `VITE_BASE44_APP_ID`/fallback.
- Auth/403: token, usuário registrado, RLS e plano.
- Função desatualizada: publicação Base44 pode ser necessária.
- `base44:runtime` fora da plataforma: não executa em Node; portar/adaptar.

**PARTIAL:** execução completa independente do Base44 ainda não existe e é objetivo da migração.