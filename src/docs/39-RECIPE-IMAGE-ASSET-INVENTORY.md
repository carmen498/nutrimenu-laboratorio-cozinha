# 39 — Inventário de fotos das receitas no Base44

> Snapshot operacional levantado em 2026-08-29 para preparar a transferência das imagens vinculadas às receitas. Este inventário deve ser regenerado no delta final antes do cutover.

## 1. Escopo e método

A consulta administrativa percorreu os registros de `Receita` e selecionou aqueles cujo campo `foto_url` estava preenchido.

Resultado do snapshot:

| Métrica | Valor |
|---|---:|
| Receitas consultadas | 2.234 |
| Receitas com `foto_url` | 3 |
| Receitas sem `foto_url` | 2.231 |
| Arquivos acessíveis | 3 |
| Arquivos com erro | 0 |
| Volume total | 7.800.309 bytes (aprox. 7,44 MiB) |
| Formato detectado | PNG |
| Visibilidade atual | pública |
| Escopo das receitas | catálogo (`is_base=true`) |

O levantamento cobre referências persistidas em `Receita.foto_url`. Ele não prova a inexistência de arquivos órfãos no Storage do Base44 nem inclui imagens de dicas, páginas institucionais, templates ou outros módulos; esses grupos são tratados em [11-STORAGE.md](11-STORAGE.md).

## 2. Inventário nominal

### 2.1 Bolo de Cenoura com Cobertura de Chocolate

| Campo | Valor |
|---|---|
| Receita | `BOLO DE CENOURA COM COBERTURA DE CHOCOLATE` |
| ID da receita | `6a6a99ba28d28b082beea4a2` |
| Catálogo | sim |
| Proprietário pessoal | nenhum |
| Atualização do registro | `2026-08-26T16:11:07.918000` |
| URL persistida | `https://base44.app/api/apps/6a2b263c4c1cb1e47d54d8b7/files/mp/public/6a2b263c4c1cb1e47d54d8b7/361244e10_14BOLODECENOURA.png` |
| URL final atual | `https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/361244e10_14BOLODECENOURA.png` |
| HTTP | `200` |
| MIME | `image/png` |
| Tamanho | `2.500.449` bytes |
| SHA-256 | `79a1e08279c05b86d8ada68213486f278996e242e71f7b2453dac57c5d06ae0f` |
| Destino sugerido | `receitas-publicas/catalogo/6a6a99ba28d28b082beea4a2/<uuid>.png` |

### 2.2 Peru Festivo

| Campo | Valor |
|---|---|
| Receita | `PERU FESTIVO` |
| ID da receita | `6a2c6b8efb720d536c968220` |
| Catálogo | sim |
| Proprietário pessoal | nenhum |
| Atualização do registro | `2026-08-23T19:34:53.412000` |
| URL persistida | `https://base44.app/api/apps/6a2b263c4c1cb1e47d54d8b7/files/mp/public/6a2b263c4c1cb1e47d54d8b7/2bb936044_16PerudeNatal.png` |
| URL final atual | `https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/2bb936044_16PerudeNatal.png` |
| HTTP | `200` |
| MIME | `image/png` |
| Tamanho | `3.025.419` bytes |
| SHA-256 | `0a88afd1e9cbceb269b6adc2f1f4f1c77064f106c3fb79265abfa6cf3186770d` |
| Destino sugerido | `receitas-publicas/catalogo/6a2c6b8efb720d536c968220/<uuid>.png` |

### 2.3 Musse de Salmão

| Campo | Valor |
|---|---|
| Receita | `MUSSE DE SALMÃO` |
| ID da receita | `6a6a76d6e1841a7f89853a03` |
| Catálogo | sim |
| Proprietário pessoal | nenhum |
| Atualização do registro | `2026-08-23T19:34:53.412000` |
| URL persistida | `https://base44.app/api/apps/6a2b263c4c1cb1e47d54d8b7/files/mp/public/6a2b263c4c1cb1e47d54d8b7/a495eccfe_15mussedesaLmo.png` |
| URL final atual | `https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/a495eccfe_15mussedesaLmo.png` |
| HTTP | `200` |
| MIME | `image/png` |
| Tamanho | `2.274.441` bytes |
| SHA-256 | `a2c7d566ac3b8fab1c2d0313a4286991a350187678ea8994d55a0173c448a2cb` |
| Destino sugerido | `receitas-publicas/catalogo/6a6a76d6e1841a7f89853a03/<uuid>.png` |

