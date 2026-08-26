# 25 — Backup e recuperação

## Atual
Base44 pode fornecer resiliência implícita, porém frequência, retenção, criptografia, localização, export e restore **NÃO ENCONTRADOS**. Não considerar backup confirmado sem prova/restauração.

## Requisito destino
- DB: full diário + PITR/WAL; retenção definida por risco/legal.
- Storage: versionamento, replicação e inventário/checksum.
- Config/IaC/secrets metadata/templates/jobs: versionados; valores de segredo em secret manager.
- Logs de auditoria: retenção imutável compatível com LGPD.
- Criptografia em trânsito/repouso e chaves gerenciadas.

## RPO/RTO
**AÇÃO NECESSÁRIA:** negócio definir. Sugestão para avaliação, não requisito confirmado: RPO ≤15 min para transacional e RTO ≤4 h.

## Teste de restore
Trimestral ou antes de cada grande release: restaurar ambiente isolado, validar schema/count/checksum/auth substituta, arquivos, aplicação e tempo; destruir cópias com PII conforme política. Cutover exige restore recente aprovado.

## Migração
Export Base44 + manifest/hash é backup lógico adicional; manter cópia criptografada, acesso mínimo, retenção e prova de leitura.