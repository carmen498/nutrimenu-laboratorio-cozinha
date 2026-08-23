# QA / Go-live operacional — 2026-08-23

## Objetivo

Converter o go-live do Laboratório de Cozinha em uma decisão objetiva de **GO / NO-GO**, separando:

1. controles comprováveis automaticamente no repositório;
2. preflight de configuração real, executado por administrador no app;
3. cenários que obrigatoriamente exigem duas sessões reais, OAuth, OTP ou Mercado Pago sandbox/produção;
4. validação manual do Security Check disponibilizado pelo Base44.

## Gate automatizado

Executar:

```bash
npm run go-live:check
```

O gate deve concluir sem erro:

- typecheck;
- lint;
- build;
- RLS 7/7;
- hardening das 5 functions agendadas;
- audit de dependências;
- contratos estáticos de autenticação, assinatura e Mercado Pago.

## Preflight real no app

Acessar como administrador:

**Auditorias → QA / Go-live**

Executar, nesta ordem:

1. **Executar preflight**;
2. **Testar HMAC**.

O preflight não retorna valores de secrets. Ele verifica apenas presença/ausência e dados operacionais não sensíveis.

### Bloqueadores de GO técnico

- `AMBIENTE` diferente de `producao` ou `sandbox`;
- frontend Mercado Pago em modo diferente do backend;
- token Mercado Pago ausente para o ambiente atual;
- `MERCADOPAGO_WEBHOOK_SECRET` ausente;
- `RESEND_API_KEY` ausente;
- plano mensal ou anual ausente;
- `valor_cobranca` mensal/anual ausente ou inválido;
- autoteste HMAC falhando.

### Avisos que não bloqueiam tecnicamente o checkout

- WhatsApp em modo de teste ou sem token;
- template transacional explicitamente em rascunho;
- plano Renovação configurado, mas ainda fora do checkout pago.

## P0 — homologação manual obrigatória

### 1. Isolamento real Usuário A × Usuário B

Usar duas contas comuns em sessões independentes.

- A cria receita, cardápio e dados pessoais.
- B não consegue localizar, abrir, alterar ou excluir dados privados de A por interface nem por URL direta.
- A continua acessando seus dados.
- ambos enxergam catálogo-base.

**GO:** nenhum vazamento A↔B.

### 2. Usuário comum × Admin

- usuário comum tenta `/auditorias` e rotas administrativas diretas;
- deve ser redirecionado e não receber dados admin;
- admin acessa normalmente.

**GO:** privilégio administrativo não escalável por URL.

### 3. Cadastro por e-mail

- criar conta nova;
- confirmar OTP;
- verificar que sem checkbox de Termos o cadastro não avança;
- após OTP, conferir persistência da versão vigente dos Termos;
- conferir trial iniciado uma única vez;
- logout/login novamente sem gerar novo trial.

**GO:** conta, aceite e trial consistentes.

### 4. Cadastro/Login com Google

- iniciar cadastro Google com checkbox marcada;
- retornar autenticado;
- confirmar aceite persistido da versão vigente;
- confirmar trial para conta realmente nova;
- repetir login e confirmar que não cria novo trial.

**GO:** OAuth equivalente ao fluxo de e-mail.

### 5. Assinatura ativa × expirada

Conta ativa:

- abre rotas protegidas normalmente.

Conta expirada/vencida:

- URL direta de receita/cardápio deve redirecionar para `/planos`;
- `/planos`, `/conta` e `/suporte` continuam disponíveis.

**GO:** entitlement coerente no frontend e backend.

## P0 — Mercado Pago end-to-end

Executar no ambiente de homologação apropriado e registrar IDs técnicos da tentativa em evidência interna.

### Cenários obrigatórios

1. PIX criado e aprovado;
2. cartão aprovado;
3. cartão recusado;
4. notificação/webhook duplicado;
5. pagamento cancelado/expirado;
6. estorno/reembolso;
7. tentativa repetida com o mesmo `tentativa_id`;
8. nova tentativa após rejeição/cancelamento.

### Evidências esperadas

- `Pagamento.status` correto;
- valor igual a `ConfiguracaoPlano.valor_cobranca`;
- versão de código atual registrada;
- aprovação ativa o plano e salva `pagamento_ativo_id`;
- duplicidade não ativa nem notifica duas vezes;
- estorno do pagamento vigente revoga o acesso;
- estorno de pagamento antigo não derruba assinatura posterior;
- webhook com assinatura inválida retorna 401;
- nenhum número de cartão/CVV/payload bruto é persistido;
- PIX não deixa QR transitório além da política de retenção.

**GO:** todos os oito cenários aprovados.

## P0 — Security Check Base44

Executar manualmente no painel Base44.

**GO:** nenhum achado crítico/high sem tratamento ou aceitação formal documentada.

## P1 — regressão funcional mínima

Após os P0, validar:

- receita manual;
- receita por IA;
- importação CSV;
- importação PDF/DOCX/TXT;
- upload de imagem;
- duplicar/personalizar receita;
- cardápio;
- lista de compras;
- ficha técnica/custos;
- relatórios/PDF;
- edição de ingrediente/preço permitido;
- compartilhamentos/links externos relevantes.

## Plano Renovação

No estado atual, o card `renovacao` é exibido quando configurado, porém o botão continua **Em breve** e `criarPagamentoMercadoPago` aceita somente `mensal` e `anual`.

Isso é aceitável para o go-live apenas se Renovação estiver formalmente fora do escopo do lançamento. Se o produto precisar vender Renovação desde o primeiro dia, este item passa a **P0 bloqueador**.

## Critério final

### GO

Somente quando:

- `npm run go-live:check` = PASS;
- preflight admin = sem bloqueios;
- HMAC = PASS;
- A×B real = PASS;
- auth e OAuth = PASS;
- assinatura ativa/expirada = PASS;
- Mercado Pago 8/8 = PASS;
- Security Check Base44 = sem bloqueador;
- regressão funcional mínima = PASS.

### NO-GO

Qualquer falha P0 mantém o release em **NO-GO**, mesmo com build e testes técnicos verdes.
