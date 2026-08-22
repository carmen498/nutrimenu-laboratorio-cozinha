# P0 — Minimização de dados Mercado Pago

Data: 2026-08-22

## Objetivo

Eliminar persistência e exposição desnecessária de dados de pagamento, tokens temporários, CPF, e-mail, corpo bruto de webhook e material de diagnóstico HMAC.

## Problemas encontrados

1. `Pagamento.payload_enviado_mp` armazenava o `orderBody` completo. Em tentativas reais de cartão, isso incluía token temporário do cartão e e-mail; em PIX, podia incluir CPF e identificação do pagador.
2. `Pagamento.resposta_erro_mp_completa` armazenava a resposta integral do Mercado Pago, que em erros de cartão podia repetir o token da transação.
3. A função `criarPagamentoMercadoPago` devolvia o objeto bruto `mpData` ao frontend em erros e escrevia respostas completas em `console.log`.
4. `LogWebhookMercadoPago.corpo_bruto` persistia o JSON integral da notificação, incluindo identificadores de transação, referências e, em PIX, `e2e_id`.
5. Diagnósticos de assinatura HMAC incluíam assinatura recebida, request-id, manifest e hash HMAC calculado.
6. `testarAssinaturaWebhookMP` não exigia perfil administrador.
7. Funções administrativas de reprocessamento devolviam o objeto bruto da order quando a consulta ao Mercado Pago falhava.

## Correções aplicadas

### Pagamento

- removidos do schema:
  - `payload_enviado_mp`
  - `resposta_erro_mp_completa`
- falhas passam a persistir somente:
  - `status=rejected`;
  - `detalhe_erro` resumido e limitado;
  - `mercadopago_order_id`, quando o provedor devolve o identificador.
- nenhum payload integral é persistido.
- o frontend não recebe mais `mpData` bruto em erros.
- logs de sucesso/falha contêm apenas status HTTP, ID interno, order ID e status técnico.

### Webhook

- removido `corpo_bruto` do schema e do código.
- adicionados metadados mínimos:
  - `acao_notificacao`;
  - `versao_codigo`;
  - `diagnostico_resumo` não sensível.
- o log mantém apenas IDs técnicos, tipo/ação, resultado, status resolvido e validade da assinatura.

### Assinatura HMAC

O diagnóstico agora contém somente indicadores booleanos de configuração/presença e resultado da comparação. Não contém:

- `x-signature`;
- `x-request-id`;
- timestamp recebido;
- hash recebido;
- manifest;
- hash HMAC calculado;
- tamanho do secret.

### Função de teste

`testarAssinaturaWebhookMP` agora exige usuário autenticado com `role=admin` e retorna apenas o resultado dos testes, sem diagnóstico criptográfico.

### Reprocessamentos

`reprocessarPagamentoPix` e `reprocessarPagamentoEstorno` não devolvem mais a order bruta do Mercado Pago em caso de erro.

## Higienização histórica

Executada diretamente no banco real:

- `Pagamento`: 26 registros tiveram `payload_enviado_mp` e/ou `resposta_erro_mp_completa` removidos.
- `LogWebhookMercadoPago`: 77 registros tiveram `corpo_bruto` removido.

Validação pós-limpeza:

- registros `Pagamento` ainda contendo os campos antigos: **0**;
- registros `LogWebhookMercadoPago` ainda contendo `corpo_bruto`: **0**.

## Varredura estática pós-correção

A busca em `base44/` retornou **zero ocorrências** para:

- `payload_enviado_mp`;
- `resposta_erro_mp_completa`;
- `corpo_bruto`;
- `x_signature_recebido`;
- `v1_calculado_por_nos`;
- `manifest_usado`;
- respostas `detalhe: mpData/order/recurso`;
- `JSON.stringify` de `mpData`, `order`, `recurso` ou `body` nos fluxos auditados.

## Status

P0 de minimização de dados do Mercado Pago: **FECHADO**.

Observação operacional: o build deve continuar sendo executado como verificação geral do projeto; durante esta intervenção o serviço de sandbox retornou erro HTTP 500 ao iniciar o comando, sem evidência de erro de código. As entidades já sincronizaram no schema remoto e as consultas de invariantes do banco foram concluídas com sucesso.
