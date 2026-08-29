# 6. Listas de Compras e Carrinho

[← Planejamento](05-planejamento-eventos.md) · [Índice](../BUSINESS-RULES.md)

## Escopo
Geração por receita/cardápio/evento, expansão, agregação, embalagens e estado de compra.

## Entidades envolvidas
`ListaCompras`, `CarrinhoItem`, `Receita`, `IngredienteReceita`, `Ingrediente`, `IngredienteUsuario`, `Cardapio`, `Planejamento`.

## 6.1 Origem
1. Receita usa porções/quantidade-alvo e composição escalada.
2. Cardápio agrega receitas e insumos na escala ativa.
3. Evento usa público, PC e margem de produção, nunca preço comercial como quantidade.
4. A lista é snapshot; regeneração é explícita para preservar edição manual.

## 6.2 Explosão
1. Ignorar grupos.
```text
PL = quantidade_por_porcao × porcoes_efetivas
PB = PL × FC_efetivo
```
2. Sub-receita: calcular quantidade requerida, fator sobre PDP e expandir ingredientes.
3. Agregar por `ingrediente_id`, não nome.
4. Excluir `reaproveitamento_processo`.
5. Referência/ciclo ausente gera pendência.

> **Exemplo crítico 1:** 20 porções exigem 400 g de molho. Molho rende 800 g e usa 600 g de tomate com FC 1,2. Fator `0,5`; PL `300 g`; PB `360 g`. Outra receita pede PB `240 g`; lista agrega `600 g`.

> **Limite vigente:** `explodirReceitaParaCarrinho` expande uma camada de sub-receita. Árvores profundas exigem resolvedor canônico ou pendência; não declarar expansão completa sem recursão protegida contra ciclos.

## 6.3 Embalagens e custo
```text
quantidade_embalagens = PB_total / peso_embalagem_g
custo_estimado = quantidade_embalagens × preco_embalagem_rs
```
1. Dados pessoais prevalecem.
2. Lista registra quantidade, unidade, embalagem e custo estimado.
3. Frações são técnicas; arredondamento de compra é explícito.
4. Sem embalagem/preço, preservar quantidade e marcar pendência.

## 6.4 “Já tenho” e “comprado”
1. `ja_tenho` exclui do total a comprar sem apagar necessidade.
2. `CarrinhoItem.comprado` registra progresso, sem alterar origem.
3. Desmarcar restaura participação.
4. Estados pertencem ao usuário.

## 6.5 Persistência e edição
1. `ListaCompras` contém nome, itens, receitas e `total_geral`.
2. `CarrinhoItem` contém ingrediente, embalagens e estado.
3. Edição manual atualiza total, não receita/ingrediente mestre.
4. Reentrada do mesmo ID agrega/atualiza, sem duplicar.
5. RLS limita os dados ao criador conforme esquema.
6. Exclusão não apaga origens.

## 6.6 Integridade
1. `total_geral` é cache recalculável após “já tenho”.
2. Nome/categoria/unidade são snapshots; ID mantém referência.
3. Novo preço não reescreve lista histórica sem ação explícita.
4. PDF/CSV reflete o snapshot exibido.

## Referências
[Receitas](01-receitas.md) · [Ingredientes](02-ingredientes.md) · [Cardápios](03-cardapios.md) · [Motor](04-motor-custos.md) · [Migração](../07-DATA-MIGRATION.md)