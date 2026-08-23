# P2 — Dependências e manutenção

Data: 2026-08-23
Escopo: frontend/build do Laboratório de Cozinha

## Objetivo

Manter a cadeia de dependências sem vulnerabilidades conhecidas, com atualização reproduzível e sem misturar correções de segurança com grandes migrações de framework.

## Estado inicial encontrado

O inventário de 23/08/2026 encontrou 13 vulnerabilidades em dependências de produção: 6 `high` e 7 `moderate`.

Os principais componentes afetados eram:

- `lodash`;
- `postcss` / `nanoid`;
- `react-router-dom` / `react-router` / `@remix-run/router`;
- `dompurify` transitivo de `jspdf`;
- `ws`, `engine.io-client` e `socket.io-parser` transitivos do SDK Base44;
- `picomatch`;
- `quill` 1.x, trazido por `react-quill`.

O audit completo também apontou vulnerabilidades em dependências de desenvolvimento/build, incluindo Vite/Rollup/Babel e utilitários transitivos.

## Correções aplicadas

1. Executado `npm audit fix` sem `--force`, atualizando versões compatíveis do lockfile.
2. `react-quill` foi removido, pois não havia nenhum import/uso no código do aplicativo; com isso `quill` 1.x também saiu da árvore.
3. `react-router-dom` foi atualizado para a linha 7.18.x para eliminar os advisories que não tinham correção segura dentro da linha 6.x. O app usa APIs que permaneceram disponíveis (`BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `Outlet`, `useNavigate`, `useLocation`, `useParams`, `useSearchParams`, `useNavigationType`) e todos os gates passaram após a migração.
4. `caniuse-lite`/Browserslist foi atualizado, eliminando o aviso de base de browsers desatualizada.
5. Vulnerabilidades das ferramentas de desenvolvimento foram corrigidas com `npm audit fix` sem `--force`.

## Resultado

- `npm audit`: **0 vulnerabilidades conhecidas**;
- `npm audit --omit=dev`: **0 vulnerabilidades conhecidas**;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS;
- teste RLS: PASS 7/7;
- teste de functions agendadas: PASS 5/5.

## Política de manutenção implantada

### Gate local/CI

O `package.json` passou a expor:

- `npm run test:security`;
- `npm run audit:security`;
- `npm run maintenance:check`.

O gate completo executa typecheck, lint, build, testes de segurança e `npm audit` com nível mínimo `moderate`.

### CI do GitHub

Criado `.github/workflows/quality.yml`:

- roda em pull requests;
- roda em pushes para `main`;
- roda semanalmente;
- pode ser disparado manualmente;
- usa `npm ci` e o gate `maintenance:check`.

### Dependabot

Criado `.github/dependabot.yml` com verificação semanal de npm. Atualizações minor/patch são agrupadas para reduzir ruído; atualizações maiores permanecem visíveis para análise deliberada.

## Regra para versões maiores

Não foi executada atualização indiscriminada para versões major apenas porque existem versões mais novas. Migrações como React 19, Vite 8, Tailwind 4, Recharts 3, Zod 4 e outras devem ser tratadas como modernização planejada, cada uma com teste funcional próprio.

Versão desatualizada, por si só, não é classificada como vulnerabilidade quando o audit e os advisories aplicáveis estão limpos.

## Cadência recomendada

- semanal: CI + Dependabot + audit;
- mensal: revisar PRs de minor/patch e `npm outdated`;
- trimestral: avaliar majors e dependências sem uso;
- antes de cada release: executar `npm ci && npm run maintenance:check`.

## Critério de reabertura do P2

Reabrir este item se ocorrer qualquer um dos seguintes:

- `npm audit` reportar vulnerabilidade `moderate`, `high` ou `critical`;
- dependência sem uso permanecer com advisory ativo;
- upgrade obrigatório exigir major com regressão funcional;
- Base44 alterar requisitos de versão de Node, Vite ou SDK;
- o workflow semanal permanecer falhando sem tratamento.

**Estado em 23/08/2026: P2 FECHADO — audit de produção e audit completo com 0 vulnerabilidades conhecidas.**
