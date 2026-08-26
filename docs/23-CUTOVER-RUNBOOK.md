# 23 — Runbook de cutover

Tempos são relativos; duração depende dos volumes ainda não encontrados.

1. **T-7d:** reduzir TTL; confirmar owners, bridge, backups, credenciais, capacidade e rollback.
2. **T-60m:** GO preliminar; bloquear deploys; pausar jobs destino.
3. **T-30m:** ativar banner/janela e freeze de writes no Base44 ou registrar delta.
4. **T-25m:** snapshot/backup Base44 e destino; registrar hashes/timestamps.
5. **T-20m:** export incremental final por `updated_date,id`; copiar arquivos delta.
6. **T-15m:** importar idempotente; reconciliar contagens/IDs/checksums/órfãos/pagamentos.
7. **T-10m:** smoke interno: auth, receita, custo, upload, checkout sandbox/controlado, webhook fixture.
8. **T-5m:** atualizar webhooks/callbacks; manter antigo disponível; validar HMAC.
9. **T0:** mudar tráfego/DNS/origin; confirmar TLS e SPA/API.
10. **T+5m:** smoke externo e monitorar 4xx/5xx/latência/jobs/filas.
11. **T+15m:** liberar writes gradualmente; registrar/reconciliar primeiros writes.
12. **T+30/60m:** GO de continuidade ou rollback.
13. **T+24/72h:** reconciliações e decisão de fim da observação.

## Point of no return
Evitar PNR técnico: manter Base44, backups e journal. PNR operacional ocorre quando writes não puderem ser reproduzidos de volta. Antes disso, rollback direto; depois, exige freeze, transformação reversa e aprovação de integridade.

Não desativar Base44 no cutover.