# Glossário do domínio

## Laboratório de Cozinha

Área do produto que organiza receitas, cardápios, eventos, insumos e listas de
compras.

## Laboratório de Custos

Área do produto que calcula o custo e o preço sugerido de uma receita a partir
do custo técnico, insumos da receita, ingredientes esquecidos, entradas
adicionais, rateio do negócio, custo de comercialização e margem. O modelo
vigente não calcula custo-hora por receita.

## Catálogo

Registro de referência mantido pela aplicação e compartilhado em modo de
leitura com usuários autenticados. Receitas e cardápios de catálogo são
identificados por `is_base = true` e não pertencem a um usuário. Insumos
pertencem sempre ao usuário que os cadastrou.

## Registro pessoal

Registro criado para um usuário e isolado dos demais usuários. Seu proprietário
é identificado por `owner_id` ou `user_id`.

## Produto

Módulo comercial ao qual um plano e uma autorização de acesso se aplicam, como
o Laboratório de Cozinha ou o Laboratório de Custos.

## Plano

Condição comercial versionada de um produto, com preço e duração fixa em dias.

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
modelo operacional. Apenas o backend de migração pode preenchê-lo ou alterá-lo;
o cliente autenticado não pode reservar identificadores legados.

## Flags do Laboratório de Custos

Chaves operacionais independentes para módulo, trial, vendas e checkout. Todas
nascem desligadas e só podem ser alteradas pelo backend após homologação.
