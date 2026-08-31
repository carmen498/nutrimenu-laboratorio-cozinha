# Cardápios — base técnica do planejador

## Decisão arquitetural

A entidade legada `Cardapio` sustenta o módulo exibido ao usuário como **Refeições**. Ela não deve ser renomeada, migrada nem reutilizada no novo planejador.

O novo módulo **Cardápios** usa entidades independentes:

- `CardapioPeriodo`: raiz do planejamento por período;
- `CardapioPeriodoItem`: item distribuído em uma data do período.

Essa separação impede regressões em Refeições e permite ampliar o planejador semanal para outros períodos no futuro.

## CardapioPeriodo

Campos centrais:

- nome;
- tipo_periodo: inicialmente `semanal`;
- data_inicio;
- data_fim;
- identificacao_refeicao: `refeicao`, `almoco` ou `jantar`;
- observacoes;
- status: `rascunho`, `ativo` ou `arquivado`.

A camada `src/lib/cardapioPeriodo.js` calcula automaticamente sete datas consecutivas e aplica o nome padrão quando necessário.

## CardapioPeriodoItem

Cada item pertence a uma data exata e aceita uma das origens:

- `refeicao`: registro da entidade legada `Cardapio`;
- `receita`: registro de `Receita`;
- `ingrediente`: registro de `Ingrediente`.

O item armazena ID de origem, nome de referência, ordem e classificação contextual opcional.

A classificação não modifica a Receita, o Ingrediente ou a Refeição de origem.

## Segurança e integridade

- leitura, alteração e exclusão são limitadas ao criador, com acesso administrativo;
- a criação canônica confirma que o cardápio-pai e a origem estão acessíveis;
- itens fora das datas do período são recusados;
- dia da semana e nome de referência são derivados pelo sistema;
- ao reorganizar, o sistema valida a propriedade dos itens e regrava data, dia da semana e ordem dos dias afetados;
- a exclusão canônica remove primeiro os itens filhos;
- nenhuma entidade ou registro existente é migrado nesta etapa.

## Interface funcional

O módulo está disponível no menu pela rota protegida `/cardapios`.

- criação e listagem de semanas;
- visão de segunda-feira a domingo;
- inclusão de Refeições, Receitas e Ingredientes;
- classificação contextual opcional;
- remoção de itens;
- ordenação dentro de um dia;
- movimentação entre dias por arrastar e soltar ou pelos botões alternativos;
- edição do nome e das observações gerais;
- duplicação integral para outra semana, preservando itens, ordem e classificações;
- exclusão confirmada do Cardápio e de seus itens, sem alterar os cadastros de origem;
- pré-visualização semanal em sete colunas;
- impressão em A4 horizontal ou salvamento em PDF pelo navegador, com observações, tipos e classificações.

A rota legada de validação `/cardapios-beta` redireciona para o módulo funcional.

## Status do MVP

O Cardápio Mínimo Viável foi encerrado em 31/08/2026 com os fluxos de criação, composição, classificação, reorganização, gestão, duplicação, exclusão e impressão disponíveis.

O fechamento técnico inclui:

- validação de segunda-feira no fuso local brasileiro;
- limite de leitura ampliado para evitar truncamento de itens semanais;
- responsividade dos controles de gestão e movimentação;
- lint e build aprovados;
- ausência de novos erros de tipo nos arquivos do módulo;
- smoke test das rotas `/cardapios` e `/cardapios/:id/imprimir` no servidor Vite;
- confirmação dos schemas e das regras de acesso de `CardapioPeriodo` e `CardapioPeriodoItem`.

## Etapa 10 — ordenação automática e filtros

Ao adicionar um item, a posição inicial no dia é definida pela classificação contextual:

1. Entradas;
2. Saladas;
3. Refeição completa;
4. Pratos principais;
5. Segundo prato;
6. Acompanhamentos;
7. Bebidas;
8. Sobremesas;
9. Sem classificação.

As classificações legadas `guarnicao` e `outro` continuam aceitas para compatibilidade. `guarnicao` usa a mesma prioridade de Acompanhamentos e `outro` fica ao final.

Itens da mesma classificação preservam a ordem de inclusão. A ordenação é aplicada somente na entrada do novo item: a reorganização manual continua disponível e não é desfeita automaticamente.

O seletor combina busca por nome com filtros próprios de cada origem:

- Refeições: tipo da Refeição;
- Receitas: uma das categorias cadastradas, incluindo `Saladas`;
- Ingredientes: categoria técnica.

As classificações `guarnicao` e `outro` permanecem aceitas apenas para compatibilidade com registros legados e não aparecem na criação de novos itens.

## Etapa 11 — taxonomia relacionada e saneamento de Receitas

As classificações apresentadas no Cardápio foram padronizadas no plural quando aplicável e relacionadas às categorias de Receita:

- Entradas: Entradas, Sopas e Caldos, Arroz e Risotos;
- Saladas: Saladas;
- Pratos principais e Segundo prato: Carnes Bovinas e Suínos, Aves, Peixes e Frutos do Mar, Massas/Pastelão/Quiches, Arroz/Risotos e Sopas/Caldos;
- Acompanhamentos: Acompanhamentos e Leguminosas;
- Sobremesas: Sobremesas;
- Bebidas, ao selecionar Ingredientes: Frutas, permitindo refinar a busca por `suco`.

A busca por nome continua combinada com o conjunto relacionado. A pessoa pode selecionar uma categoria específica dentro do grupo sugerido.

Saneamento executado no catálogo:

- 105 receitas reais com `salada` no nome receberam a categoria Saladas;
- dois molhos para salada foram preservados em Molhos;
- a categoria Pratos Principais foi removida após realocação dos cinco registros remanescentes;
- 22 receitas passaram de Lanche para Lanches;
- um registro com categorias fragmentadas `Massas` e `Pastelão e Quiches` foi consolidado em `Massas, Pastelão e Quiches`;
- categorias técnicas úteis, como Peixes e Frutos do Mar e Leguminosas, foram preservadas junto de Saladas quando aplicável.
