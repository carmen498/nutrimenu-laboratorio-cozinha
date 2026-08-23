# Fase 8 — Domínio, DNS, HTTPS e Rotas de Produção

Data da homologação: 23/08/2026
Domínio canônico: `https://laboratoriodecozinha.com.br`
App Base44: `6a2b263c4c1cb1e47d54d8b7`

## 1. DNS e domínio

- Apex `laboratoriodecozinha.com.br` resolve em IPv4 da infraestrutura publicada.
- `www.laboratoriodecozinha.com.br` também resolve.
- `http://laboratoriodecozinha.com.br/` responde 301 para `https://laboratoriodecozinha.com.br/`.
- `http://www.laboratoriodecozinha.com.br/` responde 301 para HTTPS www.
- `https://www.laboratoriodecozinha.com.br/` responde 301 para o apex HTTPS.
- O apex HTTPS é o domínio canônico.

Status: VERDE.

## 2. HTTPS, HSTS e certificados

### Apex

- HTTPS: HTTP 200.
- HSTS: `max-age=31536000`.
- Certificado: CN `laboratoriodecozinha.com.br`.
- SAN inclui `laboratoriodecozinha.com.br`.
- Validade observada: 18/08/2026 a 16/11/2026.

### WWW

- Certificado: CN `www.laboratoriodecozinha.com.br`.
- SAN inclui `www.laboratoriodecozinha.com.br`.
- Validade observada: 18/08/2026 a 16/11/2026.

Status: VERDE.

## 3. Deep links da SPA

Em teste HTTP direto, 23 rotas relevantes responderam HTTP 200 e entregaram o shell da SPA, incluindo:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/termos`
- `/privacidade`
- `/aceitar-termos`
- `/sobre`
- `/contato`
- `/app`
- `/planos`
- `/conta`
- `/suporte`
- `/sobre-carmen`
- `/receitas`
- `/minhas-receitas`
- `/cardapios`
- `/ingredientes`
- `/lista-compras`
- `/percapita`
- `/admin/comunicacao`
- `/auditorias`

Resultado do teste de servidor: `23/23` deep links com HTTP 200 + shell SPA.

Observação: receber o shell confirma o fallback/roteamento do servidor. A execução da rota React depende da build frontend efetivamente publicada; neste momento a produção está defasada em relação ao source atual (ver item 7).

## 4. Correção de colisão de rota `/sobre`

Foi encontrada uma colisão no source: a página pública “Sobre o Laboratório de Cozinha” e a página autenticada “Sobre a Carmen” utilizavam `/sobre`.

Correção:

- `/sobre` permanece público e institucional.
- a página autenticada passou para `/sobre-carmen`.
- o menu autenticado foi atualizado para “Sobre a Carmen” → `/sobre-carmen`.

Status do source: VERDE.

## 5. Recuperação de senha

O domínio próprio expõe o endpoint Base44 usado pelo fluxo de recuperação. Em teste anterior da homologação, `reset-password-request` no domínio próprio respondeu HTTP 200 com mensagem neutra para endereço inexistente, preservando anti-enumeração.

As páginas `/forgot-password` e `/reset-password` respondem 200 como deep links.

Pendente para Fase 9: E2E humano com e-mail realmente recebido, abertura do link, troca de senha, rejeição da senha antiga, reutilização e expiração do token.

Status estrutural: VERDE.
Status E2E real: PENDENTE FASE 9.

## 6. Google OAuth

Foi testada a cadeia de início do OAuth sem autenticar uma conta:

1. domínio próprio inicia `/api/apps/auth/login`;
2. Base44 redireciona para `app.base44.com/api/apps/auth/login`;
3. Base44 redireciona para `accounts.google.com/o/oauth2/v2/auth`;
4. o Google recebe `redirect_uri=https://app.base44.com/api/apps/auth/callback`;
5. parâmetro `state` está presente.

Esse callback é o endpoint técnico da Base44 e é compatível com a arquitetura do SDK. O retorno final ao app é transportado no estado do fluxo.

Pendente para Fase 9: login Google completo com conta real e retorno final ao domínio próprio.

Status estrutural: VERDE.
Status E2E real: PENDENTE FASE 9.

## 7. Build publicada — BLOQUEADOR

A produção ainda está servindo uma build frontend anterior ao source homologado.

Evidências observadas no HTML ao vivo:

- produção ainda contém `<script src="https://sdk.mercadopago.com/js/v2">` global;
- produção ainda contém referências a `logUserAgentDiagnostico` e ao diagnóstico temporário de User-Agent;
- o source atual não contém nenhum desses dois resíduos;
- `npm run test:production-routes` falha deliberadamente ao detectar o fingerprint legado.

Isso significa que DNS, TLS e fallback de rotas estão corretos, porém a aplicação React efetivamente executada pelo usuário ainda não é a revisão atual das Fases 5–8.

Não foi executado deploy via CLI porque `npx base44 whoami` não confirmou autenticação da sessão. Pela política operacional da CLI Base44, não deve ser forçado deploy sem autenticação confirmada.

Status: AMARELO / BLOQUEADOR DE HOMOLOGAÇÃO FINAL.

Critério para fechar este item:

1. publicar a build corrente;
2. confirmar que os fingerprints legados desapareceram do HTML de produção;
3. rodar `npm run test:production-routes` novamente;
4. exigir PASS completo.

## 8. E-mail do domínio

O domínio possui resposta MX observável, mas isso não comprova recebimento de uma caixa postal específica.

Foi observada inconsistência de identidade de contato:

- página pública de Contato: `contato@laboratoriodecozinha.com.br`;
- documentos legais/configuração transacional: `contato@nutrimenu.com.br`.

Nenhuma alteração foi feita automaticamente porque a existência de MX não prova que `contato@laboratoriodecozinha.com.br` recebe mensagens. A padronização deve ocorrer somente após confirmação operacional da caixa.

Status: AMARELO administrativo, não bloqueia DNS/HTTPS.

## 9. Mercado Pago

O endpoint de webhook pertence ao backend Base44 e a integração histórica de produção já possui notificações válidas. A homologação financeira real da revisão `v10` / webhook `v4` permanece pertencente à Fase 6B.

Status de domínio/estrutura: VERDE.
Status financeiro E2E da versão atual: PENDENTE FASE 6B.

## Resultado da Fase 8

- DNS: VERDE
- HTTPS: VERDE
- HSTS: VERDE
- certificado apex: VERDE
- certificado www: VERDE
- canonicalização www → apex: VERDE
- fallback/deep links de servidor: VERDE (23/23)
- colisão `/sobre`: CORRIGIDA NO SOURCE
- reset de senha — infraestrutura: VERDE
- OAuth Google — infraestrutura: VERDE
- build frontend atual publicada: AMARELO/BLOQUEADOR
- OAuth/recuperação completos com usuário real: PENDENTES FASE 9
- MP financeiro `v10/v4`: PENDENTE FASE 6B

**Status global da Fase 8: AMARELO até publicação da build corrente e repetição do teste de produção.**
