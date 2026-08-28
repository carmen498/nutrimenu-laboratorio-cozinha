# 36 — Handoff técnico do Laboratório de Custos para Supabase

## 1. Objetivo
Este documento define o contrato funcional e técnico do **Laboratório de Custos** para migração/integração em uma arquitetura baseada em Supabase.

Ele deve ser lido como fonte de verdade do produto para a equipe responsável pela nova Plataforma ZR. A implementação em Supabase pode mudar detalhes de infraestrutura, nomes físicos de tabelas e organização interna, mas **não deve alterar as regras de produto descritas aqui sem decisão explícita**.

## 2. Posição do produto

### 2.1 Produto-base e add-on
- **Laboratório de Cozinha** é o produto-base.
- **Laboratório de Custos** é um complemento opcional.
- Custos não deve funcionar comercialmente se o acesso ao Laboratório de Cozinha estiver inativo.
- A suspensão do produto-base deve bloquear o acesso ao Custos sem apagar dados.
- A reativação do produto-base deve restaurar o acesso ao Custos se o entitlement do add-on ainda estiver válido.

### 2.2 Independência operacional
O Laboratório de Custos deve permanecer tecnicamente isolado do fluxo principal do Laboratório de Cozinha:
- Cozinha não pode depender do Custos para funcionar.
- Custos consome dados técnicos da Cozinha.
- Custos não deve alterar receitas, ingredientes ou dados técnicos sem ação explícita do usuário.
- Falha, expiração ou indisponibilidade do Custos não pode bloquear receitas, cardápios ou ingredientes do Laboratório de Cozinha.

## 3. Catálogo comercial aprovado

| Produto | Plano | ID lógico recomendado | Validade | Preço |
|---|---|---|---:|---:|
| Laboratório de Custos | Trial | `custos_trial` | 7 dias | R$ 0,00 |
| Laboratório de Custos | 30 dias | `custos_mensal` | 30 dias | R$ 8,90 |
| Laboratório de Custos | Anual | `custos_anual` | 365 dias | R$ 87,00 |

### Regras
- Trial pode ser utilizado **uma única vez por usuário**.
- Trial não deve gerar cobrança automática.
- Plano de 30 dias não possui renovação automática no modelo atual.
- Plano anual não possui renovação automática no modelo atual.
- Checkout conjunto Cozinha + Custos é uma evolução futura.
- Usuário que já possui Cozinha ativa deve poder contratar apenas o Custos.
- O preço comercial deve ser tratado como dado versionado, não hardcoded em múltiplos pontos.

## 4. Estados de acesso

Estados lógicos aprovados:
- `nao_contratado`
- `pendente`
- `trial_ativo`
- `ativo`
- `expirado`
- `suspenso`
- `cancelado`

### Semântica
- **não contratado:** não existe entitlement válido.
- **pendente:** entitlement criado, mas ainda não iniciado/liberado.
- **trial ativo:** modalidade trial, dentro da janela de 7 dias.
- **ativo:** plano pago/cortesia válido.
- **expirado:** fim da validade já passou.
- **suspenso:** bloqueio administrativo temporário.
- **cancelado:** encerramento administrativo/comercial.

A validade deve ser derivada por data no servidor. O front-end não pode ser a autoridade final de acesso.

## 5. Regra de dependência com o Laboratório de Cozinha

Para liberar o Laboratório de Custos, o servidor deve validar, nesta ordem:
1. usuário autenticado;
2. conta não bloqueada;
3. assinatura/base do Laboratório de Cozinha ativa;
4. módulo Laboratório de Custos habilitado para produção;
5. entitlement do Custos existente;
6. status do entitlement compatível;
7. data de início já atingida;
8. data final ainda válida.

Admin pode ter bypass controlado apenas para homologação e suporte.

## 6. Modelo de dados recomendado no Supabase

### 6.1 `products`
Catálogo de produtos.

Campos mínimos:
- `id uuid pk`
- `code text unique` — `laboratorio_cozinha`, `laboratorio_custos`
- `name text`
- `active boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

### 6.2 `plans`
Catálogo comercial versionável.

Campos mínimos:
- `id uuid pk`
- `product_id uuid fk products`
- `code text unique`
- `name text`
- `duration_days integer`
- `price_cents integer`
- `currency text default 'BRL'`
- `is_trial boolean`
- `is_popular boolean`
- `sale_enabled boolean`
- `offer_version text`
- `active boolean`
- `display_order integer`
- `benefits jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

### 6.3 `user_entitlements`
Fonte de verdade de acesso por produto.

