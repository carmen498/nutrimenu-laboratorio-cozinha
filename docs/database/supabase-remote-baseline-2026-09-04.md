# Baseline remoto do Supabase

## Escopo e ponto de controle

Este documento registra somente metadados estruturais e agregados do projeto
Nutrimenu Laboratório. Nenhum dado pessoal foi copiado para o repositório.

- Projeto: Laboratorio (aibqicflleqxkotoyvtx)
- Organização: Nutrimenu (jgssbhoqjzjusgfipxzo)
- Região: us-east-1
- PostgreSQL: 17.6.1.166
- Estado observado: ACTIVE_HEALTHY
- Plano observado: Free
- GitHub main observado: a93c330c1869a75dc8eba7c3a71dcaf8c8d8d87f
- Modelo operacional introduzido por: 822ad1d27eb5ebefeca4ae6987d48ee5c7224c64
- Data da inspeção: 2026-09-04
- Histórico remoto de migrations: vazio

A inspeção foi somente leitura. Nenhuma DDL, migration ou alteração de dados foi
aplicada ao projeto principal.

## Bloqueio de ambiente isolado

A conta reconectada passou a enxergar a organização proprietária e o projeto.
A criação da branch certify-822ad1d2, porém, foi recusada com
PaymentRequiredException: Supabase Branching exige plano Pro ou superior.

O custo informado antes da tentativa foi US$ 0,01344 por hora. A tentativa não
criou uma branch e não iniciou cobrança. A única branch listada continua sendo
main.

Enquanto não existir um ambiente isolado, migrations de reconciliação não devem
ser aplicadas ao projeto principal.

## Inventário agregado

| Objeto | Linhas observadas |
| --- | ---: |
| auth.users | 10 |
| auth.identities | 10 |
| public.profiles | 10 |
| labcozinha.records | 25.263 |
| labcozinha.id_map | 10 |
| labcozinha.migration_batch | 62 |
| labcozinha.user_profiles_shadow | 10 |
| labcozinha.storage_manifest | 8 |
| labcozinha.reconciliation_report | 5 |

## Contrato legado de public.profiles

A tabela existente usa id como chave primária e referencia auth.users(id) com
ON DELETE CASCADE. O modelo canônico versionado usa user_id como chave primária
e ON DELETE RESTRICT, portanto a migration operacional não pode ser aplicada
diretamente.

| # | Coluna | Tipo | Nulo | Default |
| ---: | --- | --- | --- | --- |
| 1 | id | uuid | não | — |
| 2 | source_user_id | text | não | — |
| 3 | full_name | text | sim | — |
| 4 | email | text | não | — |
| 5 | role | text | não | — |
| 6 | telefone_whatsapp | text | sim | — |
| 7 | empresa | text | sim | — |
| 8 | plano_atual | text | sim | — |
| 9 | status_assinatura | text | sim | — |
| 10 | data_inicio | date | sim | — |
| 11 | data_expiracao | date | sim | — |
| 12 | trial_modelo | text | sim | — |
| 13 | trial_dias_uso | jsonb | não | [] |
| 14 | data_proxima_cobranca | date | sim | — |
| 15 | ciclo_renovacao | integer | não | 0 |
| 16 | pagamento_ativo_id | text | sim | — |
| 17 | cpf_cnpj | text | sim | — |
| 18 | razao_social | text | sim | — |
| 19 | cep | text | sim | — |
| 20 | cidade_uf | text | sim | — |
| 21 | endereco | text | sim | — |
| 22 | segmento | text | sim | — |
| 23 | origem | text | sim | — |
| 24 | termos_aceitos_em | timestamptz | sim | — |
| 25 | termos_versao_aceita | text | sim | — |
| 26 | privacidade_versao_aceita | text | sim | — |
| 27 | force_password_reset | boolean | não | true |
| 28 | source_created_at | timestamptz | sim | — |
| 29 | source_updated_at | timestamptz | sim | — |
| 30 | migrated_at | timestamptz | não | now() |

Constraints observadas:

- profiles_pkey: PRIMARY KEY (id)
- profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- profiles_source_user_id_key: UNIQUE (source_user_id)
- profiles_role_check: role limitado a admin ou user

RLS está habilitado, mas não forçado. A única policy permite SELECT ao próprio
id ou a app_metadata.role = admin. Não existem policies de escrita.

## Provas agregadas para a transformação

| Verificação | Resultado |
| --- | ---: |
| Perfis legados | 10 |
| Usuários Auth | 10 |
| IDs de perfil correspondentes ao Auth | 10 |
| IDs sem usuário Auth | 0 |
| source_user_id distintos | 10 |
| full_name vazio | 0 |
| segmento fora do domínio canônico | 0 |
| origem fora do domínio canônico | 0 |
| Papéis nos perfis | 9 user, 1 admin |
| Papéis em Auth app_metadata | 9 user, 1 admin |

