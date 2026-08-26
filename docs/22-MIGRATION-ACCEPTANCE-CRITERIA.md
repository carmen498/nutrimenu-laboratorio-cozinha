# 22 — Critérios objetivos de aceite

Migração concluída somente com evidência:
- 100% funcionalidades críticas e rotas sem defeito P0/P1; P2 aceitos formalmente.
- Contagem/IDs/checksum por entidade reconciliados; zero novos órfãos; valores financeiros sem divergência além da tolerância aprovada.
- Perfis, roles, status, aceites e isolamento aprovados; estratégia de senha/OAuth executada.
- 100% arquivos do manifest com checksum e ACL corretos.
- MP/Resend/Wascript/IA certificados nos ambientes aplicáveis.
- Webhooks com assinatura, replay, idempotência e latência aprovados.
- Jobs executados sem duplicidade por dois ciclos ou simulação temporal equivalente.
- Domínio/DNS/TLS e callbacks corretos.
- Logs, métricas, alertas, health e auditoria operacionais.
- Backup restaurado em ambiente limpo dentro de RPO/RTO aprovados.
- Rollback ensaiado; journal de writes reconciliável.
- Busca automatizada e tráfego provam ausência de dependência produtiva Base44.
- Janela de observação e aprovação GO assinadas por produto, engenharia, segurança e operação.

Qualquer item sem evidência é NO-GO.