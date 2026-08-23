# Fase 15 — GO-LIVE

Data da decisão: 23/08/2026
App: Laboratório de Cozinha
Domínio canônico: `https://laboratoriodecozinha.com.br`

## Decisão atual

**NO-GO.**

O source corrente está tecnicamente saudável, mas o domínio público ainda serve uma build frontend antiga. Além disso, permanecem P0 operacionais sem evidência literal de aprovação, em especial a homologação financeira real da revisão Mercado Pago atual.

## 1. Gate técnico executado

Estado corrente validado em 23/08/2026:

- typecheck: PASS;
- lint: PASS;
- build Vite: PASS;
- orçamento de build: PASS;
- testes de segurança: PASS;
- audit completo: PASS, 0 vulnerabilidades;
- audit produção: PASS, 0 vulnerabilidades;
- contratos estáticos de go-live: PASS;
- smoke público de autenticação: PASS.

Baseline de build observada:

- entry JS: 542,0 KB;
- JS total: 2715,9 KB;
- maior CSS: 111,2 KB;
- maior imagem: 156,7 KB.

## 2. Bloqueador P0 — build pública defasada

`npm run test:production-routes` falha atualmente.

O HTML servido pelo domínio ainda contém:

- asset `index-3wnFGdat.js`;
- SDK Mercado Pago global `https://sdk.mercadopago.com/js/v2`;
- referência ao diagnóstico legado `logUserAgentDiagnostico`;
- bloco textual `DIAGNÓSTICO TEMPORÁRIO`.

O build local/source corrente gerou entry `index-Dif-hLPm.js` e não depende do SDK Mercado Pago global no `index.html`; o SDK é carregado sob demanda no checkout.

Conclusão: o domínio não está executando a revisão homologada do source.

**Ação obrigatória:** publicar a revisão corrente pelo botão Publish/Publicar no Base44 e repetir `npm run test:production-routes`.

A integração remota utilizada nesta auditoria não expõe ação de Publish; checkpoint/commit não substituem publicação do frontend.

## 3. Autenticação pública

`npm run test:auth-production`: PASS.

O smoke cobre:

- rotas públicas de auth;
- resposta neutra do pedido de reset;
- rejeição de token inválido;
- cadeia estrutural de Google OAuth até o provedor.

A Fase 9 já comprovou recuperação de senha E2E com e-mail real descartável, troca de senha, rejeição da senha antiga e rejeição de reutilização do token.

Ainda permanecem sem aprovação literal:

- login Google humano completo com retorno autenticado ao domínio;
- rejeição de um token de reset real depois de ultrapassar sua validade temporal;
- canonicalização do link de reset na build pública, que depende da publicação corrente.

## 4. Isolamento de dados

Fase 10: PASS.

- duas sessões reais independentes;
- 12 entidades privadas;
- 207 verificações;
- nenhum vazamento A↔B observado;
- leituras, updates e deletes cruzados bloqueados;
- catálogo-base continuou legível.

Este item não bloqueia mais o go-live.

## 5. CI, build e dependências

Fase 12: PASS.

- instalação reproduzível com `npm ci`;
- Node 20 padronizado;
- GitHub Actions em PR, push na main, schedule e workflow_dispatch;
- build budget ativo;
- Dependabot ativo;
- audit completo e produção com 0 vulnerabilidades.

Foi adicionado o gate de release:

```bash
npm run release:check
```

Ele executa:

1. `npm run ci:check`;
2. `npm run test:production-routes`;
3. `npm run test:auth-production`.

O CI comum continua deliberadamente sem depender do domínio externo; `release:check` é o gate específico de publicação/release.

## 6. Bloqueador P0 — Mercado Pago atual sem E2E real

Versões correntes no código:

- criação de pagamento: `v10-2026-08-23-homologacao-prod`;
- webhook: `webhook-v4-2026-08-23-homologacao-prod`.

Consulta aos dados reais em 23/08/2026:

- pagamentos com `versao_codigo = v10-2026-08-23-homologacao-prod`: **0**;
- logs de webhook com `versao_codigo = webhook-v4-2026-08-23-homologacao-prod`: **0**.

Portanto, a Fase 6B permanece pendente. Evidência histórica de versões anteriores não substitui homologação da revisão atual.

Cenários financeiros obrigatórios antes do GO:

1. PIX criado e aprovado;
2. cartão aprovado;
3. cartão recusado;
4. webhook duplicado;
5. pagamento cancelado/expirado;
6. estorno/reembolso;
7. tentativa repetida com o mesmo `tentativa_id`;
8. nova tentativa após rejeição/cancelamento.

## 7. Outros P0 operacionais ainda sem evidência literal de PASS

Conforme o checklist operacional vigente:

- preflight admin sem bloqueios;
- autoteste HMAC no painel;
- usuário comum × Admin em fluxo real;
- cadastro por e-mail com aceite persistido + trial único;
- Google OAuth humano completo;
- assinatura ativa × expirada em fluxo real;
- Security Check Base44 sem achado crítico/high não tratado;
- regressão funcional mínima pós-publicação.

Nenhum desses itens deve ser marcado como aprovado apenas por equivalência estrutural.

## 8. Plano Renovação

O plano Renovação continua fora do checkout pago e aparece como `Em breve`.

Isso não bloqueia o lançamento somente se Renovação permanecer formalmente fora do escopo comercial inicial.

## 9. Ordem de fechamento para converter NO-GO em GO

1. Publicar a revisão corrente no Base44.
2. Executar `npm run release:check` e exigir PASS integral.
3. Executar/registrar preflight admin + HMAC.
4. Completar Google OAuth humano e assinatura ativa × expirada.
5. Executar Security Check Base44 e resolver qualquer high/critical.
6. Executar Fase 6B Mercado Pago 8/8 na revisão atual.
7. Executar regressão funcional mínima no domínio já publicado.
8. Reemitir esta decisão como **GO** somente quando todos os P0 estiverem aprovados.

## Resultado formal

**Fase 15: NO-GO em 23/08/2026.**

Motivos bloqueadores confirmados:

1. build pública defasada;
2. Mercado Pago `v10/v4` sem transação/webhook real da revisão atual;
3. P0 humanos/operacionais restantes sem evidência literal de PASS.

O código corrente pode ser considerado candidato de release, mas não a versão pública atualmente servida.