Campos mínimos:
- `id uuid pk`
- `user_id uuid fk auth.users`
- `product_id uuid fk products`
- `plan_id uuid null fk plans`
- `status text`
- `mode text` — `trial`, `30_dias`, `anual`, `cortesia`, `admin`, `migracao`
- `source text` — `trial`, `checkout`, `admin`, `cortesia`, `migracao`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `trial_started_at timestamptz null`
- `cancelled_at timestamptz null`
- `payment_id uuid null`
- `offer_version text null`
- `notes text null`
- `created_at timestamptz`
- `updated_at timestamptz`

Índices recomendados:
- `(user_id, product_id)`
- `(product_id, status)`
- `(ends_at)`
- índice parcial para entitlements ativos.

### 6.4 Regra de trial único
Recomenda-se uma restrição lógica/índice que impeça mais de um entitlement `mode='trial'` por `user_id + product_id`.

Não usar apenas um campo booleano no perfil do usuário. O histórico do entitlement deve ser preservado.

## 7. Entidades funcionais do Laboratório de Custos

### 7.1 `cost_user_settings`
Equivalente a `ConfiguracaoCustosUsuario`.

Campos principais:
- `user_id`
- `monthly_estimated_volume`
- `business_cost_groups jsonb`
- `apply_business_cost boolean`
- `business_cost_basis text` — `dia | mes`
- `production_days_month integer`
- `average_recipes_day numeric`
- `commercialization_cost_pct numeric`
- `apply_commercialization_cost boolean`
- `default_margin_pct numeric`
- `active boolean`

Compatibilidade legada que pode ser migrada, mas não deve orientar UX nova:
- markup padrão
- valor/hora
- método de rateio antigo
- flags antigas de imposto/taxa.

### 7.2 `cost_expenses`
Equivalente a `DespesaCustoUsuario`.

Campos:
- `id`
- `user_id`
- `group_code`
- `name`
- `monthly_value_cents`
- `active`
- `display_order`
- `notes`
- timestamps.

Grupos aprovados:
- `gastos_negocio`
- `trabalho_ajudantes`
- `producao`
- `embalagem_outros`

### 7.3 `cost_calculations`
Equivalente a `CalculoCusto`.

Esta tabela é **histórica e append-only** para usuário final.

Campos recomendados:
- `id uuid pk`
- `user_id`
- `recipe_id`
- `parent_calculation_id null`
- `root_calculation_id null`
- `version_number integer`
- `status text`
- `calculated_at timestamptz`
- `quantity_recipes numeric`
- `yield_snapshot jsonb`
- `portion_snapshot jsonb`
- `technical_engine_version integer/text`
- `ingredient_cost_snapshot jsonb`
- `recipe_supply_cost_snapshot jsonb`
- `forgotten_ingredient_cost_snapshot jsonb`
- `additional_input_snapshot jsonb`
- `business_cost_snapshot jsonb`
- `commercialization_snapshot jsonb`
- `technical_cost_total_cents bigint`
- `business_cost_total_cents bigint`
- `production_cost_total_cents bigint`
- `cost_per_recipe_cents bigint`
- `cost_per_portion_cents bigint`
- `sale_price_cents bigint`
- `margin_pct numeric`
- `markup numeric`
- `price_mode text`
- `created_at timestamptz`

### 7.4 `cost_calculation_items`
Equivalente a `CalculoCustoItem`.

Campos:
- `id`
- `calculation_id`
- `user_id`
- `type`
- `description`
- `origin`
- `formula`
- `quantity`
- `unit_value_cents`
- `total_value_cents`
- `display_order`
- `snapshot_details jsonb`

## 8. Regra central: snapshots imutáveis

Uma ficha de custo salva representa o estado do cálculo naquela data.

Portanto:
- alteração futura no preço de ingrediente **não altera ficha antiga**;
- alteração futura na receita **não altera ficha antiga**;
- alteração futura em despesas **não altera ficha antiga**;
- alteração de margem padrão **não altera ficha antiga**;
- alteração de plano comercial **não altera ficha antiga**.

Recálculo deve gerar **novo registro**, nunca sobrescrever o anterior.

## 9. Versionamento e recálculo

Fluxo aprovado:
1. usuário abre uma ficha salva;
2. escolhe recalcular;
3. sistema carrega a receita e dados atuais;
4. gera novo cálculo;
5. salva nova ficha;
6. ficha anterior continua preservada.

Regra atual: somente a versão mais recente de uma linhagem pode originar novo recálculo, evitando branches paralelos acidentais.

