# 11 — Inventário e migração de arquivos

## 1. Objetivo

Definir o contrato operacional para localizar, classificar, transferir e validar todos os arquivos hospedados ou referenciados pelo Laboratório de Cozinha antes da saída do Base44.

O escopo inclui:

- fotos de receitas;
- imagens das Dicas da Carmen;
- fotos institucionais da Carmen;
- cabeçalhos de templates de WhatsApp;
- notas fiscais e documentos privados;
- CSV, XLSX, JSON, PDF e imagens enviados para importação ou extração;
- imagens públicas da landing page e do produto;
- arquivos sem referência no banco que ainda ocupem storage, se o provedor permitir inventariá-los.

Este documento não autoriza o cutover por si só. Ele complementa os guias de migração de dados, segurança, backup, Vercel e Supabase.

## 2. Estado atual confirmado

### 2.1 Operações Base44

| Operação | Mecanismo atual | Visibilidade |
|---|---|---|
| Upload comum | `base44.integrations.Core.UploadFile` | pública por URL |
| Upload privado | `UploadPrivateFile` | URI privada |
| Download privado | `CreateFileSignedUrl` | URL temporária |
| Imagem gerada | `GenerateImage` | pública por URL retornada |
| Arquivo para extração | upload seguido de `ExtractDataFromUploadedFile` | temporária/indefinida |

Assets públicos usam principalmente URLs de `media.base44.com` ou URLs retornadas pelas integrações.

### 2.2 Lacunas que precisam ser medidas

Ainda não estão confirmados:

- total de arquivos e bytes armazenados;
- buckets, região e estrutura física da origem;
- arquivos órfãos sem referência em entidades;
- quotas e tamanho máximo efetivo;
- versionamento e lifecycle atuais;
- política de retenção dos uploads de importação;
- criptografia e política de backup da origem;
- MIME real, extensão e checksum de cada objeto;
- disponibilidade dos objetos durante e após o encerramento do Base44.

Essas lacunas entram no relatório de pré-migração e não podem ser preenchidas por suposição.

## 3. Inventário de referências persistidas

| Entidade/local | Campo | Conteúdo esperado | Classe | Destino sugerido |
|---|---|---|---|---|
| `Receita` | `foto_url` | foto do prato | público | `receitas-publicas` ou `receitas-pessoais` conforme escopo |
| `DicaCarmen` | `imagem_capa` | capa editorial | público | `conteudo-publico` |
| `ConfiguracaoCarmen` | `foto_url` | banner/assinatura | público | `conteudo-publico` |
| `ConfiguracaoCarmen` | `foto_sobre_url` | página Sobre | público | `conteudo-publico` |
| `TemplateWhatsApp` | `cabecalho_url` | imagem de template | público controlado | `templates-comunicacao` |
| `Pagamento` | `nota_fiscal_url` | documento fiscal | privado | `documentos-fiscais` |
| landing/produto | URLs no código/CSS | imagens institucionais | público | manter como asset versionado ou `conteudo-publico` |
| fluxos de importação | URL transitória | CSV/XLSX/JSON/PDF/imagem | temporário | `imports-temporarios` |
| relatórios/exportações | URL transitória, quando persistida | PDF/CSV | privado ou temporário | `exportacoes-privadas` |

### 3.1 Regra de propriedade

A visibilidade técnica do URL atual não define a classificação no destino. A classificação deve seguir o conteúdo e o dono:

1. receita do catálogo: imagem pública;
2. receita pessoal: imagem privada por padrão, salvo decisão explícita do produto;
3. documento fiscal: sempre privado;
4. importação: sempre temporária e privada;
5. comunicação: pública apenas quando o canal externo exigir acesso direto à mídia;
6. asset institucional: público e versionado.

### 3.2 Arquivos não persistidos

Uploads usados apenas durante uma chamada podem não aparecer em entidades. Para encontrá-los:

- procurar chamadas de upload em frontend e backend;
- identificar se a URL é gravada, processada e descartada ou retornada ao usuário;
- consultar o inventário de arquivos do Base44, se disponível;
- comparar objetos encontrados com as URLs persistidas;
- classificar diferenças como órfãos, temporários ativos ou desconhecidos.

Nenhum objeto desconhecido deve ser apagado antes de uma janela de quarentena.

## 4. Manifesto canônico de migração

Exportar um manifesto em CSV e JSONL com uma linha por referência:

```text
source_entity
source_record_id
source_field
source_uri
source_visibility
owner_user_id
business_class
expected_filename
source_created_at
source_updated_at
destination_bucket
destination_path
destination_uri
http_status
mime_detected
size_bytes
sha256
migration_status
attempt_count
last_error
migrated_at
verified_at
```

### 4.1 Status permitidos

```text
discovered
metadata_collected
downloaded
uploaded
reference_updated
verified
quarantined
missing_at_source
blocked_auth
invalid_content
failed
```

O manifesto é a fonte de verdade da transferência. Logs de console não substituem esse registro.

