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
- movimentação entre dias por arrastar e soltar ou pelos botões alternativos.

A rota legada de validação `/cardapios-beta` redireciona para o módulo funcional.