No Supabase, recomenda-se:
- `root_calculation_id`
- `parent_calculation_id`
- `version_number`
- unique parcial por `root_calculation_id + version_number`.

## 10. Motor canônico de custos

A implementação atual possui motor central em:
- `src/lib/custoReceita.js`
- `src/lib/custoContexto.js`

A migração não deve criar fórmulas paralelas em telas ou endpoints.

### Princípios
- uma única função canônica para custo técnico;
- preços pessoais do usuário têm precedência sobre preço de catálogo quando existentes;
- ausência de preço gera pendência técnica;
- pendência que compromete integridade bloqueia salvamento da ficha;
- rendimento efetivo deve respeitar a lógica já homologada da receita;
- custos devem ser calculados com precisão monetária segura, preferencialmente centavos inteiros.

## 11. Custo do Negócio

O modelo atual **não usa custo/hora por receita**.

### Base Dia
`despesas_mensais_consideradas / dias_producao_mes / producao_media_dia`

### Base Mês
`despesas_mensais_consideradas / producao_media_mes`

O usuário pode ativar/desativar a aplicação do Custo do Negócio.

Despesas com pessoal podem fazer parte do Custo do Negócio.

## 12. Insumo não cadastrado

No cálculo atual, o usuário pode adicionar um item excepcional sem alterar a receita.

Modos:
- `por_receita`
- `producao_inteira`

### Fórmulas
- por receita: valor informado × quantidade de receitas;
- produção inteira: valor informado uma única vez no lote.

Esse item deve ser salvo no snapshot da ficha, mas não promovido automaticamente para o cadastro da receita.

## 13. Itens importados da receita

Para insumos/embalagens e ingredientes esquecidos existem duas ações diferentes:

### Não considerar neste cálculo
- afeta somente o rascunho atual;
- não altera a receita;
- deve ficar refletido no snapshot/fórmula do cálculo.

### Remover da receita
- altera o dado de origem;
- exige permissão de edição sobre a receita;
- não altera fichas históricas.

No Supabase, a autorização deve ocorrer no servidor/RLS e não apenas pela UI.

## 14. Formação do preço

### Padrão inicial
- margem inicial sugerida: **20%**;
- 20% não é regra obrigatória;
- aproximadamente equivalente a markup 1,25x.

### Relação entre campos
Preço, margem e markup são ligados. O último campo editado comanda o recálculo dos demais.

### Definições
- margem = percentual sobre o preço de venda;
- markup = multiplicador aplicado ao custo.

O usuário pode informar diretamente o preço que deseja cobrar.

## 15. Formação avançada

Pode incluir `custo médio de comercialização (%)`, configurável pelo usuário.

Regras:
- opcional;
- padrão de referência atual: 20%;
- não é regra fiscal;
- não substitui contabilidade;
- não entra no custo técnico da receita;
- deve ser tratado como parâmetro gerencial agregado.

## 16. Rascunho vs Histórico

Rascunho não é ficha histórica.

### Rascunho
- cálculo em andamento;
- pode ser restaurado após navegação;
- não aparece no Histórico;
- não deve consumir versão histórica.

### Ficha salva
Só após comando explícito `Salvar cálculo e gerar ficha`.

Na migração, o rascunho pode continuar no front-end/local storage ou ser persistido em tabela separada. Não misturar rascunhos com `cost_calculations` históricos.

## 17. RLS recomendada

### Catálogo público/técnico
Leitura conforme regras do Laboratório de Cozinha.

### Dados pessoais de Custos
Para `cost_user_settings`, `cost_expenses`, `cost_calculations`, `cost_calculation_items`, `user_entitlements`:
- usuário lê apenas registros cujo `user_id = auth.uid()`;
- usuário cria/edita apenas entidades mutáveis próprias;
- fichas históricas não devem permitir update/delete pelo usuário;
- service role/backend pode criar fichas e itens após validação server-side;
- admin pode consultar conforme necessidade operacional auditada.

### Política recomendada para fichas
- SELECT: owner/admin;
- INSERT: apenas função RPC/Edge Function controlada;
- UPDATE: proibido para usuário;
- DELETE: proibido para usuário.

## 18. Funções server-side recomendadas

### `start_costs_trial()`
Responsabilidades:
- validar autenticação;
- validar produto-base ativo;
- verificar `trial_enabled`;
- verificar que trial nunca foi usado;
- criar entitlement com 7 dias;
- registrar versão da oferta;
- opcionalmente enfileirar e-mail de trial ativado.

