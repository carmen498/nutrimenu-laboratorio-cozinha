# 5. Planejamento e Eventos

[← Motor de Custos](04-motor-custos.md) · [Índice](../BUSINESS-RULES.md) · [Compras →](06-compras-carrinho.md)

## Escopo
Público, configuração, produção, orçamento, dossiê, pré-preparos e referências.

## Entidades envolvidas
`Planejamento`, `ReferenciaEvento`, `Receita`, `IngredienteReceita`, `Cardapio`, `CardapioReceita`.

## 5.1 Tipos
- Planejamento: `Almoço`, `Jantar`, `Coquetel`, `Data Comemorativa`, `Confraternização`, `Outro`.
- Serviço: `Bufê`, `Empratado`, `À La Carte`, `Refeição Familiar`, `Self-Service`, `Outro`.
1. Tipos orientam apresentação/referências, sem substituir público, PC e margem.
2. `cardapio_config` contém grupos, itens, receitas, doces/bebidas; JSON inválido gera erro visível.

## 5.2 Público e produção
```text
total_pessoas = homens + mulheres + criancas
total_base_kg = (homens×PC_h + mulheres×PC_m + criancas×PC_c) / 1000
total_com_margem_kg = total_base_kg × (1 + margem_seguranca_pct/100)
kg_prato = pessoas × PC_prato_g × (1 + margem_evento_pct/100) / 1000
```
1. Defaults: 600 g/homem, 400 g/mulher, 300 g/criança, editáveis.
2. Margem geral e margem de prato não são aplicadas duas vezes ao mesmo valor.

## 5.3 Orçamento
```text
valor_total = preco_pessoa_orcamento × total_pessoas
```
1. Recebe preço por pessoa já definido.
2. Exibe identificação, pratos/descritivos, itens ativos, validade e observação comercial.
3. Não exibe custos, PC, margens, kg, FC ou quantidades internas.

> **Exemplo crítico 1:** 80 pessoas × R$ 95 = R$ 7.600. Margem de produção não aumenta convidados comerciais.

## 5.4 Dossiê
1. Documento operacional consolida público, produção, receitas, quantidades, custos e observações.
2. Usa os mesmos motores das telas de origem.
3. Não substitui o orçamento; audiências e campos são distintos.

## 5.5 Pré-preparos
```text
PL = quantidade escalada
FC_efetivo = override ou padrão
PB = PL × FC_efetivo
```
1. Agrupar por ingrediente/pré-preparo preservando instruções distintas.
2. PB é compra; PPP/PDP são rendimento.
3. Expandir sub-receitas uma vez, sem duplicar cache.

## 5.6 Doces e bebidas
1. Referência é `bebida`, `coquetel` ou `doce`; unidade `ml`, `un` ou `g`.
```text
consumidores = total_pessoas × percentual/100
quantidade = consumidores × media_por_pessoa
```
2. `sem_padrao=true` exige entrada antes do cálculo.
3. Receita com mais de dois ingredientes “Açúcares e Doces” exige escolha **Sobremesas** ou **Pães e Bolos**.

## 5.7 Referência de evento
1. Percentual/média são defaults administrativos, não fatos imutáveis.
2. Ajuste do evento fica no planejamento e não altera o catálogo global.

> **Borda sem PC:** a receita pode ficar selecionada, mas quantidade/custo ficam pendentes até PC ou referência válida; nunca usar zero silenciosamente.

## Referências
[Receitas](01-receitas.md) · [Cardápios](03-cardapios.md) · [Compras](06-compras-carrinho.md) · [Rotas](../04-ROUTES-AND-UI.md)