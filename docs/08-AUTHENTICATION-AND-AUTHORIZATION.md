# 08 — Autenticação e autorização

## Atual
- **CONFIRMADO:** Base44 Auth; email/senha, cadastro com OTP, Google OAuth, logout, reset de senha (`src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`).
- Token capturado/sanitizado e guardado em `localStorage`; reset token temporário em `sessionStorage` (`index.html`, `app-params.js`).
- `AuthProvider` consulta public settings e `auth.me()`, registra login, recupera perfil/aceite e inicializa trial.
- Sessão: duração, refresh, cookie e algoritmo de senha **NÃO ENCONTRADOS**.
- Magic link/MFA: **NÃO ENCONTRADO**; OTP é verificação de cadastro.

## Camadas
1. Router: `ProtectedRoute`, `AdminRoute`, `CustosRoute`.
2. Backend: `auth.me()` e validações admin/add-on.
3. Banco: RLS e regras field-level.
4. Comercial: status/trial/expiração/termos.

## Matriz resumida
| Papel | Recurso | Ler | Criar | Alterar | Excluir | Administrar |
|---|---|---:|---:|---:|---:|---:|
| anônimo | páginas públicas | sim | cadastro | não | não | não |
| user | catálogo base | sim | não | via cópia | não base | não |
| user | dados próprios | sim | sim | sim | sim | não |
| user | pagamentos próprios | sim | via checkout backend | não | não | não |
| user autorizado | custos próprios | sim | sim | sim limitado | conforme RLS | não |
| admin | catálogos/config/logs/users | sim | sim | sim | sim | sim |

## Migração de usuários
- **AÇÃO NECESSÁRIA:** obter capacidade oficial de exportar User sem hashes/tokens e confirmar identificadores OAuth.
- Se hashes não forem exportáveis/compatíveis: import de perfis + convite/reset obrigatório.
- Sessões não devem ser migradas; exigir novo login.
- OAuth: registrar novo client/redirect URI e solicitar relink se subject/provider ID não for exportável.
- Preservar `id` ou mapear todas as referências; migrar aceite legal e atributos de assinatura.
- Testar usuários admin/user/trial/ativo/vencido/inativo e acesso a dados de outro usuário (negação).

## Requisitos destino
Tokens curtos + refresh seguro, revogação, rate limit, proteção OTP/reset, logs sem token, CSRF conforme transporte, MFA opcional decidido, policies equivalentes e testes automatizados de autorização.