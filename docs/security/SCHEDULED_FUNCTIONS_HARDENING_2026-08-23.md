# P2 — Hardening de Functions Agendadas

Data: 23/08/2026

## Contexto

A documentação oficial do Base44 informa que toda backend function possui endpoint HTTP e que automações agendadas executam essas mesmas functions. Não há, na documentação pública consultada, um mecanismo de autenticação exclusivo e verificável do scheduler que permita distinguir de forma criptográfica uma execução agendada de uma chamada HTTP anônima ao mesmo endpoint.

Referências oficiais:
- https://docs.base44.com/developers/backend/resources/backend-functions/overview
- https://docs.base44.com/developers/backend/resources/backend-functions/automations

Por isso, o controle adotado não finge existir uma identidade secreta do scheduler. A estratégia é reduzir o impacto de chamadas HTTP diretas por meio de restrições determinísticas e idempotência.

## Functions agendadas inventariadas

1. `enviarLembretePendencia`
2. `enviarPlanoVencendo`
3. `enviarTrialExpirando`
4. `enviarTrialVencido`
5. `atualizarPrecosAutomatico`

## Controle compartilhado

Todas passam por `protegerExecucaoAgendada()` em `base44/shared/protecoesAutomacao.ts`.

O gate aplica:

- somente método `POST`;
- usuário autenticado comum recebe `403`;
- administrador autenticado pode executar manualmente para diagnóstico;
- chamada sem usuário só executa dentro da janela esperada em `America/Sao_Paulo`;
- cooldown persistente em `ConfiguracaoSistema` impede reexecuções frequentes;
- os jobs não aceitam IDs, usuários-alvo ou outros parâmetros de negócio vindos do request;
- notificações também mantêm deduplicação por usuário/tipo/dia ou por pagamento.

## Janelas e cooldown

- lembrete de pagamento pendente: janela matinal; cooldown de 20 h;
- plano vencendo: janela matinal; cooldown de 20 h;
- trial expirando: janela restrita em torno do horário agendado; cooldown de 20 h;
- trial vencido: janela restrita em torno do horário agendado; cooldown de 20 h;
- atualização automática de preços: segunda-feira, janela 02:30–04:30; cooldown de 144 h.

A atualização de preços possui a janela mais restritiva por ter custo de integração/IA e alterar dados mestres.

## Teste automatizado

`scripts/test-scheduled-functions.mjs` verifica que todas as cinco functions:

- usam `protegerExecucaoAgendada`;
- possuem cooldown;
- possuem janela de execução;
- interrompem a execução quando o gate retorna resposta;
- não fazem `req.json()` para receber parâmetros de negócio.

## Risco residual

O risco não pode ser classificado como zero porque chamadas HTTP anônimas feitas exatamente dentro da janela esperada podem ser indistinguíveis do scheduler segundo o contrato público atual do Base44. O cooldown e a idempotência tornam esse vetor limitado e não permitem selecionar alvos arbitrários.

Também existe uma pequena janela de concorrência teórica no lock baseado em leitura/atualização de `ConfiguracaoSistema`, pois a documentação pública não oferece compare-and-swap/lock transacional para esse caso. As deduplicações de negócio reduzem o efeito nos jobs de comunicação.

## Critério de reabertura

Reabrir este P2 se o Base44 publicar suporte a qualquer um destes mecanismos:

- identidade assinada do scheduler;
- header secreto configurável por automação;
- endpoint privado/scheduler-only;
- lock transacional ou compare-and-swap aplicável a functions.

Nessa hipótese, substituir o hardening compensatório pela autenticação nativa da plataforma.

## Estado

**P2 fechado com mitigação máxima disponível no contrato público atual da plataforma, mantendo risco residual documentado.**
