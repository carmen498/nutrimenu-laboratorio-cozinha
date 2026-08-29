# 3. Cardápios

[← Ingredientes](02-ingredientes.md) · [Índice](../BUSINESS-RULES.md) · [Motor de Custos →](04-motor-custos.md)

## Escopo
Tipos, escala, composição, insumos, propriedade e formação de preço.

## Entidades envolvidas
`Cardapio`, `CardapioReceita`, `CardapioInsumo`, `CardapioTag`, `Receita`, `IngredienteReceita`.

## 3.1 Tipos e escala
| Tipo | Unidade principal | Organização |
|---|---|---|
| `diario` | pessoas | dia/refeição |
| `semanal` | pessoas | dias/refeições |
| `fim_de_semana` | pessoas | sábado/domingo |
| `marmitas` | unidades | produção por unidade |
| `buffet` | pessoas ou kg conforme cadastro | agregada |
| `especial`, `comemoracao`, `happy_hour`, `personalizado` | conforme contexto | livre |

1. `num_unidades` é a escala ativa e deve ser positivo para custo unitário.
2. A unidade semântica deve ser consistente em quantidade, custo e apresentação.

## 3.2 Receitas
1. `receita_id` é identidade; nome/categoria são caches.
```text
quantidade_total_g = per_capita_g × num_unidades
```
2. Custo é calculado para essa quantidade pelo motor; custo persistido é cache.
3. Dia/refeição não alteram a fórmula.
4. Sem PC positivo, o prato permanece pendente.

## 3.3 Insumos
| Comportamento | Regra |
|---|---|
| `por_lote` | base × número de lotes |
| `proporcional` | base × (`num_unidades / escala_base_unidades`) |
| `por_unidade` | base × `num_unidades` |

```text
custo_escalado = quantidade_escalada × custo_unitario
```
1. `custo_total` é cache de escala-base; modelo atual é versão 2.

> **Exemplo crítico 1:** 100 guardanapos para 50 pessoas; para 120: `100×120/50=240`.

> **Borda por lote:** transporte fixo de R$ 80 não vira R$ 192 ao subir de 50 para 120 pessoas; permanece por lote.

## 3.4 Fork-on-edit
1. `is_base=true` é catálogo e não é editado por usuário comum.
2. Primeira edição cria cópia pessoal com dono, origem e data.
3. Receitas, insumos e tags são copiados com IDs novos e escopo do novo pai.
4. Edições seguintes atuam na cópia.

## 3.5 Custos e venda
```text
custo_total = Σ custos_canônicos_das_receitas + Σ insumos_escalados
custo_por_unidade = custo_total / num_unidades
preco_venda_sugerido = custo_por_unidade × (1 + markup_percentual/100)
lucro_unitario = preco_venda_sugerido - custo_por_unidade
```
1. Divisão por zero é indisponível.
2. Markup é acréscimo sobre custo, não margem sobre venda.
3. Atualizar caches somente após cálculo completo.

## 3.6 Observações
1. `observacoes` é produção interna; `observacoes_orcamento` é texto comercial.
2. Orçamento nunca expõe produção, custos internos, FC, PC ou margem operacional.

## Referências
[Receitas](01-receitas.md) · [Motor de Custos](04-motor-custos.md) · [Planejamento](05-planejamento-eventos.md) · [Catálogo](../03-FEATURE-CATALOG.md)