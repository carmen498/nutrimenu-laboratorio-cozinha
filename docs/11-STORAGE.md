# 11 — Arquivos e storage

## Confirmado
- Upload público: `base44.integrations.Core.UploadFile`; privado: UploadPrivateFile + CreateFileSignedUrl (capacidade da plataforma).
- URLs em `Receita.foto_url`, `DicaCarmen.imagem_capa`, `ConfiguracaoCarmen.foto_*`, `TemplateWhatsApp.cabecalho_url`, `Pagamento.nota_fiscal_url` e uploads de importação.
- Assets públicos em `media.base44.com` e URLs geradas.

## Não encontrado
Buckets, região, diretórios físicos, quota, tamanho total, versionamento, criptografia, lifecycle, ACL detalhada e política de backup.

## Classificação
- Público: fotos e assets de marketing/conteúdo.
- Privado: notas fiscais e qualquer documento com PII; exige signed URL.
- Temporário: CSV/XLS/PDF enviados para extração; retenção atual não confirmada.

## Migração
1. Exportar inventário `entidade,campo,id,URI,visibilidade`.
2. Resolver redirects e baixar com autorização apropriada.
3. Calcular SHA-256/tamanho/MIME.
4. Subir preservando extensão e metadados; nomes destino por hash ou UUID.
5. Atualizar URLs via mapa; não tornar privado em público.
6. Revalidar 100% checksum e amostra de abertura/download.
7. Manter origem acessível até pós-cutover.

## Gates
Zero arquivo referenciado ausente; checksums iguais; ACL testada com usuário autorizado/não autorizado; signed URLs expiram; malware scan e limites implementados no destino.