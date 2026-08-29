# 38 — Guia técnico de exportação de receitas e custos

> Contrato para extrair dados do Base44 em formato portátil, auditável e compatível com PostgreSQL/Supabase e outras bases externas. O objetivo é preservar composição, propriedade, linhagem, preços, cálculos e histórico sem transformar caches em fonte de verdade.

## 1. Escopo

Este guia cobre:

- receitas, rendimento, categorias e linhagem;
- ingredientes mestre e preços/preferências por usuário;
- composição atômica, grupos e sub-receitas;
- insumos/embalagens e ingredientes esquecidos;
- tags e medidas caseiras necessárias à interpretação da receita;
- caches técnicos de custo;
- configurações, despesas, cálculos e itens históricos do Laboratório de Custos;
- IDs, proprietários, timestamps, arquivos e evidências de reconciliação.

Não cobre senhas, tokens, sessões ou segredos. Usuários precisam de exportação/mapeamento próprio antes dos dados pessoais.

## 2. Princípios obrigatórios

1. **Exportação sem transformação destrutiva:** o pacote bruto preserva os registros exatamente como lidos.
2. **Formato primário JSONL UTF-8:** um objeto JSON por linha, adequado a paginação, streaming, checksums e campos aninhados.
3. **CSV é derivado:** usar somente para tabelas planas ou conferência humana; arrays e objetos não devem ser achatados com perda.
4. **IDs legados são preservados:** criar novos UUIDs apenas se necessário, mantendo `legacy_id` ou `id_map` permanente.
5. **Datas em ISO 8601:** manter o instante original e importar em `timestamptz`.
6. **Dinheiro sem ponto flutuante no destino:** o bruto mantém o número de origem; a camada tipada converte valores monetários para centavos inteiros ou `numeric`.
7. **Fonte e cache separados:** composição e preços são autoritativos; `Receita.custo_*` é cache de compatibilidade.
8. **Histórico de custos é imutável:** fichas salvas e snapshots não são recalculados durante a migração.
9. **Propriedade antes da importação:** nenhum dado pessoal entra no destino sem usuário mapeado e RLS habilitada.
10. **Nenhum lote é aprovado apenas porque importou:** contagens, checksums, relações e amostras financeiras devem coincidir.

## 3. Formato do pacote

Estrutura recomendada:

```text
labcozinha-export-AAAA-MM-DDTHH-mm-ssZ/
  manifest.json
  schemas/
    Receita.schema.json
    Ingrediente.schema.json
    ...
  raw/
    User.jsonl
    Ingrediente.jsonl
    IngredienteUsuario.jsonl
    Receita.jsonl
    IngredienteReceita.jsonl
    InsumoReceita.jsonl
    IngredienteEsquecidoReceita.jsonl
    CalculoCusto.jsonl
    CalculoCustoItem.jsonl
    ...
  normalized/
    users.jsonl
    ingredients.jsonl
    user_ingredient_prices.jsonl
    recipes.jsonl
    recipe_components.jsonl
    recipe_supplies.jsonl
    cost_calculations.jsonl
    cost_calculation_items.jsonl
    ...
  rejects/
    <entidade>.jsonl
  reports/
    counts.json
    relationships.json
    financial-reconciliation.json
    files.csv
  checksums.sha256
```

### 3.1 Registro bruto

Cada linha deve conter metadados nativos no topo e todos os demais campos em `payload`:

```json
{"entity_name":"Receita","id":"legacy-id","created_date":"2026-01-10T13:00:00.000Z","updated_date":"2026-08-20T18:10:00.000Z","created_by_id":"legacy-user-id","payload":{"nome":"Bolo","categorias":["Pães e Bolos"],"porcoes_base":12,"is_base":false,"usuario_dono_id":"legacy-user-id"}}
```

Essa forma é diretamente compatível com a tabela de staging `labcozinha.records` definida em `migration/schema.sql`.

### 3.2 Manifesto

Campos mínimos de `manifest.json`:

```json
{
  "format_version": "1.0",
  "export_id": "uuid-do-lote",
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601",
  "source": "base44",
  "mode": "full",
  "cursor_rule": "updated_date,id",
  "transformer_version": "git-sha-ou-tag",
  "entities": [
    {
      "name": "Receita",
      "file": "raw/Receita.jsonl",
      "rows": 0,
      "bytes": 0,
      "sha256": "hex",
      "min_created_date": null,
      "max_updated_date": null
    }
  ]
}
```

O manifesto não contém segredos nem dados pessoais em claro além dos metadados indispensáveis.

## 4. Conjunto de dados e destino sugerido

### 4.1 Núcleo de receitas