Esses agregados demonstram que os campos básicos do perfil podem ser
transformados sem inventar identidades. Eles não autorizam migrar assinaturas,
pagamentos ou entitlements: esses dados comerciais precisam de uma etapa
própria e de regras de negócio aprovadas.

## Mapeamento proposto para perfis

| Legado | Canônico | Regra |
| --- | --- | --- |
| id | user_id | cópia exata após validar vínculo com auth.users |
| source_user_id | legacy_id | cópia exata |
| full_name | display_name | trim; abortar se vazio |
| telefone_whatsapp | phone | cópia |
| empresa | business_name | cópia |
| cpf_cnpj | tax_id | cópia |
| razao_social | legal_name | cópia |
| cep | postal_code | cópia |
| cidade_uf | city_state | cópia |
| endereco | address | cópia |
| segmento | professional_segment | cópia apenas após validar domínio |
| origem | acquisition_source | cópia apenas após validar domínio |
| termos_aceitos_em | terms_accepted_at | cópia |
| termos_versao_aceita | terms_version | cópia |
| privacidade_versao_aceita | privacy_version | cópia |
| source_created_at | created_at | fallback para migrated_at |
| source_updated_at | updated_at | fallback para migrated_at |
| auth.users.last_sign_in_at | last_login_at | cópia por user_id |

Campos comerciais como plano_atual, status_assinatura, datas de cobrança,
trial, pagamento_ativo_id e ciclo_renovacao devem permanecer no snapshot legado
até existir uma transformação aprovada para products, plans,
user_entitlements e payments.

## Objetos do schema labcozinha

| Tabela | Chave | Colunas principais | RLS |
| --- | --- | --- | --- |
| records | entity_name, id | created_date, updated_date, created_by_id, payload, source_checksum | desligado |
| id_map | entity_name, source_id | target_id, migrated_at | desligado |
| migration_batch | id | entity_name, contagens, checksums, status, notes | desligado |
| user_profiles_shadow | source_user_id | email, full_name, role, payload, target_auth_user_id, status | desligado |
| storage_manifest | source_entity, source_record_id, source_field | origem, destino, hash, tamanho, status | desligado |
| reconciliation_report | id | checked_at, metric, value, status, details | desligado |

Os roles anon e authenticated não têm USAGE no schema labcozinha nem SELECT em
labcozinha.records. Isso reduz a superfície atual, mas RLS deve ser habilitado e
forçado como defesa em profundidade antes de qualquer ampliação de grants ou da
Data API.

## Função privilegiada existente

public.rls_auto_enable() é uma função SECURITY DEFINER de event trigger,
proprietária de postgres, com search_path fixado em pg_catalog. Ela habilita RLS
automaticamente em novas tabelas de public.

ACL observada: PUBLIC, anon, authenticated e service_role podem executar a
função. Como funções recebem EXECUTE de PUBLIC por padrão, a reconciliação deve
revogar a execução de PUBLIC, anon e authenticated. A função não deve ser usada
como atalho para contornar permissões.

## Sequência segura para implementação

1. Disponibilizar ambiente isolado: upgrade temporário para Pro ou projeto
   descartável explicitamente autorizado.
2. Gerar migrations com o Supabase CLI; não inventar timestamps manualmente.
3. Adicionar uma migration anterior ao modelo operacional que:
   - reconheça estritamente o contrato legado de public.profiles;
   - aborte diante de contrato desconhecido;
   - preserve a tabela inteira em schema privado, sem DROP;
   - revogue acesso de PUBLIC, anon e authenticated;
   - habilite e force RLS no snapshot;
   - revogue execução pública de public.rls_auto_enable().
4. Aplicar a migration operacional existente em ambiente isolado.
5. Adicionar migration posterior que copie somente os campos aprovados para o
   perfil canônico e valide igualdade de contagens.
6. Preservar os campos comerciais no snapshot até a fase de entitlements.
7. Executar db lint, pgTAP, advisors de segurança e performance.
8. Validar novamente contagens, constraints, grants, RLS e ausência de PII em
   logs e artefatos.
9. Fazer revisão humana do plano de rollback.
10. Agendar uma janela separada antes de qualquer ação no projeto principal.

## Critérios de parada

A execução deve abortar, sem tentar corrigir automaticamente, se ocorrer
qualquer uma destas condições:

- public.profiles não corresponder ao contrato registrado;
- qualquer perfil não tiver auth.users correspondente;
- source_user_id estiver duplicado;
- display_name resultante estiver vazio;
- segmento ou origem estiver fora do domínio canônico;
- o snapshot de destino já existir;
- a contagem canônica não corresponder à contagem legada;
- advisors indicarem risco novo de segurança;
- o histórico remoto de migrations deixar de estar vazio antes da janela.

## Proibições mantidas

- não executar db push, apply_migration ou DDL no projeto principal;
- não alterar, excluir ou exportar os 25.263 registros;
- não editar manualmente o ledger de migrations;
- não habilitar Data API, flags de custos ou integrações;
- não usar outro projeto Supabase sem autorização explícita.
