# 4. Motor de Custos Canônico

[← Cardápios](03-cardapios.md) · [Índice](../BUSINESS-RULES.md) · [Planejamento →](05-planejamento-eventos.md)

## Escopo

Fonte de verdade dos custos, resolução de preço, comportamentos, invalidação e integridade de cache.

## Entidades

`Receita`, `IngredienteReceita`, `Ingrediente`, `IngredienteUsuario`, `InsumoReceita`, `IngredienteEsquecidoReceita`, `CardapioReceita`, `CardapioInsumo`.

## 4.1 Princípio canônico

Composição atual + FC + preço efetivo + escala é a fonte de verdade. Custos persistidos são caches. Modelo atual: `CUSTO_RECEITA_MODELO_VERSAO=2`.

## 4.2 Fórmulas da receita

```text
PL_item = quantidade_por_porcao × porcoes_base × fator
PB_item = PL_item × FC_efetivo
custo_item = PB_item × preco_por_g_efetivo
custo_ingredientes = Σ custo_item
custo_total = custo_ingredientes + custo_insumos + custo_esquecidos
custo_por_porcao = custo_total / porcoes_efetivas
custo_por_kg_pronto = (custo_total / PDP_efetivo) × 1000
```

Grupos e marcadores de sub-receita não são itens atômicos. Sub-receitas são resolvidas sem somar marcador e cache ao mesmo tempo. Referência ou preço ausente torna o cálculo incompleto.

## 4.3 Comportamento dos itens

- `comprado`: usa PB e preço; entra em custo e compras.
- `reaproveitamento_processo`: mantém quantidade técnica, mas tem custo incremental zero e não entra em compras.
- Insumos obedecem `por_lote`, `proporcional` ou `por_unidade`.

## 4.4 Contexto de preço

```text
preço pessoal válido → preço global válido → sem preço
```

Contexto `global` usa referência mestre; `proprietario` resolve dados do usuário. Custo pessoal não pode virar referência de outro usuário.

## 4.5 Invalidação em cascata

Determinantes: preço, FC, quantidade, proporcionalidade, PDP, PC, insumo, composição e contexto.

1. Receita alterada recebe profundidade `0`; cada dependente soma `1`.
2. Registrar invalidação, data, motivo, origem e profundidade.
3. Usar conjunto de visitados para impedir ciclos e duplicação.
4. Cardápios e relatórios recalculam ao vivo.

> **Exemplo crítico:** preço de X muda. Bolo (0) usa X; Sobremesa (1) usa Bolo; Combo (2) usa Sobremesa. Cada receita é invalidada uma vez.

## 4.6 Assinatura semântica

A assinatura inclui IDs, versões/datas, quantidades, FC, preços/contexto, rendimento, insumos e dependências em ordenação canônica. Estados: `valida`, `divergente`, `ausente`, `a_verificar`.

Cache atual exige: cálculo completo, assinatura válida e `custo_cache_invalido=false`.

> **Exemplo crítico:** preço muda de `0,010` para `0,012/g`; a assinatura diverge e o sistema recalcula, ignorando o total antigo.

## 4.7 Estados do cache

| Estado | Condição |
|---|---|
| `atual` | completo, assinatura válida, não invalidado |
| `a_recalcular` | determinante alterado ou assinatura divergente |
| `incompleto` | preço, referência ou dependência ausente |
| `legado` | sem garantias do modelo atual |

> **Borda:** sub-receita tem cache global de R$ 20, mas custa R$ 26 no contexto pessoal. Prevalece R$ 26; se a composição falhar, o resultado é incompleto.

## Referências

[Receitas](01-receitas.md) · [Ingredientes](02-ingredientes.md) · [Cardápios](03-cardapios.md)