## 5. Arquitetura de destino sugerida no Supabase Storage

| Bucket | Público | Conteúdo | Lifecycle sugerido |
|---|---:|---|---|
| `conteudo-publico` | sim | Carmen, dicas e marketing | permanente/versionado |
| `receitas-publicas` | sim | fotos do catálogo | permanente |
| `receitas-pessoais` | não | fotos dos usuários | enquanto a receita existir + retenção |
| `templates-comunicacao` | conforme canal | cabeçalhos aprovados | enquanto o template estiver ativo |
| `documentos-fiscais` | não | notas fiscais | prazo fiscal/legal definido |
| `imports-temporarios` | não | fontes de importação | remoção automática em 7–30 dias |
| `exportacoes-privadas` | não | PDFs e CSVs gerados | remoção automática em 1–7 dias |
| `quarentena-migracao` | não | objetos suspeitos/sem vínculo | até encerramento da auditoria |

Os nomes são proposta de arquitetura. Devem ser aprovados junto com as políticas RLS e retenção antes da criação em produção.

### 5.1 Convenção de caminhos

```text
<classe>/<owner-ou-catalogo>/<record-id>/<uuid>.<extensão>
```

Exemplos:

```text
catalogo/receitas/<receita-id>/<uuid>.webp
usuarios/<user-id>/receitas/<receita-id>/<uuid>.jpg
pagamentos/<user-id>/<pagamento-id>/<uuid>.pdf
imports/<user-id>/<yyyy-mm>/<uuid>.csv
```

Regras:

- não usar e-mail, telefone, CPF ou nome completo no caminho;
- usar UUID para evitar colisão e enumeração;
- preservar extensão apenas após confirmar MIME;
- guardar nome original somente como metadado sanitizado;
- não sobrescrever objeto existente; criar nova versão e trocar a referência.

## 6. Políticas de acesso

### 6.1 Público

Leitura anônima permitida apenas para:

- assets institucionais;
- fotos do catálogo compartilhado;
- capas editoriais publicadas;
- mídias que precisem ser buscadas por um provedor externo aprovado.

Escrita e exclusão continuam restritas ao backend ou administradores autorizados.

### 6.2 Privado

- usuário lê somente arquivos vinculados aos próprios registros;
- administradores acessam apenas quando a regra operacional exigir;
- service role só existe em Vercel Functions e jobs;
- downloads usam signed URLs curtas;
- documentos fiscais não podem ter URL pública persistente;
- uma referência no banco não concede acesso se a política do bucket negar.

### 6.3 Temporário

- upload autenticado;
- limite de tipo e tamanho;
- processamento assíncrono ou síncrono controlado;
- exclusão automática por lifecycle;
- objeto rejeitado vai para exclusão ou quarentena sem exposição pública.

## 7. Plano de transferência

### Fase A — Descoberta

1. exportar todas as referências de arquivo das entidades;
2. varrer URLs estáticas no código e CSS;
3. listar uploads sem persistência identificados nos fluxos;
4. deduplicar por URI de origem;
5. atribuir classe, dono e bucket de destino;
6. congelar o formato do manifesto.

### Fase B — Coleta de metadados

Para cada URI:

1. validar esquema e host permitidos;
2. executar `HEAD` quando suportado;
3. registrar status HTTP, redirects, MIME declarado e tamanho;
4. para arquivo privado, gerar signed URL sem persistir a URL temporária;
5. marcar origem ausente ou bloqueada para tratamento manual.

### Fase C — Download seguro

1. baixar por streaming, sem carregar o arquivo inteiro em memória;
2. aplicar timeout, limite de bytes e limite de redirects;
3. rejeitar hosts não permitidos para evitar SSRF;
4. calcular SHA-256 durante o stream;
5. detectar MIME pelo conteúdo, não apenas pela extensão;
6. executar verificação antimalware para documentos e uploads de usuário;
7. armazenar temporariamente em ambiente privado.

### Fase D — Upload no destino

1. criar caminho imutável por UUID;
2. enviar MIME e metadados mínimos;
3. manter cache longo apenas para assets públicos imutáveis;
4. registrar bucket, caminho, tamanho e checksum retornados;
5. não apagar o arquivo temporário até validar o upload.

### Fase E — Atualização das referências

1. construir mapa `source_uri → destination_uri/path`;
2. atualizar primeiro staging;
3. manter backup dos valores antigos;
4. atualizar em lotes pequenos e idempotentes;
5. diferenciar URL pública de path privado;
6. para privados, persistir somente bucket/path, nunca signed URL;
7. registrar `reference_updated` no manifesto.

### Fase F — Delta e cutover

1. executar carga inicial sem interromper o app;
2. reexportar registros alterados após a primeira coleta;
3. transferir novos objetos e novas versões;
4. definir janela curta de congelamento de uploads;
5. executar delta final;
6. ativar gravação no destino;
7. validar antes de retirar a origem.

## 8. Idempotência, deduplicação e versões

