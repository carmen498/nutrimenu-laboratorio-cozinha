# 4. Motor de Custos Canônico

[← Cardápios](03-cardapios.md) · [Índice](../BUSINESS-RULES.md) · [Planejamento →](05-planejamento-eventos.md)

## Escopo
Fonte de verdade dos custos, resolução de preço, comportamentos, invalidação e integridade de cache.

## Entidades envolvidas
`Receita`, `IngredienteReceita`, `Ingrediente`, `IngredienteUsuario`, `InsumoReceita`, `IngredienteEsquecidoReceita`, `CardapioReceita`, `CardapioInsumo`, `NormalizacaoCustoReceitaLog`.

## 4.1 Princípio canônico
1. Composição atual + FC + preço efetivo + escala é a fonte de verdade.
2. Custos persistidos são caches/compatibilidade.
3. Modelo atual: `CUSTO_RECEITA_MODELO_VERSAO=2`; caches usam `custo_modelo_versao=2`.

## 4.2 Custo de receita
```text
PL_item = quantidade_por_porcao × porcoes_base × fator
PB_item = PL_item × FC_efetivo
custo_item = PB_item × preco_por_g_efetivo
custo_total = Σ ingredientes + Σ insumos_escalados + Σ esquecidos_válidos
custo_por_porcao = custo_total / porcoes_efetivas
```
1. Grupos e marcadores de sub-receita não são itens atômicos.
2. Sub-receitas são resolvidas sem somar marcador e cache simultaneamente.
3. Insumos obedecem `por_lote`, `proporcional` ou `por_unidade`.
4. Referência/preço ausente ou nome/ID divergente torna o cálculo incompleto.

## 4.3 Comportamento
1. `comprado`: usa PB e preço; entra em custo/compras.
2. `reaproveitamento_processo`: mantém quantidade técnica, mas custo incremental zero e fora da compra.

## 4.4 Contexto de preço
```text
preço pessoal válido → preço global válido → sem preço
```
1. `global` usa referência mestre; `proprietario` resolve dados do usuário.
2. Custo pessoal nunca é persistido como referência de outro usuário.
3. Consumidor legado pode ler cache global sem contexto, mas não apresentá-lo como pessoal atualizado.

## 4.5 Invalidação em cascata
Determinantes: preço, FC, quantidade, proporcionalidade, PDP, PC, insumo, composição e contexto.
1. Alterada diretamente: profundidade `0`; cada dependente soma `1`.
2. Marcar invalidação, data, motivo, origem e profundidade.
3. Usar conjunto de visitados para evitar ciclo/duplicação.
4. Cardápios/relatórios recalculam ao vivo.

> **Exemplo crítico 1:** preço de X muda. Bolo (0) usa X; Sobremesa (1) usa Bolo; Combo (2) usa Sobremesa. Cada receita é invalidada uma vez.

## 4.6 Assinatura semântica
1. Inclui determinantes normalizados: IDs, versões/datas, quantidades, FC, preços/contexto, rendimento, insumos e dependências.
2. Ordenação canônica evita alteração por ordem de leitura.
3. Campos: assinatura, versão, status (`valida`, `divergente`, `ausente`, `a_verificar`) e data.
4. Cache atual exige: não invalidado, completo e assinatura válida.
5. Novo algoritmo exige nova versão.

> **Exemplo crítico 2:** preço muda de `0,010` para `0,012/g`; a assinatura diverge e o sistema recalcula, ignorando o total antigo.

## 4.7 Borda de sub-receita
> Sub-receita tem cache global R$ 20, mas composição no contexto pessoal custa R$ 26. Prevalece R$ 26. Se a composição não puder ser resolvida, o resultado é incompleto, não R$ 20 confirmado.

## 4.8 Estado do cache
| Estado | Condição |
|---|---|
| `atual` | completo, assinatura válida, não invalidado |
| `a_recalcular` | determinante alterado/assinatura divergente |
| `incompleto` | sem preço/referência/dependência válida |
| `legado` | sem garantias do modelo atual |

## Referências
[Receitas](01-receitas.md) · [Ingredientes](02-ingredientes.md) · [Cardápios](03-cardapios.md) · [APIs](../05-API-REFERENCE.md)