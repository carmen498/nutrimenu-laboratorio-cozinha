# Glossário do domínio

## Laboratório de Cozinha

Área do produto que organiza receitas, cardápios, eventos, insumos e listas de
compras.

## Laboratório de Custos

Área do produto que calcula o custo e o preço sugerido de uma receita a partir
de ingredientes, insumos, mão de obra, despesas, perdas, impostos e margem.

## Catálogo

Registro de referência mantido pela aplicação e compartilhado em modo de
leitura com usuários autenticados. Receitas, cardápios e insumos de catálogo
são identificados por `is_base = true` e não pertencem a um usuário.

## Registro pessoal

Registro criado para um usuário e isolado dos demais usuários. Seu proprietário
é identificado por `owner_id` ou `user_id`.

## Produto

Módulo comercial ao qual um plano e uma autorização de acesso se aplicam, como
o Laboratório de Cozinha ou o Laboratório de Custos.

## Plano

Condição comercial de um produto, com preço, periodicidade, período de teste e
limites próprios.

## Autorização de acesso

Registro que concede ou suspende o acesso de um usuário a um produto por um
intervalo de tempo. É a fonte de verdade comercial; não é derivada do perfil.

## Ficha de custo

Resultado histórico e imutável de um cálculo de custo de receita, incluindo os
valores agregados, premissas e itens usados no cálculo.

## Recálculo

Criação de uma nova ficha de custo. Uma ficha existente nunca é sobrescrita.

## Identificador legado

Identificador do registro no Base44, preservado em `legacy_id` para
reconciliação durante a futura importação, sem ser usado como chave primária do
modelo operacional.
