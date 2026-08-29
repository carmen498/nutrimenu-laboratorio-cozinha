# 5. Planejamento e Eventos

[← Motor de Custos](04-motor-custos.md) · [Índice](../BUSINESS-RULES.md) · [Compras →](06-compras-carrinho.md)

## Escopo

Público, configuração, produção, orçamento, dossiê, pré-preparos e referências de doces/bebidas.

## Entidades

`Planejamento`, `ReferenciaEvento`, `Receita`, `IngredienteReceita`, `Cardapio`, `CardapioReceita`.

## 5.1 Tipos

Planejamento: `Almoço`, `Jantar`, `Coquetel`, `Data Comemorativa`, `Confraternização`, `Outro`. Serviço: `Bufê`, `Empratado`, `À La Carte`, `Refeição Familiar`, `Self-Service`, `Outro`.

Tipos orientam apresentação e referências, sem substituir público, PC e margem.

## 5.2 Público e produção

```text
total_pessoas = homens + mulheres + criancas
total_base_kg = (homens×PC_h + mulheres×PC_m + criancas×PC_c) / 1000
total_com_margem_kg = total_base_kg × (1 + margem_seguranca_pct/100)
kg_prato = pessoas × PC_prato_g × (1 + margem_evento_pct/100) / 1000
```

Defaults: 600 g/homem, 400 g/mulher e 300 g/criança. Margem geral e margem de prato não são aplicadas duas vezes.

## 5.3 Orçamento

```text
valor_total = preco_pessoa_orcamento × total_pessoas
```

Exibe identificação, pratos, descritivos, itens ativos, validade e observação comercial. Não exibe custos, PC, margens, kg, FC ou quantidades internas.

> **Exemplo crítico:** 80 pessoas × R$ 95 = R$ 7.600. A margem de produção não altera o número comercial de convidados.

## 5.4 Dossiê

Documento operacional consolida público, produção, receitas, quantidades, custos e observações usando os mesmos motores das telas de origem. Não substitui o orçamento.

## 5.5 Pré-preparos

```text
PL = quantidade_escalada
FC_efetivo = override ou padrão
PB = PL × FC_efetivo
```

Agrupar por ingrediente e pré-preparo sem perder instruções. PB é compra; PPP/PDP são rendimento. Expandir sub-receitas sem duplicar cache.

## 5.6 Doces e bebidas

```text
consumidores = total_pessoas × percentual/100
quantidade = consumidores × media_por_pessoa
```

Tipos: `bebida`, `coquetel`, `doce`; unidades: `ml`, `un`, `g`. `sem_padrao=true` exige entrada manual. Receita com mais de dois ingredientes “Açúcares e Doces” exige escolha **Sobremesas** ou **Pães e Bolos**.

## 5.7 Referência de evento

Percentual e média são defaults administrativos. Ajustes no evento ficam no planejamento e não alteram a referência global.

> **Borda:** receita sem PC pode ficar selecionada, mas quantidade e custo permanecem pendentes até PC válido.

## Referências

[Receitas](01-receitas.md) · [Cardápios](03-cardapios.md) · [Compras](06-compras-carrinho.md)