# Fase 12 — CI, Build e Qualidade

Data: 23/08/2026
App: Laboratório de Cozinha
Repositório: `carmen498/nutrimenu-laboratorio-cozinha`

## Objetivo

Transformar build e qualidade em um gate reproduzível, executável localmente, no sandbox Base44 e no GitHub Actions, sem depender de instalação não determinística nem de inspeção manual do bundle.

## Estado homologado

A Fase 12 foi executada a partir de uma instalação limpa do projeto.

Sequência literal de homologação:

```bash
npm ci --no-audit --no-fund
npm run ci:check
```

Resultado: PASS.

O gate `ci:check` executa:

1. typecheck;
2. lint;
3. build Vite;
4. orçamento de build;
5. testes de segurança;
6. `npm audit` completo;
7. `npm audit --omit=dev`;
8. contratos estáticos de go-live.

## 1. Runtime Node padronizado

O sandbox Base44 homologado executa Node `20.20.2` e npm `10.8.2`.

Foi criado `.nvmrc`:

```text
20.20.2
```

O `package.json` também declara:

```json
"engines": {
  "node": "20.x",
  "npm": ">=10"
}
```

O GitHub Actions deixou de usar Node 22 e passa a ler a mesma versão via `node-version-file: .nvmrc`.

Objetivo: reduzir diferença entre CI e o ambiente Base44 realmente usado para build/homologação.

## 2. Instalação reproduzível

`package-lock.json`:

- está versionado;
- usa `lockfileVersion: 3`;
- é compatível com `npm ci`;
- foi atualizado para refletir os requisitos de runtime do pacote raiz.

Teste real:

```text
npm ci
added 618 packages
PASS
```

O build do próprio Base44 também foi alterado de:

```text
npm install
```

para:

```text
npm ci
```

em `base44/config.jsonc`.

Assim, CI e build Base44 passam a consumir o mesmo lockfile em vez de resolver versões novas durante a instalação.

## 3. GitHub Actions

Workflow: `.github/workflows/quality.yml`

Disparos:

- pull request;
- push em `main`;
- semanalmente;
- manualmente via `workflow_dispatch`.

Controles:

- `permissions: contents: read`;
- concorrência por workflow/ref com cancelamento de execução anterior;
- `CI=true`;
- Node vindo de `.nvmrc`;
- cache npm baseado em `package-lock.json`;
- verificação explícita da existência do lockfile;
- instalação via `npm ci`;
- execução única do gate `npm run ci:check`.

O workflow está presente na `main` do GitHub.

## 4. Orçamento de build

Foi criado `scripts/test-build-budget.mjs` e incluído no gate normal.

Limites atuais:

- bundle JS de entrada: até 650 KB;
- qualquer chunk JS: até 650 KB;
- CSS individual: até 180 KB;
- JS total: até 3,2 MB;
- imagem individual: até 250 KB;
- source maps em `dist/assets`: não permitidos por padrão.

Baseline homologada:

```text
entry JS:        541,9 KB
JS total:       2709,0 KB
maior CSS:       111,2 KB
maior imagem:    156,7 KB
```

O orçamento não é uma meta de performance definitiva; é um guardrail de regressão para impedir crescimento silencioso expressivo do bundle.

## 5. Segurança de dependências

Dois audits passam a fazer parte do gate:

```bash
npm audit --audit-level=moderate
npm audit --omit=dev --audit-level=moderate
```

Resultado da homologação:

```text
audit completo:   0 vulnerabilidades
produção:         0 vulnerabilidades
```

Dependabot semanal permanece ativo para npm.

## 6. Testes incluídos no CI

O CI executa automaticamente os testes que não criam dados reais nem dependem de estado externo transitório:

- matriz RLS das sete entidades-filhas;
- hardening das functions agendadas;
- matriz de assinaturas;
- roteamento/proteção de autenticação;
- contratos estáticos de go-live;
- orçamento de build.

## 7. Testes deliberadamente fora do CI normal

Não entram no pipeline automático:

### `test:auth-e2e-temp`

Cria usuário real e caixa de e-mail temporária.

### `test:tenant-e2e-temp`

Cria duas contas reais e dados temporários para homologação A × B.

### `test:production-routes`

Depende da build que estiver efetivamente publicada no domínio e é usado como gate de homologação de produção, não como teste determinístico de todo pull request.

### `test:auth-production`

Faz chamadas reais a endpoints públicos de produção. Deve ser usado em homologação/release, sem tornar cada PR dependente da disponibilidade externa do domínio.

Essa separação evita que o CI comum cause efeitos colaterais em produção ou gere falsos negativos por indisponibilidade de serviços externos.

## 8. Sincronização GitHub

Na homologação da Fase 12, o commit da `main` observado no sandbox Base44 e no GitHub foi o mesmo, confirmando sincronização da revisão corrente.

O repositório usa o `base44-builder[bot]` para commits gerados pelo fluxo Base44.

## 9. Branch protection

A `main` está atualmente sem branch protection/status check obrigatório.

Isso não invalida o CI: o workflow executa em push e PR. Porém, o resultado é um gate de detecção e release, não uma barreira GitHub que impeça tecnicamente todo push direto.

Não foi ativada proteção automaticamente nesta fase por dois motivos:

1. a integração disponível não expõe uma operação segura de branch protection/ruleset;
2. o Base44 sincroniza alterações por bot diretamente na `main`, e uma regra incompatível poderia interromper esse fluxo.

Se o Base44 passar a suportar formalmente branch protection com o bot atual, pode-se exigir o job `quality` antes de merge/push humano.

## 10. Resultado da homologação

Execução limpa:

```text
npm ci                 PASS
npm run typecheck      PASS
npm run lint           PASS
npm run build          PASS
build budget            PASS
security tests          PASS
npm audit               PASS — 0 vulnerabilidades
npm audit --omit=dev    PASS — 0 vulnerabilidades
test:go-live            PASS
```

## Critério de reabertura da Fase 12

Reabrir se:

- `npm ci` deixar de funcionar;
- `package.json` e lockfile divergirem;
- Node do Base44 mudar de linha major;
- workflow parar de executar em `main`/PR;
- budget de build for excedido sem decisão explícita;
- audit reportar `moderate`, `high` ou `critical`;
- testes de segurança ou contratos de go-live falharem.

**Status da Fase 12: VERDE — CI, build reproduzível e gate de qualidade implantados e homologados.**