## 3. Arquivo de manifesto para execução

Na migração, converter este snapshot em CSV ou JSONL com uma linha por imagem:

```csv
source_entity,source_record_id,source_field,source_uri,source_final_uri,visibility,mime,size_bytes,sha256,target_bucket,target_path,migration_status,verified_at
```

Status permitidos:

```text
discovered
downloaded
uploaded
reference_updated
verified
missing_at_source
checksum_mismatch
failed
```

## 4. Etapas de transferência

1. regenerar a consulta de `Receita.foto_url` e comparar com este snapshot;
2. adicionar imagens novas e marcar referências removidas, sem apagar arquivos;
3. baixar cada arquivo pela URL persistida, seguindo o redirect autorizado;
4. limitar hosts de origem a `base44.app` e `media.base44.com`;
5. validar HTTP 200, MIME permitido e limite de tamanho;
6. calcular SHA-256 durante o download;
7. enviar para o bucket público de fotos do catálogo;
8. usar caminho imutável por UUID e preservar `.png` somente após confirmar o MIME;
9. calcular o checksum do objeto no destino;
10. exigir igualdade de bytes e SHA-256;
11. criar mapa `receita_id + source_uri → target_uri`;
12. atualizar `Receita.foto_url` em lotes pequenos e idempotentes;
13. abrir cada ficha de receita e confirmar a renderização;
14. executar delta final após congelar novos uploads;
15. manter as URLs Base44 durante a janela de rollback.

## 5. Regras de integridade

- não alterar resolução, compressão ou formato durante a cópia de preservação;
- otimizações WebP/AVIF devem gerar derivados, mantendo o original migrado;
- não usar o nome da receita como identidade física do arquivo;
- não sobrescrever objetos existentes;
- não considerar somente HTTP 200 como validação: checksum é obrigatório;
- persistir a URL canônica do destino apenas depois de validar o upload;
- manter o valor original de `foto_url` no manifesto e no backup do banco;
- uma nova URL com o mesmo conteúdo pode ser deduplicada por SHA-256, desde que todas as referências sejam preservadas.

## 6. Validação funcional

Após atualizar as referências, testar:

- listagem de receitas com miniatura;
- ficha de cada uma das três receitas;
- carregamento em desktop e celular;
- acesso anônimo às fotos do catálogo;
- ausência de mixed content e redirects inesperados;
- cache HTTP para arquivos públicos imutáveis;
- nenhuma solicitação nova a `base44.app` ou `media.base44.com`.

## 7. Critérios de aceite

- [ ] snapshot final contém todas as receitas com `foto_url`;
- [ ] 3 arquivos atuais e todos os adicionados no delta foram processados;
- [ ] contagem de referências antes e depois é equivalente;
- [ ] tamanho e SHA-256 coincidem para 100% dos arquivos;
- [ ] todas as URLs novas respondem corretamente;
- [ ] as três fichas atuais exibem as fotos migradas;
- [ ] não existem referências de receita apontando para Base44;
- [ ] backup das URLs antigas e mapa reverso estão preservados;
- [ ] rollback foi ensaiado antes da remoção da origem.

## 8. Pendência externa ao banco

É necessário obter, pela ferramenta de administração/exportação do Storage Base44, a lista completa de objetos armazenados para comparar com estas três referências. A diferença revelará arquivos órfãos, versões antigas ou imagens enviadas e nunca vinculadas a uma receita. Esses objetos devem ir para quarentena até decisão explícita, nunca ser descartados automaticamente.

## Referências

- [Inventário e migração geral de Storage](11-STORAGE.md)
- [Guia de exportação de receitas e custos](38-RECIPE-COST-DATA-EXPORT-GUIDE.md)
- [Plano de migração de dados](07-DATA-MIGRATION.md)
- [Backup e recuperação](25-BACKUP-AND-RECOVERY.md)
- [Guia Vercel](37-VERCEL-DEPLOYMENT-GUIDE.md)