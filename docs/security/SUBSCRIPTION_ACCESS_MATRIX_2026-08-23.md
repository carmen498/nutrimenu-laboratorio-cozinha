# Fase 7 — Matriz de Assinaturas e Controle de Acesso

Data: 23/08/2026

## Regra central

Acesso funcional ao Laboratório de Cozinha é concedido quando:

- `role === "admin"`; ou
- `status_assinatura` é `ativo` ou `trial` **e** `data_expiracao` é uma data ISO válida (`YYYY-MM-DD`) igual ou posterior ao dia atual em `America/Sao_Paulo`.

A data de expiração é **inclusiva**. O acesso é bloqueado somente quando `data_expiracao < hoje` em São Paulo.

Status bloqueantes prevalecem sobre a data. Assim, `vencido`, `cancelado` e `inativo` não liberam acesso mesmo que a data de expiração esteja no futuro.

## Matriz de estados

| Cenário | Resultado esperado |
|---|---|
| Sem usuário | Bloqueado — `sem_usuario` |
| Admin sem data | Liberado — `admin` |
| Trial válido | Liberado — `trial` |
| Trial no último dia | Liberado — `trial` |
| Trial expirado | Bloqueado — `expirado` |
| Mensal ativo válido | Liberado — `ativo` |
| Mensal no último dia | Liberado — `ativo` |
| Anual ativo válido | Liberado — `ativo` |
| Renovação ativa válida | Liberado — `ativo` |
| Ativo com data passada | Bloqueado — `expirado` |
| Vencido com data futura | Bloqueado — `vencido` |
| Cancelado com data futura | Bloqueado — `cancelado` |
| Inativo com data futura | Bloqueado — `inativo` |
| Ativo/trial sem data válida | Bloqueado — `sem_data_expiracao` |
| Sem status | Bloqueado — `sem_status` |

## Períodos inclusivos

- Trial: 7 dias → `data_inicio + 6 dias`.
- Plano 30 dias: 30 dias → `data_inicio + 29 dias`.
- Plano anual: 365 dias → `data_inicio + 364 dias`.

A função compartilhada `base44/shared/datasAssinatura.ts` é a fonte única para o cálculo de expiração inclusiva no backend.

## Fuso horário

Frontend e backend usam `America/Sao_Paulo`. Isso evita bloquear antecipadamente um usuário que esteja em outro fuso ou quando já for o dia seguinte em UTC, mas ainda não em São Paulo.

## Rotas liberadas sem assinatura

Usuário autenticado e com Termos vigentes pode acessar mesmo sem assinatura ativa:

- `/planos` — contratação/renovação;
- `/conta` — gestão da própria conta;
- `/suporte` — canal de suporte.

Demais rotas protegidas redirecionam para `/planos` quando o entitlement está bloqueado.

## Funções server-side pagas

As funções abaixo exigem `exigirAssinaturaAtiva()` antes de executar a funcionalidade:

- `analisarReceitaTexto`;
- `buscarPrecosIA`;
- `registrarHistoricoReceita`.

A resposta de uma conta bloqueada é HTTP `403` com `code: "subscription_required"` e o motivo específico.

## Funções que deliberadamente não exigem assinatura ativa

Precisam continuar acessíveis para recuperação/contratação:

- `criarPagamentoMercadoPago`;
- `registrarAceiteTermos`;
- `inicializarTrialUsuario` (com proteção contra reutilização do trial).

## Trial

O backend é a autoridade final. Uma conta com qualquer histórico de assinatura/trial recebe `409 trial_already_used` ao tentar inicializar novo trial.

A tela de Planos também bloqueia visualmente o botão de teste grátis para contas com histórico, evitando divergência entre UX e regra server-side.

## Normalização de vencidos

`normalizarAssinaturasVencidas()` marca como `vencido` registros `ativo`/`trial` cuja `data_expiracao` seja anterior a hoje. A normalização é executada nas rotinas diárias de comunicação de trial/plano.

Mesmo antes da normalização persistida, frontend e funções pagas calculam a validade pela data real e bloqueiam imediatamente após o fim do último dia.

## RLS × assinatura

RLS continua responsável por isolamento/ownership entre usuários. O entitlement comercial é aplicado em `ProtectedRoute` e nas funções pagas server-side. Não foi adicionada dependência de `status_assinatura` às regras RLS nesta fase para não misturar isolamento de tenant com estado comercial sem um teste real de sessão específico para esse desenho.

## Teste regressivo

`scripts/test-subscription-matrix.mjs` valida:

- 15 estados de assinatura;
- igualdade frontend/backend;
- último dia inclusivo;
- fronteira UTC × São Paulo;
- rotas liberadas sem assinatura;
- 1, 7, 30 e 365 dias de acesso;
- HTTP 403 `subscription_required` server-side;
- presença do gate nas funções pagas;
- ausência deliberada do gate nas funções necessárias à renovação/aceite/trial.

O teste integra `npm run test:security`.