- a mesma combinação `source_uri + sha256` gera uma única transferência física quando a política permitir;
- referências distintas podem apontar para o mesmo objeto migrado;
- mesma URI com checksum diferente é nova versão e exige investigação;
- reexecução consulta o manifesto e pula itens `verified`;
- tentativa falha incrementa `attempt_count`, sem criar múltiplos objetos válidos;
- exclusão de arquivo substituído só ocorre depois da retenção e da confirmação de que não há outras referências.

## 9. Validação

### 9.1 Validação integral automatizada

Para 100% dos objetos:

- origem encontrada ou exceção formal registrada;
- download concluído;
- tamanho de origem e destino compatíveis;
- SHA-256 idêntico;
- MIME permitido;
- referência atualizada;
- objeto de destino acessível conforme sua classe;
- nenhum privado acessível anonimamente;
- nenhuma referência nova apontando para `media.base44.com` após o cutover.

### 9.2 Validação funcional por amostra

Testar no aplicativo:

- lista e ficha de receita com foto;
- receita pessoal de um usuário distinto;
- Dicas da Carmen e página Sobre;
- template de WhatsApp com cabeçalho;
- download autorizado e negado de nota fiscal;
- upload e processamento de CSV/XLSX/PDF;
- geração e expiração de signed URL;
- substituição e exclusão lógica de imagem.

### 9.3 Relatório de reconciliação

```text
referências descobertas
URIs únicas
arquivos baixados
arquivos deduplicados
bytes transferidos
referências atualizadas
arquivos verificados
origens ausentes
bloqueios de autorização
quarentena
falhas pendentes
objetos privados expostos = 0
referências Base44 após corte = 0
```

## 10. Segurança e privacidade

- nunca registrar conteúdo de arquivos, signed URLs ou tokens;
- mascarar qualquer dado pessoal em nomes e logs;
- impedir upload de executáveis e tipos não aprovados;
- definir limites separados para imagem, planilha e PDF;
- remover metadados EXIF de imagens pessoais quando não forem necessários;
- não tornar públicos arquivos privados para simplificar a migração;
- documentar base legal e retenção de notas fiscais;
- aplicar exclusão do storage quando o registro for excluído, respeitando retenção e auditoria;
- revisar imagens e documentos colocados em quarentena antes de qualquer restauração.

## 11. Backup e rollback

Antes da atualização das referências:

1. exportar banco com URLs/paths originais;
2. preservar manifesto e mapa de migração em local privado;
3. manter objetos Base44 acessíveis durante a janela acordada;
4. manter os objetos novos sem alteração destrutiva;
5. preparar atualização reversa `destination → source`;
6. não apagar a origem durante o cutover.

Rollback:

- interromper novos uploads no destino;
- restaurar referências antigas a partir do mapa;
- reativar gravação na origem somente se ela continuar íntegra;
- reconciliar arquivos criados durante a janela;
- preservar evidências e checksums;
- replanejar o corte antes de nova tentativa.

## 12. Critérios de aceite

- [ ] 100% das referências persistidas constam no manifesto.
- [ ] Todos os fluxos de upload foram classificados.
- [ ] Zero objeto privado está público.
- [ ] Zero signed URL está persistida no banco.
- [ ] Checksums de origem e destino coincidem.
- [ ] Arquivos ausentes possuem decisão documentada.
- [ ] RLS foi testada com proprietário, outro usuário, anônimo e administrador.
- [ ] Lifecycle de temporários está ativo.
- [ ] Testes de tamanho, MIME, malware e SSRF passaram.
- [ ] Delta final foi reconciliado.
- [ ] Backup e rollback foram ensaiados.
- [ ] Não existem referências Base44 ativas após aceite do cutover.

## 13. Pendências para fechar o inventário real

1. exportar contagem e bytes por campo e classe;
2. confirmar se fotos de receitas pessoais devem ser privadas;
3. obter lista de objetos sem referência no banco;
4. definir limites de upload por tipo;
5. definir retenção de imports, exports e quarentena;
6. confirmar prazo legal de notas fiscais;
7. aprovar buckets e políticas Supabase;
8. definir janela de coexistência Base44/Supabase;
9. nomear responsável pela reconciliação e pelo aceite.

## Referências

- [Migração de dados](07-DATA-MIGRATION.md)
- [Autenticação e autorização](08-AUTHENTICATION-AND-AUTHORIZATION.md)
- [Configuração](09-CONFIGURATION.md)
- [Arquitetura destino](17-TARGET-ARCHITECTURE.md)
- [Plano de migração](19-MIGRATION-PLAN.md)
- [Cutover](23-CUTOVER-RUNBOOK.md)
- [Backup e recuperação](25-BACKUP-AND-RECOVERY.md)
- [Segurança](26-SECURITY.md)
- [Inventário de segredos](27-SECRETS-INVENTORY.md)
- [Guia Vercel](37-VERCEL-DEPLOYMENT-GUIDE.md)