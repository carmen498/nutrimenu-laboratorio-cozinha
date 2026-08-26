# 30 — Troubleshooting

### Página fica carregando
**Causas:** auth/public settings, chunk, consulta lenta/falha. **Diagnóstico:** network/console/RouteFallback/log API. **Correção:** restaurar dependência, retry seguro; não mascarar auth. **Confirmar:** rota e dados finalizam sem erro.

### Login “email ou senha inválidos” após cadastro
**Causa provável confirmada:** conta requer OTP. **Diagnóstico:** etapa OTP/User. **Correção:** concluir/verificar/re-enviar OTP. **Confirmar:** token e `/app`.

### Reset de senha trava
**Causas:** token/domínio/auth provider. **Diagnóstico:** token em sessionStorage, request e callback. **Correção:** callback/SDK. **Confirmar:** reset e novo login.

### Google “app not found”
**Causa:** configuração OAuth/plataforma. **Diagnóstico:** client/redirect/domínio. **Correção:** registrar callback/conta. **Confirmar:** múltiplos dispositivos.

### Pagamento recusado/high_risk
**Causas:** credencial/ambiente/device fingerprint/risco MP. **Diagnóstico:** `Pagamento.detalhe_erro` sanitizado e provedor. **Correção:** alinhar public key/token, security.js e dados. **Confirmar:** sandbox/prod controlado.

### Webhook assinatura inválida/502
**Causas:** secret/manifest/URL/deploy. **Diagnóstico:** LogWebhook e versão. **Correção:** secret correto, assinatura e publish. **Confirmar:** fixture/replay 2xx.

### Status pagamento/assinatura diverge
**Causas:** webhook ausente/cache/fluxo síncrono. **Diagnóstico:** MP vs Pagamento/User/logs. **Correção:** reprocessador idempotente. **Confirmar:** reconciliação.

### Custos/rendimento/porções inconsistentes
**Causas:** dados legados, PDP/per capita/caches. **Diagnóstico:** auditorias e snapshots. **Correção:** curadoria/normalização aprovada. **Confirmar:** golden test.

### E-mail não enviado/wrapper incorreto
**Causas:** template rascunho, Resend/config/wrapper. **Diagnóstico:** TemplateEmail/LogEmail. **Correção:** ativar/configurar e reprocessar com dedupe. **Confirmar:** entrega e log.

### Lentidão/lista incompleta
**Causas:** limites/queries N+1/volume. **Diagnóstico:** contagem paginada/latência. **Correção:** paginação backend/índices/agregação. **Confirmar:** total e performance.

Fontes: issues conhecidas do projeto, funções de diagnóstico e telas relacionadas.