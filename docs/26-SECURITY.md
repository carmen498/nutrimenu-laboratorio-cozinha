# 26 — Segurança

## Trust boundaries
Browser↔Base44; function↔DB/service role; function↔Mercado Pago/Resend/Wascript/IA; webhook público↔function; storage público/privado.

## Controles que existem hoje
- Auth Base44 e guards de rota/backend.
- RLS/field policies em entities; ownership/dono/admin.
- HMAC webhook e refetch no Mercado Pago.
- Secrets fora do código; CSP mínima (`base-uri`, `object-src`, `form-action`), TLS pelo hosting.
- Sanitização inicial de tokens URL; referrer policy; signed URL privado.
- Validação de uploads e payloads em fluxos; logs sanitizados/minimização/retention jobs.
- Idempotência de pagamentos/webhooks e compensação em custos.

## Lacunas/não encontrados
CORS global, CSP completa, cookie flags/token refresh, rate limits, WAF, SAST/DAST central, KMS, backup/DR, pentest, SBOM/licenças, alertas, gestão formal de vulnerabilidades.

## Controles a recriar
OIDC/session security, API authorization/RLS, secret manager/rotation, TLS/CORS/CSP/CSRF, rate limit/bot protection, upload scanning/size/MIME, DB least privilege, storage ACL/signed URL, encryption/KMS, audit logs imutáveis, SIEM/alertas, dependency scanning, backup restore e incident response.

## PII
User contém email, telefone, CPF/CNPJ, endereço e notas; pagamentos/logs podem ser sensíveis. Minimizar, mascarar, controlar acesso, definir base legal/retention e atender titular. Nunca enviar PII a logs/prompts sem necessidade.

Gates: threat model, testes RLS negativos, secret scan, SAST/DAST, dependency audit e revisão LGPD.