# 1. Receitas

[← Índice](../BUSINESS-RULES.md) · [Ingredientes →](02-ingredientes.md)

## Escopo

Composição, escala, rendimento, classificação, sub-receitas, propriedade, custos derivados, preparo e tags.

## Entidades

`Receita`, `IngredienteReceita`, `InsumoReceita`, `IngredienteEsquecidoReceita`, `ReceitaTag`, `Tag`, `PerCapitaUsuario`, `HistoricoAlteracaoReceita`.

## 1.1 Escalonamento

1. `Receita.porcoes_base` representa a escala cadastrada.
2. Fórmulas:

```text
quantidade_base = quantidade_por_porcao × porcoes_base
fator_porcoes = porcoes_desejadas / porcoes_base
quantidade_escalada = quantidade_base × fator_porcoes
fator_rendimento = PDP_desejado / PDP_base
```

3. `proporcional=false` mantém quantidade fixa; demais itens acompanham o fator.
4. `unidade_quantidade` é `g` ou `ml`; legado usa `Receita.unidade_base`.

> **Exemplo crítico:** receita com 10 porções, 80 g por porção e PDP de 800 g. Para 25 porções, fator `2,5` e quantidade `2.000 g`. Para alvo de 1.600 g prontos, fator de rendimento `2`.

## 1.2 Categorias e doces

1. `Receita.categorias` admite múltiplas categorias.
2. Com mais de dois ingredientes em **Açúcares e Doces**, solicitar escolha entre **Sobremesas** e **Pães e Bolos**.
3. Escolha manual prevalece; tags automáticas ficam limitadas ao subconjunto aprovado.

## 1.3 Rendimento técnico

1. `peso_pos_preparo_total` é PDP canônico; `rendimento_total` é cache compatível e deve ficar sincronizado.
2. `peso_pre_preparo_total` é PPP e não inclui FC.
3. Sem PDP medido, pode-se estimar pelo somatório líquido, registrando origem/status.

| Origem | Status | Regra |
|---|---|---|
| `medido` | `confirmado` | PDP aferido |
| `estimado` | `estimado` | calculado, não aferido |
| `legado` | `a_validar` | histórico sem garantia |
| `importado` | `a_validar`/`confirmado` | depende de confirmação |
| sem valor | `pendente` | PDP indisponível |

```text
porcoes_efetivas = PDP_efetivo / per_capita_efetivo
variacao_pct = ((PDP - PPP) / PPP) × 100
```

## 1.4 Per capita

Prioridade: `PerCapitaUsuario` aplicável → `Receita.per_capita_g` → referência técnica. Sem PC positivo, usar `porcoes_base` quando possível e sinalizar limitação.

## 1.5 Sub-receitas

1. `tipo=subreceita` referencia `subreceita_id`; nomes são caches.
2. `referencia_cache` usa a origem; `snapshot_legado` exige validação.
3. Filhos cache não são somados ao marcador pai.
4. Mudança ancestral marca sincronização `desatualizada`.
5. Repetição da receita na travessia gera `erro_ciclo`; origem ausente gera `origem_ausente`.

> **Exemplo crítico:** Molho A usa Base B; B tenta usar A. A travessia reencontra A, interrompe a operação e invalida qualquer cache parcial.

## 1.6 Linhagem e fork-on-edit

1. Catálogo: `is_base=true`, sem dono pessoal, geração `0` na raiz.
2. Pessoal: `is_base=false`, `usuario_dono_id` do usuário.
3. Editar catálogo cria cópia com `receita_origem_id`/`forked_from_id`.
4. `receita_raiz_id` permanece estável; `linhagem_geracao = geração_origem + 1`.
5. Filhos espelham escopo e proprietário.

## 1.7 Cache de custos

1. `custo_total`, `custo_insumos` e `custo_por_porcao` são caches; prevalece o [Motor de Custos](04-motor-custos.md).
2. Contexto é `global` ou `proprietario`.
3. Mudança determinante registra invalidação, data, motivo, origem e profundidade.
4. Recálculo completo persiste versão, contexto, pendências e assinatura.

## 1.8 Modo de preparo

Preservar quebras de linha; separar numeração inline; exigir passos autossuficientes com verbo + objeto; modo composto não duplica cache de sub-receitas.

## 1.9 Tags

Grupos canônicos atuais: `restricao`, `metodo`, `perfil`, `contexto`, `ingrediente`, `molho`. `ReceitaTag` usa IDs; não duplicar receita/tag; atribuição manual e curadoria prevalecem.

## Referências

[Ingredientes](02-ingredientes.md) · [Motor de Custos](04-motor-custos.md) · [Compras](06-compras-carrinho.md)