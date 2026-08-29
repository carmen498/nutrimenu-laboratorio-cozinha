# 1. Receitas

[← Índice](../BUSINESS-RULES.md) · [Ingredientes →](02-ingredientes.md)

## Escopo
Regras de composição, escala, rendimento, classificação, sub-receitas, propriedade, custo derivado, preparo e tags.

## Entidades envolvidas
`Receita`, `IngredienteReceita`, `InsumoReceita`, `IngredienteEsquecidoReceita`, `ReceitaTag`, `Tag`, `PerCapitaUsuario`, `HistoricoAlteracaoReceita`.

## 1.1 Escalonamento
1. `Receita.porcoes_base` representa a escala cadastrada; valor não positivo é tratado como `1` apenas para evitar divisão por zero.
2. Fórmulas:
```text
quantidade_base = quantidade_por_porcao × porcoes_base
fator_porcoes = porcoes_desejadas / porcoes_base
quantidade_escalada = quantidade_base × fator_porcoes
fator_rendimento = PDP_desejado / PDP_base
```
3. Itens com `proporcional=false` mantêm quantidade fixa; os demais acompanham o fator.
4. `unidade_quantidade` é `g` ou `ml`; na ausência legada, usa-se `Receita.unidade_base`.

> **Exemplo crítico 1:** receita com 10 porções, 80 g por porção e PDP de 800 g. Para 25 porções, fator `2,5`; o item passa de 800 g para 2.000 g. Para alvo de 1.600 g prontos, fator de rendimento `2`.

## 1.2 Categorias e regra de doces
1. `Receita.categorias` admite múltiplas categorias canônicas.
2. Com mais de dois ingredientes mestre em **Açúcares e Doces**, a classificação solicita escolha entre **Sobremesas** e **Pães e Bolos**.
3. A escolha manual prevalece; tags automáticas ficam limitadas ao subconjunto aprovado para a categoria.

## 1.3 Rendimento técnico canônico
1. `peso_pos_preparo_total` é o PDP canônico; `rendimento_total` é cache compatível e deve ficar sincronizado.
2. `peso_pre_preparo_total` é o PPP e não inclui FC de compra.
3. Sem PDP medido, pode-se estimar pelo somatório líquido, registrando origem/status.

| Origem | Status | Significado |
|---|---|---|
| `medido` | `confirmado` | PDP aferido |
| `estimado` | `estimado` | calculado, não aferido |
| `legado` | `a_validar` | histórico sem garantia |
| `importado` | `a_validar` ou `confirmado` | depende de confirmação |
| sem valor | `pendente` | PDP indisponível |

```text
porcoes_efetivas = PDP_efetivo / per_capita_efetivo
variacao_pct = ((PDP - PPP) / PPP) × 100
```

## 1.4 Per capita
1. Prioridade: `PerCapitaUsuario` aplicável → `Receita.per_capita_g` → referência técnica por categoria/nome.
2. Sugestão não vira medição automaticamente.
3. Sem PC positivo, fluxos usam `porcoes_base` quando possível e sinalizam a limitação.

## 1.5 Sub-receitas
1. `tipo=subreceita` identifica a origem por `subreceita_id`; nomes são cache visual.
2. `referencia_cache` usa a origem como fonte; `snapshot_legado` exige validação.
3. Filhos com `subreceita_parent_id`/`subreceita_cache=true` são cache e não se somam ao marcador pai.
4. A sincronização registra assinatura, origem e data; mudança ancestral marca `desatualizada`.
5. A travessia do grafo rejeita repetição da receita atual com `erro_ciclo`.
6. Referência inexistente produz `origem_ausente`, não custo zero válido.

> **Exemplo crítico 2:** Molho A usa Base B; B tenta usar A. A travessia reencontra A, interrompe a operação e marca ciclo; nenhum cache parcial é válido.

## 1.6 Linhagem e fork-on-edit
1. Catálogo: `is_base=true`, sem dono pessoal, `linhagem_tipo=catalogo`.
2. Pessoal: `is_base=false`, `usuario_dono_id` do usuário.
3. Usuário comum edita catálogo somente após criar cópia com `receita_origem_id`/`forked_from_id`.
4. `receita_raiz_id` permanece estável; `linhagem_geracao = origem + 1`; raiz usa geração `0`.
5. Ciclo/origem ausente gera status correspondente; filhos espelham escopo e dono.

## 1.7 Cache de custos
1. `custo_total`, `custo_insumos` e `custo_por_porcao` são caches; prevalece o [Motor de Custos](04-motor-custos.md).
2. Contexto é `global` ou `proprietario`.
3. Mudança determinante marca invalidação, data, motivo, origem e profundidade.
4. Recálculo completo persiste modelo, contexto, pendências e assinatura.

> **Exemplo crítico 3:** preço do tomate muda: molho recebe profundidade `0`; lasanha que usa o molho, `1`; cardápios recalculam ao vivo e não usam cache antigo.

## 1.8 Modo de preparo
1. Preservar quebras de linha com comportamento `whitespace-pre-line`.
2. Texto numerado inline é separado em passos.
3. Cada passo contém verbo + objeto: “Asse a massa”, não “Asse”.
4. Modo composto não duplica filhos cache de sub-receitas.

## 1.9 Tags
1. Grupos canônicos atuais: `restricao`, `metodo`, `perfil`, `contexto`, `ingrediente`, `molho`.
2. `ReceitaTag` usa IDs; nome/grupo/cor são caches.
3. Atribuição manual e curadoria prevalecem; não duplicar receita/tag.
4. Relações espelham escopo e dono da receita.

## Referências
[Ingredientes](02-ingredientes.md) · [Motor de Custos](04-motor-custos.md) · [Compras](06-compras-carrinho.md) · [Catálogo funcional](../03-FEATURE-CATALOG.md)