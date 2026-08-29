# 6. Listas de Compras e Carrinho

[← Planejamento](05-planejamento-eventos.md) · [Índice](../BUSINESS-RULES.md)

## Escopo

Geração por receita, cardápio ou evento; expansão, agregação, embalagens e estado de compra.

## Entidades

`ListaCompras`, `CarrinhoItem`, `Receita`, `IngredienteReceita`, `Ingrediente`, `IngredienteUsuario`, `Cardapio`, `Planejamento`.

## 6.1 Origem

1. Receita usa porções/quantidade-alvo e composição escalada.
2. Cardápio agrega receitas e insumos na escala ativa.
3. Evento usa público, PC e margem de produção, nunca preço comercial como quantidade.
4. Lista é snapshot; regeneração é explícita para preservar edição manual.

## 6.2 Explosão

```text
PL = quantidade_por_porcao × porcoes_efetivas
PB = PL × FC_efetivo
```

Ignorar grupos. Para sub-receita, calcular quantidade requerida, fator sobre PDP e expandir ingredientes. Agregar por `ingrediente_id`. Excluir `reaproveitamento_processo`. Referência ou ciclo ausente gera pendência.

> **Exemplo crítico:** 20 porções exigem 400 g de molho. Molho rende 800 g e usa 600 g de tomate com FC 1,2. Fator `0,5`; PL `300 g`; PB `360 g`. Outra receita pede PB `240 g`; a lista agrega `600 g`.

> **Limite vigente:** `explodirReceitaParaCarrinho` expande uma camada de sub-receita. Árvores profundas exigem resolvedor recursivo protegido contra ciclos.

## 6.3 Embalagens e custo

```text
quantidade_embalagens = PB_total / peso_embalagem_g
custo_estimado = quantidade_embalagens × preco_embalagem_rs
```

Dados pessoais prevalecem. Frações são técnicas; arredondamento comercial é explícito. Sem embalagem ou preço, preservar quantidade e marcar pendência.

## 6.4 “Já tenho” e “comprado”

1. `ja_tenho` exclui do total a comprar sem apagar necessidade.
2. `CarrinhoItem.comprado` registra progresso sem alterar a origem.
3. Desmarcar restaura participação.
4. Estados pertencem ao usuário.

## 6.5 Persistência e edição

1. `ListaCompras` contém nome, itens, receitas e `total_geral`.
2. `CarrinhoItem` contém ingrediente, embalagens e estado.
3. Edição atualiza total, não receita ou ingrediente mestre.
4. Mesmo `ingrediente_id` agrega/atualiza, sem duplicar.
5. Exclusão não apaga origens.

## 6.6 Integridade

`total_geral` é cache recalculável. Nome, categoria e unidade são snapshots; ID mantém referência. Novo preço não reescreve lista histórica sem ação explícita. PDF/CSV reflete o snapshot exibido.

## Referências

[Receitas](01-receitas.md) · [Ingredientes](02-ingredientes.md) · [Cardápios](03-cardapios.md) · [Motor](04-motor-custos.md)