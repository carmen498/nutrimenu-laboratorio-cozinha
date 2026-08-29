# 2. Ingredientes

[← Receitas](01-receitas.md) · [Índice](../BUSINESS-RULES.md) · [Cardápios →](03-cardapios.md)

## Escopo
Identidade mestre, preferências pessoais, preços, compra, FC, medidas, sinônimos, atualização e curadoria.

## Entidades envolvidas
`Ingrediente`, `IngredienteUsuario`, `IngredienteReceita`, `MedidaCaseira`, `UtensilioPadrao`, `SinonimosIngredientes`, `PrecoIngredienteCliente`, `LogAtualizacaoPrecos`.

## 2.1 Mestre versus pessoal
1. `Ingrediente` é catálogo global: nome, categoria, FC técnico e referências de mercado.
2. `IngredienteUsuario` guarda favorito, fornecedor, UF, unidade/embalagem e preço por usuário e `ingrediente_id`.
3. Dados pessoais não sobrescrevem o mestre; `created_by_id` limita segurança e `user_id` é cache funcional.

## 2.2 Resolução de preço
1. `IngredienteUsuario.preco_por_g_rs > 0` prevalece.
2. Sem preço pessoal válido, usar `Ingrediente.preco_por_g_rs > 0`.
3. Sem ambos, o preço é indisponível, não gratuito.
```text
preco_por_g_rs = preco_embalagem_rs / peso_embalagem_g
custo_item = peso_bruto_g × preco_por_g_rs
```
4. Fonte, data, fornecedor, variação e histórico pertencem ao mesmo contexto.

> **Exemplo crítico 1:** cliente paga R$ 12 por 1.000 g: `0,012/g`, prevalecendo sobre referência global `0,010/g`. Sem pessoal válido, usa-se `0,010/g`.

> **Cenário de borda:** sem preço pessoal/global, 500 g entram em `itensSemPreco`; cache fica `incompleto` e a interface solicita preço.

## 2.3 Fator de correção
1. FC efetivo: `fator_correcao_override > 0` → override; senão FC mestre positivo; senão `1`.
```text
PB = PL × FC_efetivo
FC = PB / PL
```
2. FC representa compra/limpeza, não cocção.
3. Alteração de FC invalida custos dependentes.
4. `reaproveitamento_processo` não gera custo incremental nem compra.

## 2.4 Unidade e embalagem
1. Unidade pessoal prevalece para apresentação/conversão.
2. `peso_embalagem_g` é conteúdo em g/ml e deve ser positivo.
```text
embalagens = PB_necessario / peso_embalagem_g
```
3. Frações podem ser técnicas; arredondamento comercial deve ser explícito.

## 2.5 Medidas caseiras
1. Identidade: `ingrediente_id + utensilio_id + estado_alimento`, refletida em `chave_canonica`.
2. Cru e pronto são registros distintos.
```text
quantidade_medidas = quantidade_base × quantidade_utensilio / equivalencia_base
```
3. `so_gramas=true` impede conversão caseira.
4. Campos legados/textuais não são identidade.
5. `medida_caseira_id` é escolha específica; sem ela, usa-se padrão válido.

## 2.6 Sinônimos e fusão
1. Sinônimo é único sem diferenciar caixa e aponta a um `ingrediente_id`.
2. Importação resolve sinônimo antes de criar novo mestre.
3. Fusão escolhe sobrevivente, redireciona relações/sinônimos e só então remove duplicado.
4. `fundirIngredientes` centraliza a operação; IDs são identidade e nomes são caches.

## 2.7 Atualização automática
1. Fontes: `Manual`, `IA web`, `CONAB`, `CEASA`.
2. Registrar fonte, data, variação e histórico no contexto correto.
3. IA usa `preco_estimado=true` até confirmação.
4. Automação não substitui preço pessoal confirmado sem regra explícita.
5. Preço alterado invalida dependentes.

## 2.8 Revisão e curadoria
1. `revisar=true` indica pendência global.
2. Motivos: identidade divergente, duplicidade, categoria incerta, preço anômalo/ausente ou medida inconsistente.
3. Só limpar a flag quando a causa for resolvida, preservando rastreabilidade.

## Referências
[Receitas](01-receitas.md) · [Motor de Custos](04-motor-custos.md) · [Compras](06-compras-carrinho.md) · [Banco/RLS](../06-DATABASE.md)