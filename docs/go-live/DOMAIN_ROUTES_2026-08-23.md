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

## 7. Build publicada — PUBLICAÇÃO PENDENTE

O source atual foi corrigido e validado, mas o domínio público ainda está servindo uma build frontend anterior.

Correções implantadas no source nesta fase:

- `fetchpriority` corrigido para `fetchPriority` no Hero React;
- tipagem Vite adicionada ao `jsconfig.json`, permitindo imports `.jpg` da landing no typecheck;
- colisão `/sobre` removida com a rota autenticada `/sobre-carmen`;
- diagnóstico temporário `logUserAgentDiagnostico` já não existe no source atual;
- SDK Mercado Pago global já não existe no `index.html` atual e permanece carregado sob demanda no checkout.

Validações do source após as correções:

- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS;
- `npm run test:security`: PASS;
- `npm run test:go-live`: PASS;
- `npm run audit:security`: PASS — 0 vulnerabilidades.

O teste do domínio continua falhando deliberadamente porque o HTML publicado ainda contém os fingerprints da build antiga:

- `<script src="https://sdk.mercadopago.com/js/v2">` global;
- referências a `logUserAgentDiagnostico`.

No fluxo remoto Base44, as alterações foram commitadas no projeto, porém o frontend do domínio é atualizado somente quando o app é publicado. O conector remoto desta sessão não expõe uma ação de `Publish`, portanto essa etapa não pode ser acionada daqui sem inventar um mecanismo inexistente.

Status do source: VERDE.
Status do frontend no domínio: AMARELO — publicação pendente.

Critério para fechar este item:

1. publicar a revisão corrente no Base44;
2. rodar `npm run test:production-routes` novamente;
3. exigir PASS completo e ausência dos fingerprints legados.

## 8. E-mail do domínio

A consulta DNS retornou um Null MX para `laboratoriodecozinha.com.br`, isto é, o domínio declara que não recebe e-mail diretamente.

A página pública de Contato foi corrigida para usar o endereço operacional já adotado pelos documentos legais e pelos e-mails transacionais:

- `contato@nutrimenu.com.br`.

Assim, a interface não oferece mais `contato@laboratoriodecozinha.com.br`, que não possui entrega de e-mail configurada.

Status: VERDE.

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
- source frontend atual: VERDE (typecheck/lint/build/testes PASS)
- build frontend atual publicada no domínio: AMARELO — publicação pendente
- OAuth/recuperação completos com usuário real: PENDENTES FASE 9
- MP financeiro `v10/v4`: PENDENTE FASE 6B

**Status global da Fase 8: AMARELO somente pela publicação pendente do frontend. O código e os testes locais estão VERDES.**
