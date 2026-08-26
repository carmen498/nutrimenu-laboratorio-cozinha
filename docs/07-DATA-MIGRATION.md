# 07 — Plano de migração de dados

## Escopo
Entidades, User, configurações, templates, logs necessários, IDs/timestamps, URLs de arquivo e storage. Sessões/tokens/senhas: exportabilidade **NÃO ENCONTRADA**.

## Estratégia
1. **Export:** freeze lógico por entidade; export paginado estável por `id`; JSONL UTF-8; manifest com contagem, min/max timestamps e SHA-256. Separar PII, catálogo, transacional, logs e config.
2. **Transform:** validar contra JSONC; normalizar datas sem mudar timezone; manter números como decimal; preservar arrays/objetos; gerar `id_map` apenas se IDs não puderem ser mantidos.
3. **Import:** staging idempotente; upsert por `(entity,id)`; pais antes de filhos; arquivos antes da troca de URLs.
4. **Validar:** contagem, checksum canônico, IDs, órfãos, enums, valores financeiros, amostra funcional.
5. **Reconciliar:** relatório assinado por entidade; nenhuma diferença silenciosa.

## Ordem
User/config/catálogos → Receita/Ingrediente/Medidas/Tags → filhos/sub-receitas → Cardápio/Planejamento → custos → Pagamento/templates → logs selecionados → arquivos.

## Controle por entidade
| Campo | Antes | Depois | Gate |
|---|---:|---:|---|
| total | consulta paginada | COUNT(*) | igual |
| IDs | conjunto/hash | conjunto/hash | 100% ou mapa aprovado |
| timestamps | min/max/hash | min/max/hash | sem mutação |
| relações | órfãos | órfãos | zero novos |
| checksum | JSON canônico SHA-256 | idem | igual |
| amostra | 20+ registros/estratos | comparação | 100% |

## Volumes
**NÃO ENCONTRADO:** contagens e bytes de produção não foram copiados para evitar dados operacionais. **AÇÃO NECESSÁRIA:** executar relatório somente de metadados antes do sizing.

## Prevenções
- Export incremental por `updated_date` + desempate `id`; freeze final.
- Idempotency key/batch; nunca gerar novo ID sem `id_map`.
- Não alterar `created_date`/`updated_date` durante import.
- Importar filhos após pais; relatório de referências órfãs.
- Duplicação: constraints temporárias e checksum.
- Dinheiro: decimal, não float; comparar centavos.
- Logs/PII: aplicar política de retenção e minimização, não exportar payload sensível desnecessário.

## Arquivos
Manifest `source_uri,target_uri,size,sha256,visibility`; baixar com autorização, verificar, subir, reescrever URL em transação de migração.

## Rollback de dados
Base44 permanece referência; durante shadow, novo ambiente read-only ou dual-write controlado. Após cutover, registrar journal de writes para replay reverso; detalhes em `24-ROLLBACK.md`.