### `save_cost_calculation(payload)`
Responsabilidades:
- validar usuário e entitlement;
- validar acesso à receita;
- recalcular/validar componentes críticos no servidor;
- salvar snapshot do cálculo;
- salvar itens;
- garantir atomicidade;
- impedir branch a partir de versão antiga.

### `evaluate_costs_access(user_id)`
Responsabilidades:
- validar assinatura-base;
- localizar entitlement mais recente;
- calcular estado lógico;
- retornar motivo e datas.

### `expire_costs_entitlements()`
Job idempotente para normalizar entitlements vencidos.

## 19. E-mails transacionais aprovados

Tipos preparados:
- `custos_trial_ativado`
- `custos_trial_expirando`
- `custos_trial_vencido`
- `custos_pagamento_aprovado`
- `custos_plano_vencendo`
- `custos_acesso_expirado`

Todos estão em **rascunho** na Base44 e não devem ser ativados automaticamente na migração.

A nova arquitetura deve preservar:
- template editável pelo admin;
- assunto;
- corpo;
- status `rascunho | ativo`;
- variáveis controladas por tipo;
- log de envio com e-mail mascarado;
- deduplicação/idempotência em jobs recorrentes.

## 20. Pagamentos

### Estado atual
Mercado Pago do Laboratório de Cozinha já existe.

### Laboratório de Custos
Ainda **não integrar automaticamente** durante a primeira migração apenas porque os planos existem.

A integração comercial do Custos deve acontecer somente após:
- modelo multi-produto homologado;
- checkout combinado definido;
- regra de compra de add-on isolado definida;
- webhook idempotente homologado;
- matriz de renovação/cancelamento fechada.

O banco deve estar pronto para relacionar `payment -> product -> plan -> entitlement`.

## 21. Administração centralizada

Não criar um painel administrativo separado para Custos.

A Administração deve ser multi-produto e permitir:
- visualizar Cozinha e Custos por usuário;
- ver estado do entitlement;
- ativar trial em homologação;
- conceder 30 dias/anual manualmente;
- suspender;
- cancelar;
- visualizar início e vencimento;
- ver origem do acesso;
- editar planos/ofertas;
- editar templates transacionais.

## 22. Fluxo visual da oferta

Tela de oferta aprovada conceitualmente:
- Trial 7 dias — grátis;
- 30 dias — R$ 8,90;
- Anual — R$ 87,00;
- indicação explícita de que Custos é complemento do Laboratório de Cozinha;
- histórico preservado após expiração;
- nenhum dado excluído ao bloquear o módulo.

Fluxo do trial:
`ativar -> usar -> aviso de término -> encerramento -> escolher plano`.

## 23. Não escopo

O Laboratório de Custos não é:
- ERP;
- contabilidade;
- fluxo de caixa;
- sistema bancário;
- folha de pagamento;
- estoque;
- fiscal;
- cálculo trabalhista;
- cálculo tributário individualizado.

Não reintroduzir:
- custo-hora por receita;
- campo obrigatório de horas trabalhadas;
- markup 3x como padrão;
- regras fiscais presumidas.

## 24. Mapeamento Base44 -> Supabase

| Base44 | Supabase sugerido |
|---|---|
| `ConfiguracaoPlano` | `plans` |
| `ConfiguracaoAddonCustos` | `products` + feature flags/config |
| `AcessoLaboratorioCustosUsuario` | `user_entitlements` |
| `ConfiguracaoCustosUsuario` | `cost_user_settings` |
| `DespesaCustoUsuario` | `cost_expenses` |
| `CalculoCusto` | `cost_calculations` |
| `CalculoCustoItem` | `cost_calculation_items` |
| `TemplateEmail` | `email_templates` |
| `LogEmail` | `email_logs` |
| Base44 User | `auth.users` + `profiles` |
| Functions | Supabase Edge Functions / RPC |
| Base44 RLS | PostgreSQL RLS |
| Automations | pg_cron / scheduler externo / Edge Functions |

## 25. Estratégia de migração de dados

### Fase 1 — Estrutura
Criar tabelas, constraints, índices e RLS sem importar dados.

### Fase 2 — Catálogos/configurações
Migrar produtos, planos e templates em rascunho.

### Fase 3 — Usuários e entitlements
Mapear Base44 user id -> Supabase auth user id antes de importar dados pessoais.

### Fase 4 — Configurações e despesas
Importar por usuário e reconciliar contagens.

### Fase 5 — Histórico
Importar cálculos e itens preservando IDs legados em coluna `legacy_id` ou tabela de correspondência.

### Fase 6 — Validação
Comparar amostras de custos entre Base44 e Supabase.

