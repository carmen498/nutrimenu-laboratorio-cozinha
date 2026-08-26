# 24 — Rollback

## Abort migration if
- autenticação/RLS crítica falha ou há acesso cruzado;
- reconciliação de entidade/arquivo crítico diverge;
- erro 5xx sustentado >2% por 5 min ou SLO aprovado for excedido;
- pagamento/webhook duplica, perde ou ativa incorretamente;
- writes não entram no journal/replay;
- backup/restore, logs ou alertas indisponíveis;
- TLS/DNS/callback crítico inválido;
- P0 funcional ou risco de corrupção/PII.

## Decisão
Incident commander designado + engenharia/dados/segurança/produto. Nomes: **AÇÃO NECESSÁRIA**.

## Passos
1. Declarar rollback, congelar writes destino e capturar snapshot/journal.
2. Pausar jobs/consumidores destino.
3. Reverter webhooks/callbacks ao Base44 e validar.
4. Reverter origin/DNS; respeitar caches/TTL; confirmar TLS.
5. Se houve writes destino, transformar e replay no Base44 somente após dry-run e reconciliação; conflitos exigem decisão manual.
6. Restaurar sessões via novo login; não copiar tokens.
7. Reconciliar pagamentos, storage, e-mails/WhatsApp e IDs.
8. Smoke no Base44, reativar jobs únicos e monitorar.
9. Preservar evidências; postmortem; não reutilizar segredos comprometidos.

Restauração de banco/storage destino não substitui reconciliação com writes ocorridos.