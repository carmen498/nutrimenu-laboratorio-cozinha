# 05 — Referência de APIs

## Convenção
- Frontend invoca `base44.functions.invoke(nome, body)`; externamente: `POST /functions/<nome>` salvo exceções de webhook.
- Auth é token Base44; handlers usam `createClientFromRequest(req).auth.me()`; operações privilegiadas usam `asServiceRole`.
- **NÃO ENCONTRADO:** contrato formal global de timeout/rate limit/retry.

## Funções inventariadas (53)
`analisarReceitaTexto`, `aplicarRetencaoLogs`, `aplicarTagsAutomatico`, `atualizarPrecosAutomatico`, `atualizarPrecosLoteZerados`, `auditarAssinaturasCustos`, `backfillMedidasCaseiras`, `buscarPrecosIA`, `campanhaEmail`, `cleanupTesteRlsTemporario`, `contagensHome`, `converterMedidasReceitas`, `corrigirPorcoesBaseImportacao`, `corrigirRendimentoReceitas`, `criarPagamentoMercadoPago`, `curadoriaCustosPendentes`, `curadoriaDivergenciasIngrediente`, `enviarLembretePendencia`, `enviarPlanoVencendo`, `enviarTrialExpirando`, `enviarTrialVencido`, `f102-alias-a47f61c9`, `f102-run-8d4c1a6e9b27`, `fase102-49ada06eebbfa451831844e1afbe8134`, `fase102-executor-7d3f`, `fase102-fila502-d31a90f4`, `faxinaCategoriasReceitas`, `fundirIngredientes`, `gerenciarAtualizacaoAutomatica`, `importarIngredientesCsv`, `importarMedidasCaseirasCsv`, `importarSinonimosCsv`, `inicializarTrialUsuario`, `invalidarCustosDependentes`, `logUserAgentDiagnostico`, `migrarCategorias`, `normalizarCustosReceitas`, `normalizarIngredienteReceita`, `normalizarLinhagemReceitas`, `normalizarMedidasCaseiras`, `padronizarCaixaNomes`, `preencherPerCapitaCategoria`, `preflightGoLive`, `preflightLaboratorioCustos`, `registrarAceiteTermos`, `registrarHistoricoReceita`, `reprocessarPagamentoEstorno`, `reprocessarPagamentoPix`, `salvarCalculoCusto`, `saneamentoIngredientes`, `sanearCustosPendentes`, `sanearDivergenciasIngredienteNomeId`, `sanearMedidaCaseira`, `sincronizarConfiguracaoPlanos`, `sincronizarSubreceita`, `testarAssinaturaWebhookMP`, `verificarExcluirIngrediente`, `webhookMercadoPago`.

## Contratos críticos confirmados
### `webhookMercadoPago`
- Público; `POST`; query/body `data.id`, `type/topic`, `action`; headers `x-signature`, `x-request-id`.
- 401 assinatura inválida; 200 recebido/não mapeado/recurso ausente; 500 exceção.
- Refaz consulta em `/v1/orders/{id}` ou `/v1/payments/{id}`; atualiza Pagamento/User; e-mail/WhatsApp; idempotência por status.
- Fonte: `base44/functions/webhookMercadoPago/entry.ts`.

### `salvarCalculoCusto`
- Autenticado + add-on; body `{calculo,itens}`; 400 validação, 404 acesso, 409 versão posterior, 500 falha; cria CalculoCusto e até 50 itens, com rollback compensatório.
- Fonte: `base44/functions/salvarCalculoCusto/entry.ts`.

### `campanhaEmail`
- Admin; `{acao:'teste'|'disparar', destinatarios?, assunto, corpo}`; 401/403/400/500; envia Resend; filtra inativos. Limite interno atual de usuários: 2000 (**RISCO**).

### `contagensHome`
- Autenticado; sem body; retorna totais; consultas limitadas a 5000 (**RISCO**).

### Pagamento/trial/termos
- `criarPagamentoMercadoPago`: autenticado, preço servidor, consentimento, idempotência, device ID, cartão/PIX.
- `inicializarTrialUsuario`: autenticado, trial único e aceite legal.
- `registrarAceiteTermos`: autenticado, versões legais server-side.

## Exemplos sanitizados
```json
POST /functions/salvarCalculoCusto
Authorization: Bearer <TOKEN>
{"calculo":{"origem_id":"<ID>","quantidade_produzida":10,"custo_total":100,"custo_unitario":10},"itens":[{"tipo":"ingredientes","descricao":"Ingredientes","valor_total":100}]}
```
```json
{"success":true,"calculo_id":"<ID>","versao_calculo":1,"itens":1}
```

`docs/openapi.yaml` cobre os contratos confirmados; demais funções ficam `PARTIAL` até extração AST/contratos e testes.