### Fase 7 — Cutover
Somente depois de equivalência funcional e autorização explícita.

## 26. Reconciliação obrigatória

Para cada entidade migrada registrar:
- total origem;
- total destino;
- rejeitados;
- duplicados;
- órfãos;
- checksums/amostras;
- horário do lote;
- versão do transformador.

Nenhum lote deve ser considerado concluído apenas por “importou sem erro”.

## 27. Testes de aceite mínimos

### Acesso
- usuário sem Cozinha ativa não entra no Custos;
- admin entra em homologação;
- trial só pode ser usado uma vez;
- trial expira corretamente;
- plano de 30 dias expira corretamente;
- anual expira corretamente;
- suspenso não entra;
- cancelado não entra;
- histórico permanece após expiração.

### Custos
- preço pessoal do ingrediente prevalece;
- item sem preço gera pendência;
- Custo do Negócio Dia reproduz fórmula atual;
- Custo do Negócio Mês reproduz fórmula atual;
- insumo por receita escala corretamente;
- insumo de produção inteira não escala;
- margem 20% gera preço esperado;
- preço informado recalcula margem/markup;
- ficha salva permanece imutável;
- recálculo gera nova ficha;
- versão anterior permanece consultável.

### Segurança
- usuário A não lê dados de usuário B;
- usuário não altera ficha histórica via API direta;
- usuário não cria entitlement para si;
- usuário não ativa plano por mutation direta;
- service role não é exposta no cliente.

## 28. Critério de pronto para anexar à Plataforma ZR

O Laboratório de Custos só deve ser considerado pronto para integração comercial quando:
- schema Supabase versionado;
- RLS testada;
- trial único homologado;
- estados de acesso homologados;
- motor de custos equivalente;
- histórico e snapshots equivalentes;
- painel admin multi-produto funcional;
- e-mails em rascunho migrados;
- checkout deliberadamente habilitado ou mantido desligado por feature flag;
- observabilidade disponível;
- rollback documentado;
- testes E2E aprovados.

## 29. Feature flags obrigatórias no destino

Recomenda-se manter no mínimo:
- `costs_module_enabled`
- `costs_trial_enabled`
- `costs_sales_enabled`
- `costs_checkout_enabled`

Estado recomendado durante migração:
```text
costs_module_enabled = false para clientes / true apenas homologação
costs_trial_enabled = false
costs_sales_enabled = false
costs_checkout_enabled = false
```

A existência de código, planos ou tela de oferta **não significa publicação comercial**.

## 30. Fontes atuais de implementação

Arquivos importantes da Base44 a consultar durante a migração:
- `src/lib/custoReceita.js`
- `src/lib/custoContexto.js`
- `src/lib/laboratorioCustosAccess.js`
- `src/pages/CustosCalcular.jsx`
- `src/pages/CustosDespesas.jsx`
- `src/pages/CustosConfiguracoes.jsx`
- `src/pages/CustosFicha.jsx`
- `src/pages/CustosHistorico.jsx`
- `src/pages/CustosBloqueado.jsx`
- `base44/functions/salvarCalculoCusto/entry.ts`
- `base44/functions/inicializarTrialLaboratorioCustos/entry.ts`
- `base44/functions/preflightLaboratorioCustos/entry.ts`
- `base44/shared/acessoLaboratorioCustos.ts`
- `base44/entities/AcessoLaboratorioCustosUsuario.jsonc`
- `base44/entities/ConfiguracaoCustosUsuario.jsonc`
- `base44/entities/DespesaCustoUsuario.jsonc`
- `base44/entities/CalculoCusto.jsonc`
- `base44/entities/CalculoCustoItem.jsonc`

## 31. Decisões que exigem validação antes do checkout final

Ainda precisam ser deliberadamente fechadas na arquitetura Supabase:
- carrinho combinado base + add-ons;
- compra de Custos por cliente já ativo da Cozinha;
- renovação manual/automática do add-on;
- comportamento do add-on quando a Cozinha expira antes dele;
- política de reembolso específica do add-on;
- ordem e idempotência dos webhooks;
- emissão fiscal por produto/item;
- comunicação de renovação.

Essas decisões não bloqueiam a migração técnica do módulo e dos dados.

## 32. Regra final de preservação

O princípio central do Laboratório de Custos é:

> **dados técnicos atuais alimentam novos cálculos; fichas antigas preservam exatamente o que foi calculado naquela data.**

Qualquer implementação em Supabase que recalcule silenciosamente o histórico ou sobrescreva snapshots históricos deve ser considerada incompatível com o produto homologado.