| Origem Base44 | Papel | Destino sugerido |
|---|---|---|
| `Receita` | receita, rendimento, caches, propriedade e linhagem | `recipes` |
| `Ingrediente` | catálogo mestre e preço global de referência | `ingredients` |
| `IngredienteUsuario` | preço, embalagem, fornecedor e favorito por usuário | `user_ingredient_settings` |
| `PrecoIngredienteCliente` | preço pessoal legado | staging/legado; consolidar com rastreabilidade |
| `IngredienteReceita` | composição, grupos, ingredientes e sub-receitas | `recipe_components` |
| `InsumoReceita` | materiais e embalagens da receita | `recipe_supplies` |
| `IngredienteEsquecidoReceita` | itens auxiliares/esquecidos | `recipe_forgotten_ingredients` |
| `MedidaCaseira` | equivalências de medidas | `household_measures` |
| `Tag` | catálogo de tags | `tags` |
| `ReceitaTag` | relação receita/tag | `recipe_tags` |
| `HistoricoAlteracaoReceita` | trilha funcional selecionada | `recipe_change_history` |

### 4.2 Laboratório de Custos

| Origem Base44 | Papel | Destino sugerido |
|---|---|---|
| `ConfiguracaoCustosUsuario` | parâmetros pessoais de rateio | `cost_user_settings` |
| `DespesaCustoUsuario` | despesas mensais | `cost_expenses` |
| `CalculoCusto` | ficha histórica/snapshot | `cost_calculations` |
| `CalculoCustoItem` | linhas da ficha | `cost_calculation_items` |
| `AcessoLaboratorioCustosUsuario` | entitlement do complemento | `user_entitlements` |
| `ConfiguracaoPlano` | catálogo comercial | `products`/`plans` |

## 5. Campos que não podem ser descartados

### Receita

Preservar, no mínimo:

- `id`, `created_date`, `updated_date`, `created_by_id`;
- `nome`, `categorias`, `porcoes_base`, `unidade_base`, `modo_preparo`;
- `peso_pre_preparo_total`, `peso_pos_preparo_total`, `rendimento_total`;
- `rendimento_origem`, `rendimento_status`, `rendimento_medido_em`;
- `per_capita_g`, `foto_url`, `nota`;
- `is_base`, `usuario_dono_id`;
- `receita_origem_id`, `receita_raiz_id`, `linhagem_geracao`, `linhagem_tipo`, `linhagem_versao`, `linhagem_status`;
- todos os campos `custo_*`, identificados no destino como caches, status, versão e assinatura.

### Composição

Preservar discriminador `tipo` e referências conforme o tipo:

- ingrediente: `ingrediente_id`, quantidade, unidade, FC override e medida;
- grupo: `titulo_grupo` e ordem;
- sub-receita: `subreceita_id`, modo, estado de sincronização e dependências;
- caches derivados: `subreceita_parent_id`, flags, versão, origem e linhagem;
- escala: `proporcional` e `custo_comportamento`;
- escopo: `is_base`, `usuario_dono_id`.

Não converter nomes-cache em identidade. Relações usam IDs.

### Custos históricos

Preservar integralmente:

- identificação do usuário e receita/cardápio de origem;
- todos os campos de snapshot técnico e comercial;
- custos componentes, total, unitário e por porção;
- preço informado/sugerido, margem, markup, taxas e método;
- status, data, versão e relação de recálculo;
- itens, fórmulas e `snapshot_detalhes`.

`CalculoCusto` e `CalculoCustoItem` são append-only no destino para o usuário final.

## 6. Extração paginada

A extração deve executar em contexto administrativo controlado, nunca no navegador de um cliente. Para cada entidade:

1. fixar `export_started_at`;
2. listar páginas em ordem estável;
3. gravar cada registro imediatamente em JSONL;
4. nunca carregar a entidade inteira em memória;
5. encerrar a exportação full na barreira definida;
6. calcular contagem, bytes e SHA-256 durante o streaming;
7. registrar falha sem publicar manifesto como concluído.

Pseudocódigo conceitual:

```text
for entity in ordered_entities:
  cursor = null
  while true:
    page = read_page(entity, order=(updated_date,id), after=cursor, limit=500)
    if page.empty: break
    for record in page:
      write_jsonl(raw_file, envelope(record))
      update_hash_and_metrics(record)
    cursor = (page.last.updated_date, page.last.id)
  close_file_and_manifest_entry()
```

Se a API de origem não aceitar cursor composto, usar paginação suportada pela plataforma e repetir a exportação sob freeze lógico. `skip/offset` em dados mutáveis pode pular ou duplicar linhas; isso deve ser detectado pelo conjunto de IDs e checksum.

### 6.1 Export incremental

Após o full inicial:

```text
updated_date > last_watermark
OR (updated_date = last_watermark AND id > last_id)
```

