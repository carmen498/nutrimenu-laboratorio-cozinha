# Política Técnica de Logs, Minimização e Retenção

**Aplicação:** Laboratório de Cozinha  
**Versão:** `2026-08-23-v1`  
**Classificação:** P1 — governança operacional e minimização de dados

## Princípios

1. Logs servem para diagnóstico, idempotência e auditoria; não devem virar banco paralelo de dados pessoais.
2. Novos logs de comunicação não persistem e-mail ou telefone completos.
3. Conteúdo de mensagem, payload bruto de provedor, token, assinatura, cartão e segredo não são persistidos nos logs operacionais.
4. Registros financeiros (`Pagamento`) não são tratados como log descartável. O registro transacional é preservado; apenas dados transitórios são removidos.
5. A rotina de retenção é administrativa, exige usuário `admin` e oferece modo `simular` antes de `aplicar`.

## Retenção

| Classe | Entidades | Prazo |
|---|---|---:|
| Webhook técnico | `LogWebhookMercadoPago`, `LogUserAgentDiagnostico` | 90 dias |
| Comunicação | `LogEmail`, `LogWhatsapp` | 180 dias |
| Operacional | `LogAtualizacaoPrecos`, `AtualizacaoLotePrecosLog`, `NormalizacaoCustoReceitaLog`, `NormalizacaoLinhagemReceitaLog`, `PreenchimentoPerCapitaLog`, `SaneamentoCustoPendenciaLog`, `SincronizacaoSubreceitaLog` | 365 dias |
| Auditoria/correção | `SaneamentoMedidaCaseiraLog`, `CorrecaoPorcoesBaseLog`, `CorrecaoRendimentoLog`, `RelatorioFaxinaCategoriasReceitas`, `HistoricoAlteracaoReceita` | 730 dias |
| Governança | `LogRetencaoDados` | 730 dias |

## Pagamentos

`Pagamento` não é excluído pela rotina de retenção. Após 30 dias, a rotina remove, quando ainda presentes:

- `qr_code`;
- `qr_code_base64`;
- `detalhe_erro`;
- `idempotency_key`.

São preservados os dados necessários à reconciliação e ao histórico contratual, incluindo status, plano, valores, `mercadopago_order_id`, versões/aceite dos documentos legais e referência de nota fiscal.

## Logs de comunicação

### Novas gravações

`LogEmail` passa a armazenar:

- `usuario_id` técnico;
- e-mail mascarado;
- tipo de comunicação;
- status;
- data/hora;
- erro resumido e sanitizado, apenas quando houver falha.

`LogWhatsapp` passa a armazenar:

- `usuario_id` técnico;
- somente os quatro últimos dígitos do telefone;
- tipo de comunicação;
- modo de teste;
- status.

A deduplicação das automações usa prioritariamente `usuario_id`. Consulta por e-mail/telefone completo permanece apenas como compatibilidade com registros legados anteriores a esta política.

### Registros legados

Ao aplicar a política, contatos completos em `LogEmail` e `LogWhatsapp` com mais de 30 dias são mascarados. `detalhe_erro` de e-mail com mais de 30 dias é removido.

## Execução

Backend: `aplicarRetencaoLogs`.

A função:

- exige autenticação e `role=admin`;
- aceita `modo: "simular"` ou `modo: "aplicar"`;
- retorna contagens agregadas, nunca dados pessoais;
- registra execuções efetivas em `LogRetencaoDados`;
- processa em lotes limitados para evitar execução sem limite.

Interface administrativa: **Auditorias → Logs e Retenção**.

## Automação

A política não foi conectada a uma função agendada sem autenticação. Isso é intencional: no modelo atual da plataforma, functions usadas por automações também possuem endpoint HTTP, e não há nesta implementação uma identidade exclusiva/documentada do scheduler que permita conceder exclusão service-role apenas ao agendador.

Até existir um mecanismo seguro de scheduler-only, a aplicação da retenção deve ser feita pela área administrativa. A cadência operacional recomendada é mensal.

## Validações da implementação

- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS;
- `node scripts/test-rls-children.mjs`: PASS 7/7;
- transpile/syntax check dos backends alterados: PASS;
- `git diff --check`: PASS.
