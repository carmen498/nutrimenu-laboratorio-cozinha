# 3. Cardápios

[← Ingredientes](02-ingredientes.md) · [Índice](../BUSINESS-RULES.md) · [Motor de Custos →](04-motor-custos.md)

## Escopo

Tipos, escala, composição, insumos, propriedade e formação de preço.

## Entidades

`Cardapio`, `CardapioReceita`, `CardapioInsumo`, `CardapioTag`, `Receita`.

## 3.1 Tipos e escala

| Tipo | Unidade principal | Organização |
|---|---|---|
| `diario` | pessoas | dia/refeição |
| `semanal` | pessoas | dias/refeições |
| `fim_de_semana` | pessoas | sábado/domingo |
| `marmitas` | unidades | produção unitária |
| `buffet` | pessoas ou kg | produção agregada |
| `especial`, `comemoracao`, `happy_hour`, `personalizado` | conforme contexto | livre |

`num_unidades` é a escala ativa e deve ser positivo para custo unitário.

## 3.2 Receitas

```text
quantidade_total_g = per_capita_g × num_unidades
```

`receita_id` é identidade; nome/categoria são caches. O motor calcula custo para a quantidade. Sem PC positivo, o prato permanece pendente.

## 3.3 Insumos

| Comportamento | Regra |
|---|---|
| `por_lote` | base × número de lotes |
| `proporcional` | base × (`num_unidades / escala_base_unidades`) |
| `por_unidade` | base × `num_unidades` |

```text
custo_escalado = quantidade_escalada × custo_unitario
```

> **Exemplo crítico:** 100 guardanapos para 50 pessoas; para 120 pessoas: `100 × 120/50 = 240`.

> **Borda:** transporte de R$ 80 `por_lote` permanece R$ 80 ao mudar o público, salvo alteração do número de lotes.

## 3.4 Fork-on-edit

Catálogo `is_base=true` não é editado por usuário comum. A primeira edição cria cópia pessoal com proprietário, origem e data; filhos são copiados com IDs novos e escopo do novo pai.

## 3.5 Custos e venda

```text
custo_total = Σ custos_canônicos_receitas + Σ insumos_escalados
custo_por_unidade = custo_total / num_unidades
preco_venda_sugerido = custo_por_unidade × (1 + markup_percentual/100)
lucro_unitario = preco_venda_sugerido - custo_por_unidade
```

Markup é acréscimo sobre custo, não margem sobre venda. Divisão por zero é indisponível.

## 3.6 Observações

`observacoes` é produção interna; `observacoes_orcamento` é texto comercial. Orçamento não expõe custos, FC, PC ou margens operacionais.

## Referências

[Receitas](01-receitas.md) · [Motor de Custos](04-motor-custos.md) · [Planejamento](05-planejamento-eventos.md)