Manter sobreposição curta e fazer upsert idempotente por `(entity_name,id)`. Exclusões precisam de tombstone/journal; a ausência de um registro em uma página incremental não prova exclusão.

## 7. Ordem de exportação e importação

Exportar pode ocorrer em qualquer ordem se todos os arquivos forem independentes, mas importar deve respeitar relações:

1. usuários e `id_map`;
2. catálogos: ingredientes, insumos, medidas, tags e planos;
3. preferências/preços pessoais;
4. receitas raiz e receitas do catálogo;
5. receitas derivadas/pessoais e linhagem;
6. composição (`IngredienteReceita`), insumos, esquecidos e tags;
7. configurações e despesas de custos;
8. cálculos históricos;
9. itens dos cálculos;
10. históricos/logs selecionados e arquivos.

Sub-receitas podem formar dependências profundas. Importar primeiro todas as receitas e somente depois criar FKs/componentes evita falsos órfãos.

## 8. Normalização para PostgreSQL/Supabase

### 8.1 Estratégia em duas camadas

1. **Staging de preservação:** importar o envelope bruto em `labcozinha.records`.
2. **Modelo tipado:** transformar com SQL/ETL versionado para tabelas finais.

Nunca importar diretamente no modelo final sem conservar o bruto e o relatório do transformador.

### 8.2 Tipos

| JSON/Base44 | PostgreSQL sugerido |
|---|---|
| string ID legado | `text legacy_id` ou UUID com `id_map` |
| date-time | `timestamptz` |
| date | `date` |
| number de quantidade/percentual | `numeric` |
| R$ histórico bruto | `numeric`; gerar coluna em centavos validada |
| boolean | `boolean` |
| array de strings | `text[]` ou tabela relacional |
| objetos/snapshots | `jsonb` |
| URL de arquivo | `text` + manifesto de storage |

### 8.3 Dinheiro

Conversão recomendada:

```text
valor_centavos = round(valor_reais × 100)
```

Antes de aprovar, calcular a diferença entre o decimal de origem e `valor_centavos / 100`. Valores técnicos como preço por grama podem exigir mais de duas casas e devem permanecer `numeric(p,s)`, não centavos prematuramente.

### 8.4 JSON serializado como string

Campos como `snapshot_detalhes` podem conter JSON em string. Processo:

1. preservar a string original no bruto;
2. tentar parsear no transformador;
3. se válido, gravar em `jsonb` e manter versão do transformador;
4. se inválido, enviar para `rejects` ou manter coluna legada, sem corrigir silenciosamente.

## 9. Propriedade, usuários e RLS

Antes dos dados pessoais, criar:

```text
Base44 User.id -> Supabase auth.users.id
```

Manter `legacy_user_id` ou tabela `id_map`. Regras:

- `usuario_dono_id`, `user_id` e `created_by_id` devem ser reconciliados;
- divergências vão para relatório, não são resolvidas por suposição;
- catálogo (`is_base=true`) e cópia pessoal (`is_base=false`) permanecem distintos;
- filhos espelham o escopo do pai;
- importação usa credencial privilegiada controlada;
- acesso dos usuários só é liberado depois de ativar e testar RLS.

Testes mínimos: usuário A não lê/escreve dados de B; usuário comum não altera catálogo; histórico de custo não aceita update/delete do usuário.

## 10. Arquivos e fotos

Para cada `foto_url`/arquivo:

```csv
source_entity,source_id,source_field,source_uri,target_bucket,target_path,visibility,size,sha256,status
```

Fluxo:

1. coletar URLs/URIs sem expor objetos privados;
2. baixar com autorização;
3. verificar bytes e SHA-256;
4. subir ao Supabase Storage;
5. aplicar bucket/política pública ou privada;
6. gerar mapa `source_uri -> target_path`;
7. reescrever referências somente na camada transformada;
8. testar URL pública ou assinatura privada.

Não exportar base64 em JSONL.

## 11. Validação estrutural

Por entidade:

- contagem origem = bruto exportado;
- IDs únicos e conjunto de IDs equivalente;
- SHA-256 do arquivo registrado;
- datas mínima/máxima compatíveis;
- campos obrigatórios presentes ou rejeição registrada;
- enums desconhecidos listados;
- nenhum novo órfão;
- relações pai/filho e usuário preservadas;
- nenhuma linha perdida sem entrada em `rejects`.

Consultas de órfãos obrigatórias:

- componente → receita;
- componente ingrediente → ingrediente;
- componente sub-receita → receita;
- insumo/esquecido/tag → receita;
- preço pessoal → usuário e ingrediente;
- cálculo → usuário e origem;
- item de cálculo → cálculo.

## 12. Reconciliação financeira e funcional

Separar duas validações:

### 12.1 Integridade histórica

Os campos salvos em `CalculoCusto` e `CalculoCustoItem` devem permanecer byte/decimal-equivalentes após normalização. Não recalcular fichas antigas.

