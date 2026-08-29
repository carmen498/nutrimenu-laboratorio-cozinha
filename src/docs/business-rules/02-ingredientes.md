# 2. Ingredientes

[← Receitas](01-receitas.md) · [Índice](../BUSINESS-RULES.md) · [Cardápios →](03-cardapios.md)

## Escopo

Identidade mestre, preferências pessoais, preços, compra, FC, medidas, sinônimos, atualização e curadoria.

## Entidades

`Ingrediente`, `IngredienteUsuario`, `IngredienteReceita`, `MedidaCaseira`, `UtensilioPadrao`, `SinonimosIngredientes`, `PrecoIngredienteCliente`.

## 2.1 Mestre versus pessoal

1. `Ingrediente` contém nome, categoria, FC técnico e referências globais.
2. `IngredienteUsuario` contém favorito, fornecedor, UF, unidade, embalagem e preço pessoal.
3. Dados pessoais não sobrescrevem o mestre.

## 2.2 Preço

```text
preco_por_g_rs = preco_embalagem_rs / peso_embalagem_g
custo_item = peso_bruto_g × preco_por_g_rs
```

Prioridade: preço pessoal positivo → preço global positivo → sem preço. Fonte, data, fornecedor, variação e histórico pertencem ao mesmo contexto.

> **Exemplo crítico:** R$ 12 por 1.000 g = `0,012/g`, prevalecendo sobre referência global `0,010/g`. Sem preço pessoal válido, usa-se a referência.

> **Borda:** sem preço pessoal e global, o item entra em `itensSemPreco`; cache fica `incompleto`, não R$ 0 confirmado.

## 2.3 Fator de correção

```text
FC_efetivo = override positivo ou FC mestre positivo ou 1
PB = PL × FC_efetivo
FC = PB / PL
```

FC representa compra/limpeza, não cocção. Alterações invalidam custos. `reaproveitamento_processo` não gera custo incremental nem compra.

## 2.4 Unidade e embalagem

```text
embalagens = PB_necessario / peso_embalagem_g
```

Unidade pessoal prevalece. Conteúdo deve ser positivo. Frações podem ser técnicas; arredondamento comercial precisa ser explícito.

## 2.5 Medidas caseiras

1. Identidade: `ingrediente_id + utensilio_id + estado_alimento`.
2. Cru e pronto são registros distintos.
3. `so_gramas=true` impede conversão caseira.

```text
quantidade_medidas = quantidade_base × quantidade_utensilio / equivalencia_base
```

## 2.6 Sinônimos e fusão

Sinônimo único sem diferenciar caixa aponta a um ingrediente. Importação resolve sinônimo antes de criar novo mestre. Fusão redireciona relações e sinônimos antes de remover o duplicado.

## 2.7 Atualização automática

Fontes: `Manual`, `IA web`, `CONAB`, `CEASA`. Registrar fonte, data, variação e histórico. IA permanece `preco_estimado=true` até confirmação e não substitui preço pessoal confirmado sem regra explícita.

## 2.8 Curadoria

`revisar=true` indica identidade divergente, duplicidade, categoria incerta, preço anômalo/ausente ou medida inconsistente. Limpar apenas após resolver a causa.

## Referências

[Receitas](01-receitas.md) · [Motor de Custos](04-motor-custos.md) · [Compras](06-compras-carrinho.md)