### 12.2 Equivalência do motor atual

Selecionar amostra estratificada com:

- catálogo e receitas pessoais;
- preços globais e pessoais;
- FC padrão e override;
- sub-receitas simples e aninhadas;
- insumos `por_lote`, `proporcional` e `por_unidade`;
- esquecidos válidos e legados;
- receitas completas e com pendências.

Comparar:

- rendimento efetivo;
- porções efetivas;
- custo de ingredientes, insumos e esquecidos;
- custo total e por porção;
- quantidade de itens sem preço e referências ausentes;
- status, versão e assinatura de cache.

Tolerância monetária deve ser definida antes da execução; recomendação: igualdade em centavos para totais comerciais e precisão decimal explícita para custo por grama.

## 13. Rejeições e correções

Cada linha rejeitada deve conter:

```json
{"entity_name":"...","id":"...","reason_code":"INVALID_ENUM","field":"...","source_value":"...","transformer_version":"...","detected_at":"..."}
```

Não alterar a exportação bruta. Correções ocorrem por regra ETL versionada ou na origem seguida de nova exportação. Todo lote registra:

- importados;
- rejeitados;
- duplicados;
- órfãos;
- transformações aplicadas;
- autor e versão do transformador.

## 14. Segurança e LGPD

- criptografar pacote em repouso e trânsito;
- limitar acesso por função e registrar downloads;
- separar PII, catálogo e logs quando possível;
- não exportar tokens, segredos, sessão, corpo bruto de webhook ou payload sensível desnecessário;
- mascarar PII em relatórios e logs;
- aplicar retenção antes da extração de logs;
- manter duas cópias verificadas somente pelo período necessário;
- destruir cópias temporárias com evidência ao final.

## 15. Execução por fases

### Fase A — ensaio sem dados pessoais

Exportar schemas, ingredientes, medidas, tags e receitas de catálogo. Validar formato, staging e relações.

### Fase B — staging completo

Exportar dados pessoais em ambiente restrito, importar somente em staging e produzir relatórios. Aplicação destino continua fechada.

### Fase C — transformação tipada

Popular tabelas Supabase, ativar constraints gradualmente, reconciliar IDs, dinheiro, snapshots e arquivos.

### Fase D — incremental/shadow

Repetir deltas, validar telas e cálculos sem efeitos externos. Nenhum job ou comunicação real deve rodar nos dois ambientes.

### Fase E — export final

Aplicar freeze/journal, exportar delta final, reconciliar, trocar a fonte de leitura/escrita e arquivar manifesto assinado.

## 16. Critérios de aceite

- [ ] pacote possui manifesto, schemas, JSONL bruto, relatórios e SHA-256;
- [ ] 100% dos registros aparecem como importados ou rejeitados;
- [ ] IDs preservados ou mapeados sem ambiguidade;
- [ ] zero novos órfãos;
- [ ] usuários/proprietários reconciliados;
- [ ] receitas e sub-receitas mantêm composição, ordem e linhagem;
- [ ] preços pessoais não vazam entre usuários;
- [ ] caches de receita estão identificados como caches;
- [ ] fichas históricas são imutáveis e equivalentes;
- [ ] amostra do motor de custos foi aprovada;
- [ ] arquivos têm checksum, destino e visibilidade corretos;
- [ ] RLS foi testada antes de abrir acesso;
- [ ] export incremental e rollback foram ensaiados.

## 17. Entregáveis para a equipe Vercel/Supabase

1. pacote criptografado conforme esta especificação;
2. `manifest.json` e `checksums.sha256`;
3. schemas JSON de origem;
4. DDL de staging e migrations tipadas;
5. transformador ETL versionado;
6. `id_map` de usuários e registros remapeados;
7. relatório de órfãos/rejeições;
8. relatório de reconciliação financeira;
9. manifesto de arquivos;
10. evidências dos testes de RLS e equivalência;
11. runbook do delta final, cutover e rollback.

## Referências

- [Plano de migração de dados](07-DATA-MIGRATION.md)
- [Banco e RLS](06-DATABASE.md)
- [Inventário e migração de arquivos](11-STORAGE.md)
- [Inventário de exportação](33-BASE44-EXPORT-INVENTORY.md)
- [Handoff do Laboratório de Custos](36-LABORATORIO-CUSTOS-SUPABASE-HANDOFF.md)
- [Guia de implantação Vercel](37-VERCEL-DEPLOYMENT-GUIDE.md)
- [Regras de receitas](business-rules/01-receitas.md)
- [Regras de ingredientes](business-rules/02-ingredientes.md)
- [Motor de custos](business-rules/04-motor-custos.md)
- [Staging PostgreSQL](../migration/schema.sql)