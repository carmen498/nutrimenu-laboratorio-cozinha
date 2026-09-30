# 42 — Análise completa do projeto e plano de ação

**Versão:** 1.0 · **Data:** 25/09/2026 · **Base analisada:** `main@cfe0b60` (24/09/2026)
**Complementa:** `41-PLANO-DE-ACAO.md` (plano 360°, 11–12/09), a revisão completa de 06/09
(PR #45, base `883ecee`) e `go-live/GO_LIVE_DECISION_2026-08-23.md` (NO-GO).

> **Confidencialidade.** Este repositório é público. Os achados de segurança ainda
> abertos aparecem aqui só pelo identificador (`S-xx` e `Z-xx`), com descrição genérica.
> Evidências, reproduções e correções detalhadas estão num relatório privado entregue
> aos responsáveis. Publique esses detalhes só depois da correção.

---

## 0. Resumo executivo

Entre 06/09 e 24/09 entraram **240 commits**, todos direto na `main` pelo editor Base44,
sem PR. 157 deles têm a mensagem "External agent changes". Nesse período o produto ganhou
muita coisa: venda do Guia Técnico ZR, desistência self-service com estorno automático,
estorno parcial, e-mails de onboarding e de reativação, oferta de 48 h, card de
conversão, exclusão de usuários pelo admin e parcelamento consultado no Mercado Pago.
Enquanto isso, **a rede de segurança do projeto se desfez**:

| Indicador | Situação em 24–25/09 |
|---|---|
| CI "Quality and Security" na `main` | **Vermelho desde 09/09** (último verde em 07/09); mais de 150 execuções seguidas falhando por 3 causas triviais |
| Revisão de 06/09 (191 itens rechecados) | **7 corrigidos**, 2 parciais, 5 refutados, **177 ainda abertos**, incluindo os 9 altos confirmados |
| Achados novos desta análise | 152 levantados → **118 confirmados** por verificação adversarial: **1 crítico, 16 altos**, 83 médios e 18 baixos (há duplicatas entre áreas; ver §3 e o Anexo A). 2 refutados, 32 baixos não verificados |
| Decisão formal de go-live | **NO-GO de 23/08, nunca reemitido**. Mesmo assim, o produto vende (1 pagante, Guia ZR à venda, checkout em produção) |
| Teste comportamental no fluxo de dinheiro | **Nenhum**: cerca de 830 linhas novas em 47 commits cobertas só por asserções de texto |
| Backup verificado dos dados de produção | **Não existe** |
| Esforço no núcleo (receitas, cardápios, eventos) | ~8 de 240 commits. Nenhum alto de 06/09 dessa área foi tocado |

**Diagnóstico em cinco pontos**

1. **Dinheiro e acesso vazam por regra de negócio, sem precisar de ataque sofisticado.** A
   revogação de acesso depois de um estorno está incompleta. Esse é o crítico `S-01`, item
   1.2 de 06/09, que ficou mais grave desde então. O Guia ZR, com lançamento
   em 01/10, tem duas brechas de elegibilidade de oferta (`S-02`, `S-03`), e a idempotência
   do checkout é frouxa (`S-04`).
2. **A comunicação do ciclo de vida provavelmente está parada desde 09/09.** Quatro jobs
   diários (trial expirando, trial vencido, plano vencendo e lembrete de PIX) disparam fora
   da janela que o próprio código aceita e terminam com HTTP 200 sem enviar nada. O de
   "plano vencendo" ainda quebra com erro 500 desde 23/09. Como não existe renovação
   automática, é o gatilho da receita recorrente que está desligado.
3. **A rede de segurança está desligada.** CI vermelho há 16 dias, fluxo de dinheiro sem
   teste que execute o código, nenhum backup, rotinas em lote que gravam sem simulação e
   commits sem descrição. Qualquer regressão nova passa sem sinal.
4. **O momento de conversão tem defeitos.** O escalador de receitas, que o plano 41 elegeu
   como "momento aha" do trial, grava a receita com a composição errada (de −33% a 5×).
   O aviso "Abra em um navegador" cobre a landing inteira para quem vem do Instagram e do
   Facebook, o canal principal do plano de captação. E o Laboratório de Custos é
   prometido no trial, mas quem paga perde o acesso e não tem como comprá-lo.
5. **O foco está disperso.** A migração Supabase está parada desde 04/09 e o cutover
   previsto para a semana 11 é inviável. O plano 41 não inclui o Guia ZR, que recebeu a
   maior parte do esforço.

**Recomendação.** Nas próximas duas semanas, **parar de acrescentar funcionalidade** e fazer
três coisas, nesta ordem:
1. **Religar a rede de segurança:** CI verde, alerta de CI vermelho e backup.
2. **Fechar os vazamentos de dinheiro e de acesso** antes do lançamento do Guia ZR em 01/10.
3. **Ligar e medir o motor de conversão** que já foi construído.

A migração Supabase fica congelada até haver escala que a justifique. O detalhamento está
no §7.

---

## 1. Escopo e método

- **Nove frentes analisadas em paralelo:** pagamentos e assinaturas; autenticação e
  sessão; entidades, RLS e autorização das 78 functions; domínio da cozinha;
  Laboratório de Custos; automações, comunicação e observabilidade; engenharia (CI,
  testes, build, dependências e processo); migração Supabase/Vercel; produto, go-live
  e documentação.
- **Mais seis lacunas**, apontadas por um revisor de completude: truncamento de listas e
  cache; IA generativa e cota de créditos; recuperabilidade dos dados; instrumentação
  do funil; checkout no navegador; e o lado consumidor da integração com o Guia ZR.
  Para essa última, o repositório privado `carmen498/nutrimenu-zr` foi anexado à sessão
  só para leitura.
- **Verificação:**
  - achados críticos e altos passaram por dois verificadores independentes, instruídos a
    refutar: um olhou a exatidão técnica, o outro a alcançabilidade e o impacto. Quando
    discordaram, um terceiro decidiu;
  - os médios passaram por um verificador;
  - os baixos não foram verificados.
  Sempre que possível, a hipótese foi confirmada **executando** o código real, com
  scripts Node que importam os módulos de `src/lib` e `base44/shared`.
- **Rechecagem:** 191 itens da revisão de 06/09 (todos os do Anexo A e os críticos, altos
  e médios do Anexo B) foram conferidos contra o HEAD. Os 52 baixos não verificados do
  Anexo B ficaram de fora.
- **Execução local:** typecheck, lint, build, todos os scripts de teste offline e os
  audits. Em produção rodou só o smoke público de leitura (`test-production-routes`).
- **Limites:** não houve acesso a dados de produção (Base44), nem aos painéis do Mercado
  Pago, Resend, Vercel e Supabase. Tudo o que depende desses dados está em §8, como
  pergunta ou ação para a Carmen.

Escala de esforço: **P** = até meio dia · **M** = 1 a 3 dias · **G** = mais de 3 dias.

---

## 2. Estado por área

| Área | Maturidade hoje | O que mudou desde 06/09 | Risco principal |
|---|---|---|---|
| Pagamentos e assinaturas | Protótipo avançado. O preço sempre vem do servidor, o webhook valida HMAC e reconsulta a order, e a RLS impede o cliente de gravar pagamento ou acesso | 97 commits: Guia ZR, desistência com estorno automático, estorno parcial, contestação, PIX expirado, supressão de avisos de teste | A mesma transição de status é tratada em 5 caminhos divergentes; revogação incompleta (`S-01`); zero teste comportamental |
| Autenticação e sessão | Madura na intenção: `returnTo` único com expiração, termos versionados nos dois lados. Falhas na execução | Ponte do Guia ZR, "Manter-me conectado", exclusão pelo admin, domínio admin | Sessão persiste em computador compartilhado (`S-05`); inicialização do cliente (`S-06`) |
| Entidades, RLS e functions | 39 functions administrativas checam admin na primeira linha. O padrão das entidades novas é bom | 7 entidades e 16 functions novas | 2 altos de RLS de 06/09 abertos (`S-15`, `S-16`); controle de acesso de uma rotina nova (`S-08`) |
| Domínio da cozinha | Motor canônico sólido e puro, com regras documentadas. A integração entre telas é imatura | 8 commits (orçamento, analytics do escalador) | Escalador grava errado; cache de sub-receita defasado; per capita resolvido de 4 formas |
| Laboratório de Custos | Beta funcional; a matemática confere com casos-limite | Nada no núcleo desde 04/09 | Não dá para vender: sem caminho de compra, a renovação destrói dias pagos e o preço padrão ignora o custo de comercialização |
| Automações e comunicação | O gate de jobs é bom (POST, admin, janela, cooldown) | Onboarding, reativação, desistências e supressões | 4 jobs ignorados em silêncio + 1 quebrado; nenhum painel de execução; LGPD da comunicação promocional |
| Engenharia | Gate abrangente no papel (≈40 s) e inoperante na prática | 240 commits sem PR | CI vermelho; Dependabot travado; Node 20 fora de suporte; bundle a 98,5% do orçamento |
| Migração Supabase/Vercel | Schema com RLS e reconciliação certificada em Preview. Dados e código migrados: 0% | Nada desde 04/09 | Schema defasado do produto; custo sem retorno; cópia de dados fora do inventário (`S-19`) |
| Produto e go-live | Plano 41 bem feito; o código das semanas 4 a 8 foi entregue em 11–12/09 | Muito código, nenhuma ativação | NO-GO não reemitido; motor de conversão desligado; Termos e Política de 18/08 |

### O que está bem e deve ser preservado

- **Preço, desconto e elegibilidade decididos no servidor.** O cliente só envia IDs, e o
  servidor confere que total, soma dos itens e valor do pagamento são iguais antes de
  chamar o Mercado Pago.
- **Webhook do Mercado Pago:** HMAC comparado em tempo constante, reconsulta do recurso,
  HTTP 200 nos desfechos não processáveis e separação entre `sem_assinatura` e
  `assinatura_invalida`.
- **Estorno por desistência:** chave determinística, respostas ambíguas tratadas como
  `aguardando_confirmacao`, backoff de 15 min a 24 h e reprocessamento.
- **Gate único para jobs** (`protegerExecucaoAgendada`), com datas de negócio em
  America/Sao_Paulo.
- **Minimização em logs:** e-mail mascarado, telefone com 4 dígitos, IP em hash e erros
  sanitizados.
- **Motores de receita e de custo em funções puras e pequenas**, que dá para testar
  offline em minutos. A matemática do Laboratório de Custos está correta.
- **Curadorias com o padrão certo:** simulam, congelam o estado com SHA-256 e só aplicam
  com a mesma assinatura. É o modelo para todas as rotinas em lote.
- **O gate `ci:check`** é abrangente, e três correções triviais o deixam verde (verificado
  num snapshot do HEAD).
- **CI de banco exemplar:** actions fixadas por SHA e Supabase CLI com checksum.
- **Documentação de regras de negócio por área** (`docs/business-rules/01–07`) e um plano
  (doc 41) no formato causa → correção → teste → aceite.

---

## 3. Achados que exigem ação imediata

### 3.1 Segurança, dinheiro e acesso (detalhes no relatório privado)

| ID | Sev. | Tema | Esforço | Fase |
|---|---|---|---|---|
| `S-01` | **Crítico** | Revogação de acesso após estorno incompleta (item 1.2 de 06/09, agravado desde então) | P | 0 |
| `S-02` | Alto | Guia ZR: elegibilidade de oferta sem validação no servidor (caso A) | M | 0 |
| `S-03` | Alto | Guia ZR: elegibilidade de oferta sem validação no servidor (caso B) | P | 0 |
| `S-04` | Alto | Idempotência do checkout não vincula produto nem valor, e a resposta do provedor não é conferida | P | 0 |
| `S-05` | Alto | Encerramento de sessão incompleto ("Manter-me conectado" e "Sair") em computador compartilhado | P | 0 |
| `S-06` | Alto | Endurecer a inicialização do cliente Base44 no navegador | P | 0 |
| `S-07` | Alto | Controle de consumo das integrações pagas de IA (cota de créditos compartilhada pelo app) | M | 1 |
| `S-08` | Médio | Controle de acesso de rotina administrativa de PIX criada em 24/09 | P | 0 |
| `S-09` | Médio | Validação de entrada e escape em e-mails administrativos (nota fiscal ZR) | P | 0 |
| `S-10` | Médio | Endurecer a recepção de token pós-OAuth | M | 1 |
| `S-11` | Médio | Endurecer a saída da ponte do Guia ZR | P | 1 |
| `S-12` | Médio | Neutralizar fórmulas nas exportações CSV (agora com dados de toda a base) | P | 1 |
| `S-13` | Médio | Reduzir o escopo PCI do formulário de cartão | M | 2 |
| `S-14` | Baixo | Cabeçalhos de segurança (CSP e enquadramento) | M | 2 |
| `S-15` | Alto (06/09) | RLS das entidades-filhas de Receita e Cardápio (item 1.3 de 06/09) | P | 1 |
| `S-16` | Alto (06/09) | "Evento Modelo" (item 1.4 de 06/09) | P | 1 |
| `S-17` | Baixo | Lista de origens autorizadas da ponte do Guia ZR | P | 0 |
| `S-18` | Médio | Aceite de termos na entrada pela ponte do Guia ZR | M | 1 |
| `S-19` | Médio | Projeto Supabase piloto e conector do Base44 | P | 0 (Carmen) |
| `Z-01…Z-07` | Alto a Baixo | Lado do Guia ZR (repositório privado `nutrimenu-zr`): configuração de produção, desempenho, sessão e processo de publicação | P–M | 0 |

> A PR #45 (revisão de 06/09) está **pública** desde aquela data e descreve com detalhes
> os itens 1.2, 1.3 e 1.4, que continuam abertos. Considere esses três como
> divulgados: corrija com prioridade.

### 3.2 Operação e integridade de dados

**O-1 · Jobs de comunicação ignorados em silêncio desde 09/09 (alto, confirmado por execução).**
Os workflows versionados em `base44/workflows` (migrados pela plataforma em 09/09) usam
`"timezone": "UTC"`:

| Job | Horário do cron | Janela aceita pelo código |
|---|---|---|
| Trial expirando | 12:00Z = 09:00 BRT | 07:55–08:25 BRT (`enviarTrialExpirando/entry.ts:20`) |
| Trial vencido | 09:05 BRT | 07:45–08:15 BRT |
| Plano vencendo | 09:10 BRT | 08:05–08:35 BRT |
| Lembrete de pendência | 11:15 BRT | 08:15–08:45 BRT |

Nos quatro casos o disparo cai fora da janela. `protegerExecucaoAgendada` responde
`200 {ignored: true, reason: "outside_schedule_window"}` e a plataforma registra sucesso.
Onboarding, reativação, preços e desistências estão alinhados. O teste
`scripts/test-scheduled-functions.mjs` valida os `function.jsonc` legados e não lê
`base44/workflows`. Efeito colateral: a normalização de assinaturas vencidas só roda
dentro de dois desses jobs. Por isso trials expirados que não voltam ao app ficam como
"trial" para sempre, e a reativação (que filtra "vencido") nunca os alcança.

**O-2 · "Plano vencendo" quebra para todo assinante que não veio do Guia ZR (alto, regressão de 23/09).**
`d6fedc46` fez `resolverProdutoPorOrigem` devolver `null` para qualquer origem diferente de
`guia_zr`. Em `enviarPlanoVencendo/entry.ts:64` o retorno é desestruturado sem checar
`null`: TypeError → HTTP 500. O lote para, a normalização não roda e o cooldown de 20 h
já foi consumido. Mesmo com a janela corrigida, nenhum assinante do Laboratório recebe o
aviso D-5.

**O-3 · Escalador grava a receita com composição inconsistente (alto).**
`ReceitaAberta.jsx:437-466` (`commitTotalGrams`) grava `porcoes_base = g/PC` e o PDP, mas não
mexe em `quantidade_por_porcao`. A composição escala por `(g/PC)/porcoes_base` e o PDP por
`g/PDP`, e os dois só coincidem quando porções × PC = PDP. Reproduzido com as funções
reais: −17% depois do refetch num caso comum; receita importada com `porcoes_base=1`
grava 20.000 g de ingredientes para um PDP de 4.000 g. Em receita do catálogo, cada
toque cria uma cópia pessoal, e "Restaurar original" some depois do refetch. É o fluxo
que o plano 41 escolheu como ativação do trial.

**O-4 · Cache de sub-receita não acompanha edições (alto).**
Editar a quantidade do marcador de sub-receita (`ReceitaAberta.jsx:716`) não reescala os
filhos de cache: o custo continua igual com `completo=true` e o rendimento muda. Editar a
receita de origem só ressincroniza por uma function admin. `replaceWithSubreceita` aceita
a própria receita (auto-referência).

**O-5 · O cache `['ingredientes']` cai para 500 itens depois de uma ação comum (alto).**
`EditItemDialog.jsx:22` usa `Ingrediente.list('-nome', 500)` com a mesma `queryKey` que
14 telas preenchem com `fetchAllPages`. Salvar um preço pelo diálogo refaz a lista com
500 de 663 ingredientes, e o cache fica assim pelo resto da sessão
(`refetchOnMount:false`). Reproduzido: a Ficha de Custos caiu de R$ 38,49 para R$ 11,22
sem nenhum aviso. A lista de compras do evento descarta o item (`EventoListaCompras.jsx:153`).

**O-6 · Não há backup verificado dos dados de produção (alto).**
`docs/25` continua "NÃO ENCONTRADOS". Pela documentação pública do Base44, o Backup &
Restore existe só nos planos Elite/Enterprise e **não cobre usuários nem arquivos**, e é
em `User` que ficam plano, status, validade e dados fiscais. O único export
(`exportarFaseAMigracao`) cobre só o catálogo, é manual e fica dentro do próprio Base44.

**O-7 · Rotinas em lote gravam por padrão, sem prévia e sem journal (médio).**
Das 28 rotinas de mutação em lote avaliadas, só 5 simulam por padrão e 12 não gravam log.
Várias one-shot continuam publicadas; um `POST {}` ou o botão da aba padrão de
Auditorias reescreve dados de todos os clientes. Achados relacionados:
- `corrigirPorcoesBaseImportacao` lê só 5.000 linhas de composição e pode gravar rendimento 0;
- a fusão de ingredientes é irreversível e soma ml com g;
- a exclusão de ingrediente com verificação falha apaga a composição em receitas de todos.

**O-8 · A exclusão de usuário (16/09) inverte a regra de retenção (médio, vários ângulos).**
`excluirUsuarioAdmin`:
- apaga `Pagamento` pendente, contestado ou com estorno parcial e `PedidoDesistencia`, que
  são prova em chargeback e registro de guarda obrigatória;
- apaga receitas e cardápios por `created_by_id` sem filtrar `is_base`, o que atinge o
  catálogo se a conta for ou já tiver sido admin;
- deixa dados pessoais em cerca de 15 entidades (Laboratório de Custos, preços pessoais,
  tags, etc.).
**Até a correção, não usar "Excluir selecionados".**

**O-9 · Atualização semanal de preços por IA grava no catálogo global sem teto nem revisão (médio).**
Aceita −99%, +900% e valor negativo. Sobrescreve preço curado manualmente e não marca
`preco_estimado`. Se interrompida, deixa preços novos com caches de custo antigos e só
tenta de novo 6 dias depois. Afeta o preço de referência de todos os usuários sem preço
pessoal.

**O-10 · CI vermelho: três falhas empilhadas, todas triviais (processo).**

| Falha | Origem | Correção mínima |
|---|---|---|
| `lint`: `ORIGEM_CADASTRO_LABEL` sem uso em `src/components/admin/UsuariosTable.jsx:13` | `a45f2119` (16/09) | Remover o import |
| `test:security`: `scripts/test-auth-routing.mjs:93` | `cd0ec1bd` (15/09) fez `validarReturnToInterno` validar só o caminho e aceitar qualquer query, para comportar o parâmetro `volta` do Guia ZR. O `returnTo` continua sanitizado por `safeReturnTo` e **não** é explorável por esse caminho | Restringir a exceção ao parâmetro `volta` e alinhar o teste; incluir `test-entrar-no-guia.mjs` no `test:security` |
| `audit:security`: js-yaml 4.3.1 (high, só dev, via eslint) | Alerta publicado entre 07 e 09/09 | `npm update @eslint/eslintrc` (só o lockfile) |

Como o gate encadeia com `&&`, só a primeira falha aparece. Os runs são disparados pelo
bot, então **nenhuma pessoa é notificada**. Fora do gate há mais 4 scripts quebrados
(eram 2 em 06/09): `test:cost-lab` (alias `@/` e asserções obsoletas),
`test-trial-7-em-30`, `test-checkout-laboratorio-custos` e `test-estorno-automatico`. Os
dois últimos quebraram por asserções de texto obsoletas, não por regressão.

### 3.3 Produto e conversão

- **P-1 · O overlay "Abra em um navegador" bloqueia a landing e o cadastro para Instagram, Facebook/Meta Ads, WhatsApp, LinkedIn e Outlook (alto).**
  O script de `index.html:94-123` roda em qualquer rota e não tem botão de fechar. Só o
  login com Google precisa de navegador externo; e-mail + senha + OTP funcionam em
  webview. Hoje a métrica landing → cadastro (meta > 25%) mediria o bloqueio.
- **P-2 · Laboratório de Custos prometido e inacessível para quem paga.**
  O trial e a landing oferecem "Cozinha + Custos". Quem converte só para a base perde o
  Custos e não encontra onde comprá-lo: nenhum chamador passa `addon` ao
  `CheckoutDialog`, e `CustosBloqueado` ainda é "prévia de homologação" com preços fixos
  no código. O PR #46 põe "custos e formação de preço" no escopo da Cozinha. **É preciso
  decidir.**
- **P-3 · O motor de conversão está pronto e desligado.**
  - Templates de onboarding em rascunho; oferta de 48 h em 0%.
  - Os e-mails não têm nenhum link ou CTA.
  - O texto padrão da véspera diz que o anual "sai por menos da metade do mensal", o que
    é falso (55%).
  - A reativação D+3/D+7 sai **sem** template ativo, enquanto o painel mostra "Rascunho".
- **P-4 · O funil não é mensurável.**
  - Das 13 métricas dos docs 40/41, só uma tem fonte confiável e completa
    (`trial_dias_uso`).
  - Não há captura de UTM, referrer nem código de parceria.
  - `origem_cadastro` é sobrescrita a cada novo aceite de termos.
  - O checklist de primeiros passos confere as entidades erradas.
  - O card de conversão soma contas e compras de teste, sem coorte.
- **P-5 · O checkout pede 8 campos fiscais (endereço completo) antes de pagar R$ 29,90.**
  Não há busca de CEP, o telefone é pedido de novo e não existe medição de abandono.
  Os planos oferecem de 1x a 12x sem mostrar parcela, juros ou total (CDC art. 52).
  Um cartão "em processamento" deixa o cliente num spinner sem fim em `/comprar-zr`.
- **P-6 · Termos e Política de 18/08 não descrevem o que é vendido e coletado desde 12/09**
  (Guia ZR, Laboratório de Custos, dados fiscais, comunicações promocionais), mas são
  aceitos em todo checkout. As comunicações promocionais não têm opt-out.
- **P-7 · Orçamento: a correção do crítico de 06/09 ficou incompleta.**
  `parsePrecoBR` lê "2.000" (milhar sem centavos) como R$ 2,00 e grava esse valor.

---

## 4. Revisão de 06/09: o que aconteceu

| Conjunto rechecado | Itens | Corrigidos | Parciais | Abertos | Refutados |
|---|---:|---:|---:|---:|---:|
| Anexo A — confirmados (altos) | 9 | 0 | 0 | **9** | 0 |
| Anexo A — confirmados (médios) | 54 | 1 | 0 | 53 | 0 |
| Anexo A — confirmados (baixos) | 57 | 4 | 1 | 52 | 0 |
| Anexo B — não verificados (críticos) | 2 | 2 | 0 | 0 | 0 |
| Anexo B — não verificados (altos) | 20 | 0 | 0 | **20** (agora confirmados) | 0 |
| Anexo B — não verificados (médios) | 49 | 0 | 1 | 43 | 5 |
| **Total** | **191** | **7** | **2** | **177** | **5** |

**Corrigidos:**
- orçamento ≥ R$ 1.000 zerado, nos dois críticos (`0ef27820`, 11/09); a correção ainda é
  incompleta, ver P-7;
- neutralização de `homologarMercadoPagoCustosSandbox` (`e1eab06b`, 24/09);
- e-mail do pagador lido do usuário autenticado (`2aaf3a0b`);
- replay de estorno pelo ramo idempotente (`8ce9be8d`);
- campos de endereço no schema de `User` (`f7975cde`).

**Parciais:** compra do add-on sem plano base; exclusão de usuário, que foi para o servidor
mas com os defeitos de O-8.

**Os 29 altos que seguem abertos** incluem, além de `S-01`, `S-15` e `S-16`:
- composição lida com o limite padrão de 50 linhas;
- `refetchOnMount:false` global;
- duplicação que não remapeia `subreceita_parent_id`;
- `EditReceitaDialog` sobrescrevendo a linhagem da cópia pessoal;
- importação com IA que aborta para usuário comum;
- exclusão de receita sem cascata;
- relatórios do evento com só 500 receitas;
- buffet passando kg como g ao motor;
- ativar o trial do Custos devolvendo o usuário à tela de bloqueio;
- rotinas de conversão e fusão que reescrevem dados de todos os usuários;
- editar template de e-mail desligando o envio em silêncio;
- `CHECK margin_pct >= 0` no schema Supabase.

A lista completa, com a evidência atual de cada item, está no Anexo B. Os itens de
segurança estão no relatório privado.

---

## 5. Plano 41 e go-live: onde estamos

**Plano 41 (hoje = semana 3 de 12).** Código adiantado; ativação e medição atrasadas; foco
desalinhado.

| Item do doc 41 | Status real |
|---|---|
| 2.1–2.4 (webhook, liberação síncrona, `order.refunded`, `detalhe_erro`) | Código feito. **Nenhum aceite registrado.** A janela de 7 dias recomeça a cada mudança no webhook (a última foi em 24/09). Não há evidência de 1 compra real aprovada de ponta a ponta |
| 2.5 Orçamento | Feito e testado; incompleto para "2.000" (P-7) |
| 2.6 Catálogo | Fora de escopo por decisão da Carmen, mas **ainda exigido no aceite P0 da §8**. É um gate impossível |
| 2.7 OAuth Google | Parcial: só a mensagem de fallback |
| 2.8 Latência | Feito |
| 2.9 Migração | Parada. Cutover na semana 11 inviável |
| 3.3 E-mails de onboarding | Código feito e **inerte** (templates em rascunho, sem links) |
| 3.4 Banner/checklist/aviso de escala | Feitos; o checklist mede errado e o aviso após o 1º orçamento não foi feito |
| 4.1 Oferta 48 h | Código feito, **desligada** (0%) |
| 4.3 Reativação | Código feito; os e-mails saem sem aprovação e o WhatsApp exige template + `WASCRIPT_MODO_TESTE=false` |
| 4.4 Rastreabilidade | Card de origem na Home (não no cadastro); cupom não feito; card de conversão com métrica distorcida |
| 5.x Cupom, parcerias, conteúdo, mídia | Não iniciado ou sem evidência no repositório |

**GO-LIVE de 23/08:**

| Bloqueador | Status |
|---|---|
| §2 Build pública defasada | **Resolvido na prática**: `test-production-routes` passa hoje, mas isso não foi registrado |
| §6 Mercado Pago 8/8 na revisão atual | **Continua bloqueando.** O código foi de v10/webhook-v4 para v30/webhook-v10, com mais 8 commits de comportamento sem troca de `VERSAO_CODIGO`, e o escopo cresceu (ZR, renovação, estorno parcial, contestação, desistência, PIX expirado) |
| §7 P0 humanos (preflight, usuário × admin, cadastro + trial, ativa × expirada, OAuth humano, Security Check Base44, regressão pós-publicação) | Sem nenhum registro |
| §1 Gate técnico | **Regrediu**: lint, `test:security` e `audit:security` falham, logo `release:check` falha |
| §8 Renovação "Em breve" | Hoje é vendida, então passa a ser escopo P0 do E2E |

**Status oficial: NO-GO. Status de fato: em operação comercial.** Não existe documento de GO
atualizado.

---

## 6. Princípios para as próximas semanas

1. **Congelar funcionalidade nova por duas semanas.** A exceção é o lançamento do Guia ZR,
   e ele sai com as correções da Fase 0.
2. **Nada é publicado com CI vermelho.** O Publish do Base44 não depende do CI, então a
   regra precisa ser combinada e instrumentada (E0-1).
3. **Toda correção em dinheiro, acesso ou job vem com um teste que executa o código**, não
   com uma asserção de texto.
4. **Ativar antes de construir, medir antes de comprar mídia.** A "regra de ouro" do doc 41
   continua valendo, com um gate possível de cumprir (§7.4).
5. **Migração Supabase congelada** até um gatilho objetivo (§7.3, C1-6).

---

## 7. Plano de ação

### 7.1 Fase 0 — até quinta, 01/10 (antes do lançamento do Guia ZR)

**Engenharia**

| # | Ação | Esforço | Critério de aceite |
|---|---|---|---|
| E0-1 | **CI verde e visível.** Três correções de O-10, num único commit. No `quality.yml`: step `if: failure() && github.ref == 'refs/heads/main'` que abre ou atualiza a issue "CI vermelho na main" atribuída a Bruno e Carmen (`permissions: issues: write`) e `TZ: America/Sao_Paulo`. No `AGENTS.md`: seção "Antes de concluir" (rodar `npm run ci:check`, não concluir com vermelho, mensagem de commit descritiva) | P | `ci:check` verde na `main`; um vermelho forçado numa branch de teste abre a issue |
| E0-2 | **`S-01`** + teste comportamental (todos os caminhos de estorno → sem acesso, no servidor e no cliente) + script de auditoria em produção dos usuários afetados | P | Teste no `test:security`; lista de usuários afetados entregue à Carmen |
| E0-3 | **`S-02` e `S-03`**, conforme a regra definida em C0-3 | M | Teste para cada caso; oferta indevida responde 409 |
| E0-4 | **`S-04`** + conferência da resposta do provedor. Testar no sandbox a mesma chave com outro corpo | P | Teste com `fetch` stub; resultado do sandbox registrado |
| E0-5 | **`S-08`, `S-09` e `S-17`** | P | Chamadas não autorizadas recusadas; testes estáticos de guard |
| E0-6 | **`S-05` e `S-06`**, incluindo a limpeza do estado residual nos navegadores já afetados | P | Testes de cenário no `test:security` (entrar sem "manter", fechar, reabrir; sair e recarregar) |
| E0-7 | **Jobs (O-1, O-2).** Fallback em `enviarPlanoVencendo:64` e `try/catch` por usuário. Alinhar janela × cron numa única fonte de agenda e remover as automations legadas dos `function.jsonc`. Reescrever `test-scheduled-functions` para ler `base44/workflows` e cruzar cron × janela. **Antes** de religar o lembrete de PIX: encerrar os pendentes antigos (simular → aplicar) e limitar o lembrete a pendências de 3–10 dias sem pagamento aprovado posterior | P | Teste cruzando cron × janela verde; 1 execução real de cada job com envio registrado em `LogEmail` |
| E0-8 | **Overlay de navegador interno (P-1)** só no fluxo Google de `/login` e `/register`, como faixa que pode ser fechada. Evento `navegador_interno` | P | Landing, `/produto` e `/register` abrem com o user agent do Instagram |
| E0-9 | **Contenção de O-8:** `excluirUsuarioAdmin` deixa de apagar `Pagamento`/`PedidoDesistencia` e conteúdo `is_base`, e recusa conta admin no servidor | P | Teste estático da cascata; conta admin → 409 |
| E0-10 | **Contenção de O-7 e O-9:** HTTP 410 nas rotinas one-shot já executadas; "Normalizar metadados" e "Preencher per capita" simulam primeiro; atualização semanal de preços pausada ou com guarda (preço ≤ 0 rejeitado, variação acima de ±40% vai para revisão, preço "Manual" preservado) | P | Nenhuma rotina de lote grava com corpo vazio |

**Carmen**

| # | Ação | Tempo |
|---|---|---|
| C0-1 | **Confirmar se os jobs estão parados.** Em `ConfiguracaoSistema`, ler `automation_last_started:*` de `enviarTrialExpirando`, `enviarTrialVencido`, `enviarPlanoVencendo` e `enviarLembretePendencia`; contar em `LogEmail` os tipos `trial_expirando`, `trial_vencido`, `plano_vencendo` e `pagamento_pendente_lembrete` desde 09/09. Decidir o horário desejado (08:00 ou 09:00 BRT) | 10 min |
| C0-2 | **Backup manual hoje.** Confirmar o plano Base44. Exportar todas as entidades **e `User`** (Dashboard → Data → Export), cifrar e guardar em dois lugares fora do Base44, com sha256. Registrar data, escopo e local em `docs/25` | 1 h |
| C0-3 | **Regras comerciais do Guia ZR** para desistência, renovação e upgrade (perguntas objetivas em `S-02`/`S-03` no relatório privado) | 30 min |
| C0-4 | **Guia ZR na Vercel:** conferir os itens `Z-01…Z-07` do relatório privado. O primeiro é confirmar a variável de modo de acesso em Production e em Preview | 30 min |
| C0-5 | **Parcelamento:** confirmar no Mercado Pago quem paga os juros e até quantas parcelas. Até lá, limitar o mensal a 1x e o anual às parcelas sem juros | 15 min |
| C0-6 | **Visibilidade do repositório:** avaliar torná-lo privado (conferir antes se a integração GitHub do Base44 aceita) ou manter público de forma consciente, sem publicar detalhes de segurança antes da correção | 15 min |
| C0-7 | **Projeto Supabase piloto (`S-19`):** decidir o destino (ver relatório privado) e revogar ou reduzir o conector no Base44 | 30 min |

**Gate A (fim da Fase 0):**
- CI verde há pelo menos 3 dias úteis;
- `S-01…S-06` corrigidos, cada um com teste;
- os 6 jobs diários enviando (conferido em `LogEmail`);
- 1 backup completo fora do Base44.

### 7.2 Fase 1 — até sexta, 16/10 (estabilizar e ativar)

**Engenharia**

| # | Ação | Esforço |
|---|---|---|
| E1-1 | **Escalador (O-3).** A escala fica só visual por padrão (o stepper não grava nem cria cópia); "Salvar esta escala" explícito aplica um fator único à composição e ao PDP; teste de invariante (pré-preparo/PDP constante). Diagnóstico somente leitura das receitas com \|porções×PC−PDP\|/PDP > 5% e das alteradas pelo escalador desde 11/09 | M |
| E1-2 | **Números pt-BR.** `parsePrecoBR` aceita "2.000" (P-7); um `parseNumeroBR` único substitui os mais de 20 `replace(',', '.')` do domínio (importação por texto lê "1.500 g" como 1,5 g); tabela de casos no `test:orcamento` | M |
| E1-3 | **Cache e truncamento (O-5).** `fetchAllPages` em `EditItemDialog` e `NovaReceitaIA`; a Ficha de Custos avisa quando o custo está incompleto; a lista do evento mostra o item "não encontrado" em vez de descartá-lo; teste estático contra a mesma `queryKey` com `queryFn` diferentes | P |
| E1-4 | **Rede de testes.** Node 22 (issue #40) e um loader de teste que troca `npm:`, `jsr:`, `base44:runtime` e o alias `@/` (já provado: 120/120 módulos do backend importam). Os 5 testes de maior retorno: (1) `webhookMercadoPago` executado; (2) matriz pagamento → acesso, servidor e cliente com o mesmo fixture; (3) `criarPagamentoMercadoPago` com `fetch` stub para todas as composições; (4) golden tests dos motores de receita; (5) dinheiro e datas pt-BR em `TZ=America/Sao_Paulo`. Scripts órfãos entram no gate ou são aposentados, e um meta-teste falha se um `scripts/test-*.mjs` ficar fora de todo gate. `test:cost-lab` consertado | M |
| E1-5 | **Pagamentos.** Função única de transição de status (`aplicarTransicaoPagamento`) usada pelo webhook, reprocessamento, desistência, comprovante e encerramento de PIX; revogação de todas as cópias por `referencia_pagamento_id`; e-mail de aprovação do ZR deduplicado; prazo de arrependimento contado da aprovação (validar com o jurídico); teste que obriga a trocar `VERSAO_CODIGO` quando o arquivo muda | M |
| E1-6 | **RLS:** `S-15`, `S-16`, `S-18`; teste estático de guard para as 78 functions (lista explícita das públicas); `test-rls-children` estendido para FLS | M |
| E1-7 | **Checkout.** Acompanhar o cartão pendente (hook comum com o `PixForm`); em erro 5xx ou de rede, "não pague de novo" e consulta do pagamento antes de nova tentativa; o diálogo não fecha durante o pagamento; falhas do lado do cliente (SDK, device ID, tokenização) registradas no servidor | M |
| E1-8 | **Instrumentação mínima do funil (P-4)**, cerca de 3,5 dias: `src/lib/atribuicao.js` (UTM, `ref`, referrer, landing, propagados para `app.*/register` e gravados uma única vez no `User`); `origem_cadastro` gravado uma única vez; marcos de ativação persistidos no servidor (`primeira_escala_em`, `primeiro_orcamento_em`); checklist corrigido; card "Funil por coorte semanal" sem contas nem compras de teste; CTA com UTM e `resend_id` nos e-mails | M |
| E1-9 | **Motor de conversão (P-3):** corrigir o texto "menos da metade"; CTA em todos os templates; reativação só com template ativo e só para `plano_atual === 'trial'`; painéis de status coerentes | P |
| E1-10 | **Observabilidade:** card "Jobs" na Saúde operacional (última execução, resultado, ignorado/erro) e job sentinela diário que avisa o admin (job sem rodar há mais de 26 h, 500, falhas de e-mail/WhatsApp, PIX aprovado sem liberação); corrigir os alarmes falsos dos cards atuais | M |
| E1-11 | **IA (`S-07`):** HelpPanel numa function com assinatura ativa, limite de entrada, modelo fixo e cota diária; nas rotas liberadas sem assinatura, só FAQ | P |
| E1-12 | **Bundle:** `Landing` lazy em `LandingOrRedirect.jsx` (medido: entry de 625,9 → 516,8 KB, gzip de 237 → 165 KB); imagens base64 da landing viram `.webp`; jspdf e geradores de PDF carregados por `import()` no clique; limite do entry no `test-build-budget` baixado para cerca de 530 KB | P |
| E1-13 | **Dependabot:** fechar #5, #25, #27 e #32; remover `recharts`, `date-fns`, `react-day-picker` e os componentes shadcn sem uso; no `dependabot.yml`, ignorar majors do npm, adicionar `github-actions` e ativar security updates | P |
| E1-14 | **`S-10`, `S-11` e `S-12`** | M |

**Carmen**

| # | Ação |
|---|---|
| C1-1 | **Ligar o motor de conversão** depois de E1-8 e E1-9: revisar e ativar os templates (onboarding dia 2, dia 5, véspera; reativação D+3/D+7) e definir o percentual da oferta de 48 h |
| C1-2 | **Conversar pessoalmente, por WhatsApp, com os 8 trials e o vencido.** Anotar objeções (preço, Custos, checkout) e pedir depoimentos. Com 10 usuários, venda consultiva converte mais que automação |
| C1-3 | **Decidir o Laboratório de Custos (P-2):** add-on pago (R$ 8,90 / R$ 87) ou incluso na Cozinha; se o trial continua liberando o Custos para todos; data-alvo de venda. Registrar em `CONTEXT.md` e conciliar com o PR #46 |
| C1-4 | **Nova versão de Termos e Política (P-6):** trial 7-em-30, Guia ZR, Custos, dados fiscais, comunicações promocionais com descadastro, base legal. Trocar as constantes de versão para forçar novo aceite |
| C1-5 | **Donos das contas** em `docs/29`: Base44 (workspace, app, Publish), Mercado Pago, Resend, Wascript, registrador e DNS dos três domínios, Google OAuth, GitHub, Supabase, Vercel. Segundo admin e 2FA onde faltar |
| C1-6 | **Congelar formalmente a migração** na v1.2 do doc 41: sai o "cutover na semana 11", entra um gate de retomada com gatilhos objetivos (30 ou mais pagantes ou MRR de R$ 1.000 ou mais; limite ou custo do Base44 que atrapalhe o negócio; incidente de plataforma; decisão de consolidar com a plataforma do Guia ZR) |
| C1-7 | **Go-live de verdade:** congelar o código de pagamento, executar o E2E financeiro ampliado (8 cenários + renovação, Guia ZR, estorno parcial, desistência, PIX expirado) e publicar `docs/go-live/GO_LIVE_DECISION_2026-10-xx.md` com GO ou NO-GO assinado |
| C1-8 | **Perguntas à Base44** (§8.2) |

**Gate B (fim da Fase 1):**
- nenhum P0 aberto;
- decisão de go-live reemitida;
- funil instrumentado, com o card de coorte mostrando números;
- templates de conversão ativos;
- decisão sobre o Laboratório de Custos registrada.

### 7.3 Fase 2 — até 18/12 (fundações)

| # | Ação | Esforço |
|---|---|---|
| E2-1 | **Backup semanal automatizado:** function + workflow que pagina todas as entidades (inclusive `User`) com datas cruas em UTC, gera JSONL + manifesto + sha256, cifra e envia para um bucket versionado fora do Base44, na organização da empresa; alerta se passar de 8 dias sem export; restauração mensal de teste | M |
| E2-2 | **Rotinas em lote reversíveis:** entidade `JournalMutacaoLote` (só leitura para admin) + helper `shared/journalLote.ts` + `desfazerExecucao`; dry-run obrigatório com assinatura, como nas curadorias; teste estático que exige `modo='simular'`; soft delete com quarentena de 30 dias para exclusão de usuário e fusão de ingredientes | G |
| E2-3 | **Altos de 06/09 do domínio:** composição via `fetchAllFilteredPages`; `refetchOnMount`; duplicação com remapeamento; linhagem no `EditReceitaDialog`; exclusão em cascata; importação com IA para usuário comum; buffet kg×g; relatórios do evento; per capita unificado; ressincronização de sub-receita restrita ao dono | G |
| E2-4 | **Camada de IA no servidor:** functions por caso de uso, com assinatura ativa, prompt e modelo fixos, cota por usuário/dia/plano (entidade `UsoIA`) e registro de consumo; preços da IA como sugestão com aprovação | G |
| E2-5 | **Checkout:** Secure Fields do MercadoPago.js (`S-13`, volta ao SAQ A); sandbox por conta em vez de alternar a secret global; parcelamento dinâmico com juros visíveis para todos os planos; CSP (`S-14`) | M |
| E2-6 | **Laboratório de Custos pronto para venda** (se C1-3 decidir vender): renovação que soma dias; caminho de compra; preço sugerido com o custo de comercialização; ficha com premissas e itens; preflight reescrito + runbook de GO; e-mails do ciclo de vida | G |
| E2-7 | **Aquisição:** entidade `Cupom` reaproveitando o `ref`; depoimentos reais na landing; `robots.txt`, `sitemap.xml`, canonical e `og:image`; mídia paga só depois do Gate C | M |
| E2-8 | **Paginação por cursor:** `fetchAllPages` v2 com o cursor do SDK 0.8.51 e erro explícito ao atingir o limite; `listarTodos` em `base44/shared`; lint contra `.list(N)`/`.filter(N)` em entidades de catálogo. **Antes, medir o teto real por requisição** (hoje o repositório afirma 500 e 5.000 em lugares diferentes) | M |
| E2-9 | **LGPD da exclusão:** anonimizar os registros financeiros em vez de apagar; cascata completa, com teste cruzando `base44/entities` × cascata; retenção definida para as entidades novas | M |
| E2-10 | **Documentação:** regras comerciais em `docs/business-rules` (pagamentos, desistência, acesso); `CONTEXT.md` com Guia ZR, trial 7-em-30, desistência e oferta; cabeçalho "CONGELADO" nos docs 17–38; check de CI que falha quando uma function nova não aparece na documentação | M |
| E2-11 | **Upgrades major em ordem segura:** dnd 18 (#43) → React 19 → lucide 1.x → Vite 8 + plugin-react 6 (depois de confirmar o `@base44/vite-plugin`) → Tailwind 4 → TypeScript 7 | G |

**Gate C (antes de qualquer real em mídia paga):**
- Gate B cumprido;
- 30 dias sem P0 novo;
- conversão medida por coorte com números absolutos;
- Termos e Política atualizados;
- decisão sobre medir com UTM + Gerenciador de Anúncios ou com Pixel e consentimento.

### 7.4 Backlog (P3)

- Refatorar `ReceitaAberta.jsx` (1.676 linhas), extraindo `useEscalaReceita` e `useComposicaoReceita`.
- Unificar os toasts (sonner × use-toast; hoje há dois Toasters montados).
- Apagar os componentes shadcn sem import e as 18 entidades de sondagem.
- Remover os stubs 410 de homologação quando sumirem do log.
- Avaliar migrar o WhatsApp do Wascript para a API oficial, com número separado do suporte.
- **Na retomada da migração:** ADR de runtime (Supabase Edge Functions/Deno reaproveita as 78 functions); abordagem "shim primeiro" (camada compatível com `base44.entities` sobre Postgres); contrato de identidade independente do Base44 para o Guia ZR; runbooks simplificados para a escala real.

---

## 8. Decisões e informações que dependem da Carmen

### 8.1 Decisões de produto e negócio

1. O Laboratório de Custos é add-on pago ou parte da Cozinha? O trial continua liberando o Custos? (C1-3)
2. Regras comerciais do Guia ZR para desistência, renovação e upgrade. (C0-3)
3. O escalador deve alterar a receita salva ou ser só visualização, com "Salvar como nova versão"? Em receita do catálogo, escalar cria cópia pessoal?
4. O que `porcoes_base` significa: rendimento em porções ou PDP/PC? Pode-se normalizar as receitas importadas, que nascem com 1?
5. Definição oficial de "ativação" (escalar, 1º orçamento ou checklist) e da janela de 48 h.
6. O que conta como conversão: cortesia manual? compra só do ZR ou só do Custos?
7. Base legal das comunicações promocionais (legítimo interesse com opt-out ou consentimento) e prazo de guarda de pagamentos e pedidos de desistência após um pedido de exclusão.
8. Marca: "Nutrimenu — Laboratório de Cozinha" (PR #46) ou "Plataforma ZR" (UI atual)?
9. O contador confirma que a NFS-e exige endereço completo do tomador pessoa física? Se não exigir, o endereço pode ser opcional.
10. Quem recebe os alertas operacionais (CI vermelho, jobs, pagamentos) e por qual canal?

### 8.2 Perguntas à Base44 (suporte)

1. Plano atual do app, consumo mensal de créditos de integração e se functions e webhooks param quando a cota zera.
2. Se os endpoints de integração (IA, upload) podem ser restritos ao backend (service role).
3. Se o logout revoga o JWT no servidor e qual é a validade do token.
4. Configuração de ambiente do build de produção e dependências do editor/prévia no domínio próprio (perguntas objetivas em `S-06`).
5. Se o domínio próprio envia `X-Frame-Options`/`frame-ancestors` e se dá para configurar cabeçalhos HTTP.
6. Se a integração GitHub pode sincronizar com uma branch diferente da `main` ou abrir PR.
7. Qual é a agenda efetiva hoje: `base44/workflows` ou as automations dos `function.jsonc`? As duas coexistem?
8. Teto real de registros por requisição de `list`/`filter` no navegador e nas functions.

---

## 9. Processo de engenharia

| Mudança | Por quê | Esforço |
|---|---|---|
| Seção "Antes de concluir" no `AGENTS.md`: `npm run ci:check` verde, mensagem de commit descritiva e nenhum commit de pagamento sem trocar `VERSAO_CODIGO` | 65% dos commits vêm de agentes externos que leem o `AGENTS.md`; é a alavanca mais barata | P |
| Issue automática "CI vermelho na main" (E0-1) | Os runs são disparados pelo bot e ninguém é notificado | P |
| Regra combinada: **não publicar no Base44 com CI vermelho** | O Publish não depende do CI | — |
| Ruleset na `main`: PRs humanos (Bruno, Codex, Claude Code) exigem o check `quality`; bypass só para o app `base44-builder` enquanto a sincronização exigir push direto | Protege sem travar o editor | P |
| Áreas sensíveis (`base44/functions` de pagamento/acesso, `base44/entities`, `base44/workflows`, auth, `index.html`) passam por PR curto com checklist de autorização | Todas as brechas novas desta análise entraram por commit direto | — |
| 30 minutos por semana de "saúde": triagem de CI, Dependabot e alertas | O Dependabot ficou travado 3 semanas sem ninguém notar | — |
| Repositório do Guia ZR: `main` protegida com check que builda em modo servidor e verifica o paywall; promoção manual até o lançamento | Um PR marcado "NOT READY" chegou à produção | M |

---

## 10. Acompanhamento

| Indicador | Fonte | Meta |
|---|---|---|
| CI da `main` verde | GitHub Actions | 100% dos dias úteis a partir do Gate A |
| P0 abertos | Este documento / issues | 0 no Gate B |
| Jobs diários executados com envio | `LogEmail` por tipo + card Jobs | 6 de 6 por dia |
| Backup mais recente | `docs/25` / alerta | ≤ 8 dias |
| Trials novos por semana | Card de coorte | Base para a meta do doc 40 (~33/mês para 10 pagantes em 90 dias a 10%) |
| Ativação em 48 h | Marco persistido | > 60% |
| Conversão trial → pago por coorte | Card de coorte (sem teste) | > 10% |

**Revisão:** semanal (30 min) até o Gate B; depois, mensal junto com o doc 41. Atualizar este
documento a cada gate.

---

## Anexo A — Achados médios e baixos confirmados (não sensíveis)

Críticos e altos estão no corpo do documento (§3). Achados de segurança, do repositório do Guia ZR e de dados pessoais ficam só no relatório privado. Cada linha passou por verificação adversarial; há duplicatas entre áreas quando o mesmo problema foi visto por ângulos diferentes.

| Sev. | Área | Achado | Local | Esf. | Resp. |
|---|---|---|---|---|---|
| Médio | Autenticação | registrarAceiteTermos sobrescreve origem_cadastro a cada novo aceite; na próxima versão dos Termos todo usuário 'guia_zr' vira 'laboratorio_cozinha' | `base44/functions/registrarAceiteTermos/entry.ts:42` | P | engenharia |
| Médio | Autenticação | excluirUsuarioAdmin apaga pagamentos contestados, com estorno parcial ou pendentes e o PedidoDesistencia, e deixa dados pessoais em 15 entidades | `base44/functions/excluirUsuarioAdmin/entry.ts:40` | M | engenharia |
| Médio | Automações | Exclusão de usuário (16/09) inverte a regra: apaga Pagamento contestado, estornado ou pendente e PedidoDesistencia, e deixa órfãos despesas, preços e fichas do titular | `base44/functions/excluirUsuarioAdmin/entry.ts:68` | M | engenharia |
| Médio | Automações | Reativação de trial (12/09): e-mail D+3/D+7 sai sem template ativo enquanto o painel mostra 'Rascunho', mira a data errada para quem esgotou os 7 dias e diz 'seu teste terminou' a ex-assinante; no WhatsApp o painel erra no sentido inverso | `base44/functions/enviarReativacaoTrial/entry.ts:91` | P | engenharia |
| Médio | Automações | E-mails de onboarding, reativação e campanha e o WhatsApp de reativação são promocionais, mas não têm finalidade declarada na Política de Privacidade nem opt-out que o sistema respeite | `src/pages/Privacidade.jsx:20` | M | carmen |
| Médio | Automações | Falhas de jobs e canais morrem em silêncio: nenhum painel mostra execução de job, WhatsApp ou PIX pago sem liberação, e a Saúde operacional dá alarmes falsos | `src/lib/saudeOperacional.js:16` | M | engenharia |
| Médio | Domínio cozinha | Correção incompleta do crítico 1.1: orçamento lê "2.000" como R$ 2,00 e grava | `src/lib/precoOrcamento.js:11` | P | engenharia |
| Médio | Domínio cozinha | Per capita resolvido de quatro formas: Refeição ignora o PC da receita e PerCapitaUsuario só vale na Ficha Técnica | `src/pages/CardapioAberto.jsx:308` | M | engenharia |
| Médio | Domínio cozinha | Checklist e aviso do trial (novos em 11/09) medem a coisa errada: passo 2 conta Cardápios semanais e o aviso de escala some sozinho | `src/pages/Home.jsx:90` | P | engenharia |
| Médio | Domínio cozinha | Importar receita por texto lê "1.500" g como 1,5 g e grava porcoes_base=1 | `base44/functions/analisarReceitaTexto/entry.ts:96` | P | engenharia |
| Médio | Laboratório de Custos | Ao liberar a venda, renovar o add-on cancela o período pago vigente e reinicia a contagem; o estorno da renovação zera o acesso | `base44/shared/ativarCompraPagamento.ts:49` | M | engenharia |
| Médio | Laboratório de Custos | Não há caminho de compra do add-on no produto; a tela de oferta ainda é 'prévia de homologação', com preços fixos no código | `src/pages/CustosBloqueado.jsx:54` | M | engenharia |
| Médio | Laboratório de Custos | O preço sugerido padrão (modo direto) ignora o custo de comercialização ativado; com os valores de fábrica o lucro real é zero | `src/pages/CustosCalcular.jsx:247` | P | engenharia |
| Médio | Laboratório de Custos | A ficha de custo não guarda premissas nem itens individuais: o histórico é imutável, mas não auditável | `src/pages/CustosCalcular.jsx:398` | M | engenharia |
| Médio | Laboratório de Custos | A exclusão de usuário (função nova) apaga as fichas, mas deixa itens, despesas e configurações do Laboratório de Custos | `base44/functions/excluirUsuarioAdmin/entry.ts:110` | P | engenharia |
| Médio | Engenharia | Main vermelha há 16 dias: 3 falhas empilhadas no ci:check, todas triviais, e ninguém é notificado | `package.json:32` | P | engenharia |
| Médio | Engenharia | Scripts fora do gate: agora 4 quebrados (eram 2 em 06/09) e 6 passando que não protegem nada | `scripts/test-estorno-automatico.mjs:31` | M | engenharia |
| Médio | Engenharia | test-scheduled-functions valida as automações legadas de function.jsonc e ignora base44/workflows, a fonte real desde 09/09 | `scripts/test-scheduled-functions.mjs:5` | P | engenharia |
| Médio | Engenharia | A regra anti-'UTC sem Z' não alcança src/lib (8 violações), e isso quebra a janela de carência de recém-cadastrados no Brasil; mais grave que o item de escopo do ESLint da revisão | `src/lib/acessoAssinatura.js:77` | P | engenharia |
| Médio | Engenharia | Entry de 626 KB: 82,5 KB são duas imagens base64 da landing, baixadas até por quem usa o app logado; a Landing lazy tira 17% (30% no gzip) | `src/components/LandingOrRedirect.jsx:4` | P | engenharia |
| Médio | Engenharia | Fluxo de dinheiro com ~830 linhas novas em 47 commits sem nenhum teste que execute o código; as correções dos 2 críticos de 06/09 ficaram sem teste de regressão | `scripts/test-orcamento-evento.mjs:5` | M | engenharia |
| Médio | Engenharia | Commits direto na main sem gate, sem descrição e sem instrução de teste para os agentes: 157 de 240 são 'External agent changes' | `AGENTS.md:1` | P | carmen |
| Médio | Listas e cache | corrigirPorcoesBaseImportacao lê só as 5.000 linhas mais recentes de IngredienteReceita e grava rendimento 0 nas receitas cujas linhas ficaram de fora | `base44/functions/corrigirPorcoesBaseImportacao/entry.ts:32` | P | engenharia |
| Médio | Listas e cache | importarSinonimosCsv rejeita como 'ingrediente não encontrado' os sinônimos dos 163 ingredientes do início do alfabeto (list 500 < 663) | `base44/functions/importarSinonimosCsv/entry.ts:32` | P | engenharia |
| Médio | Listas e cache | 'Atualizar todos os ingredientes' em Configurações opera sobre 500 de 663 ingredientes | `src/components/configuracoes/AtualizacaoPrecosSection.jsx:61` | P | engenharia |
| Médio | IA | atualizarPrecosAutomatico grava no catálogo global qualquer preço da IA com variação acima de 5% (inclusive -99%, +900% e negativo), sem revisão, sem marcar preco_estimado e sobrescrevendo preço curado manualmente | `base44/functions/atualizarPrecosAutomatico/entry.ts:127` | M | engenharia |
| Médio | IA | atualizarPrecosAutomatico não tem checkpoint: interrompido no meio, deixa preços novos com caches de custo antigos marcados como atuais, sem log, e só tenta de novo 6 dias depois | `base44/functions/atualizarPrecosAutomatico/entry.ts:108` | M | engenharia |
| Médio | IA | 'Importar com IA' (lote) grava gramaturas estimadas pelo LLM sem mostrá-las, sem a tabela canônica de medidas e com revisar:false | `src/components/receita/ImportarLoteDialog.jsx:610` | M | engenharia |
| Médio | IA | A importação com IA atribui ao ingrediente novo categorias fora do enum de Ingrediente (6 de 9 valores), e a regra de 'DOCES' do NovaReceitaIA nunca dispara | `src/components/receita/ImportarLoteDialog.jsx:158` | P | engenharia |
| Médio | Recuperabilidade | Excluir cadastro apaga receitas e cardápios do catálogo criados pelo usuário excluído, sem mostrar isso na confirmação | `base44/functions/excluirUsuarioAdmin/entry.ts:114` | P | engenharia |
| Médio | Recuperabilidade | Excluir cadastro apaga pagamentos pendentes ou contestados e pedidos de desistência: PIX pago depois fica órfão e some a prova em chargeback | `base44/functions/excluirUsuarioAdmin/entry.ts:68` | M | engenharia |
| Médio | Recuperabilidade | Rotinas de manutenção em lote gravam por padrão, sem prévia nem registro do valor anterior; 12 de 28 não gravam log nenhum | `src/pages/AuditoriaRendimento.jsx:80` | G | engenharia |
| Médio | Recuperabilidade | Informação nova sobre a fusão de ingredientes: é irreversível e perde dados sem aviso (soma ml com g e descarta pré-preparo, medida e posição da linha de origem) | `base44/functions/fundirIngredientes/entry.ts:92` | M | engenharia |
| Médio | Recuperabilidade | Exclusão de ingrediente: se a verificação falhar, o diálogo diz 'não está em uso' e o botão apaga a composição em receitas de todos os usuários, sem registro | `src/components/ingrediente/ExcluirIngredienteDialog.jsx:24` | P | engenharia |
| Médio | Recuperabilidade | Dependência de uma pessoa: os donos das contas críticas não estão documentados e não há segundo admin nem break-glass | `docs/29-OPERATIONS-RUNBOOK.md:20` | P | carmen |
| Médio | Funil | Cadastro não grava UTM, referrer nem código de parceria, e a passagem do site público para o app.* descarta os dois | `src/lib/publicUrls.js:8` | M | engenharia |
| Médio | Funil | origem_cadastro (Guia ZR) é sobrescrita para 'laboratorio_cozinha' a cada novo aceite de termos e perdida em conta nova criada pelo Google no /login | `base44/functions/registrarAceiteTermos/entry.ts:36` | P | engenharia |
| Médio | Funil | Checklist de primeiros passos confere outras entidades: quem monta uma refeição ou escala uma receita não vê o passo concluído | `src/pages/Home.jsx:90` | P | engenharia |
| Médio | Funil | E-mails de onboarding e de reativação não têm nenhum link, e o LogEmail não guarda o id do Resend: abertura, clique e reativação não têm como ser atribuídos | `base44/functions/enviarOnboardingTrial/entry.ts:12` | P | engenharia |
| Médio | Funil | Card 'Conversão trial → pagante' não é auditável: conta contas de teste e compra de teste (via plano_atual), sem período nem coorte | `src/lib/conversaoTrial.js:13` | P | engenharia |
| Médio | Funil | Pergunta de origem e segmento: responder só uma encerra a pergunta, e as listas não têm os canais nem os segmentos do plano | `src/components/home/PerfilOrigemCard.jsx:22` | P | engenharia |
| Médio | Checkout | Cartão 'em processamento' fica sem acompanhamento: /comprar-zr promete redirecionar e trava; o diálogo de /planos usa o ícone de sucesso | `src/pages/ComprarZR.jsx:73` | P | engenharia |
| Médio | Checkout | Planos do Laboratório oferecem de 1x a 12x sem valor da parcela, sem juros e sem total, enquanto o resumo mostra 'Total R$ …' | `src/components/planos/CartaoForm.jsx:30` | M | engenharia |
| Médio | Checkout | IS_PRODUCTION fixo em true e AMBIENTE global: homologar cartão em sandbox exige editar e publicar o front para todos, e trocar a secret quebra o checkout real | `src/lib/mercadoPagoConfig.js:4` | M | engenharia |
| Médio | Migração | Schema de pagamentos e entitlements rejeita o que o produto vende hoje: Guia ZR, chargeback, estorno parcial, PIX expirado, faixas acumuladas e trial 7-em-30 | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:209` | M | engenharia |
| Médio | Migração | Tabelas centrais não representam o produto: recipes sem linhagem, porções e per capita; menus sem orçamento; event_plans rejeita planejamento sem pessoas; 42 de 73 entidades sem tabela | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:376` | G | engenharia |
| Médio | Migração | Dependências de identidade e de IDs não inventariadas: o Guia ZR autentica com o token Base44 e o webhook MP resolve pagamentos pelo ID Base44 | `src/pages/EntrarNoGuia.jsx:36` | M | engenharia |
| Médio | Pagamentos | PIX ou cartão abandonado que o MP expira dispara 'acesso interrompido' ao cliente e 'acesso revogado' à Carmen | `base44/functions/webhookMercadoPago/entry.ts:206` | P | engenharia |
| Médio | Pagamentos | Replays reenviam o e-mail 'Pagamento aprovado' do ZR e a sincronização renotifica todo estorno parcial | `base44/shared/ativarCompraPagamento.ts:149` | P | engenharia |
| Médio | Pagamentos | [Novo efeito do item 383] Corrida entre resposta síncrona e webhook duplica o acesso ZR/Custos e o estorno revoga só uma das cópias | `base44/shared/guiaTecnicoZR.ts:159` | P | engenharia |
| Médio | Produto | Laboratório de Custos é prometido no trial e na landing, mas quem paga perde o acesso e não há como comprá-lo | `src/pages/CustosBloqueado.jsx:54` | M | carmen |
| Médio | Produto | Produto opera comercialmente sob NO-GO formal de 23/08, e o plano 41 trocou o gate financeiro 8/8 por '1 compra real' sem registro | `docs/go-live/GO_LIVE_DECISION_2026-08-23.md:9` | M | carmen |
| Médio | Produto | Termos e Política (v.18/08) não descrevem o que é vendido e coletado desde 12/09, mas são aceitos em todo checkout | `src/pages/Termos.jsx:49` | M | carmen |
| Médio | Produto | Extensão do item 'fallback de template' da revisão: e-mails de reativação D+3/D+7 saem com o texto padrão sem ativação, enquanto o Admin mostra 'Rascunho' | `base44/functions/enviarReativacaoTrial/entry.ts:91` | P | engenharia |
| Médio | Produto | E-mails de onboarding e reativação e o WhatsApp de reativação são promocionais, mas saem sem descadastro e fora da finalidade declarada na Política | `base44/shared/emailWrapper.ts:51` | P | engenharia |
| Médio | Produto | E-mail padrão da véspera do fim do teste afirma que 'o plano anual sai por menos da metade do mensal' — é falso (55%) | `base44/functions/enviarOnboardingTrial/entry.ts:29` | P | engenharia |
| Médio | Produto | Checklist de primeiros passos mede as ações erradas e não se completa para quem segue os próprios links | `src/components/home/ChecklistPrimeirosPassos.jsx:13` | P | engenharia |
| Médio | Produto | Card 'Conversão trial → pagante' conta compra do Guia ZR e cortesia manual como conversão e divide pela base inteira | `src/lib/conversaoTrial.js:13` | P | engenharia |
| Médio | Produto | A primeira compra exige 8 campos fiscais, incluindo endereço completo, antes de pagar R$ 29,90 — sem busca de CEP e pedindo o telefone de novo | `src/components/planos/DadosNotaFiscalCheckout.jsx:79` | M | engenharia |
| Médio | Produto | Sequência de onboarding e reativação inerte desde 11/09 e, quando ativada, sem nenhum link ou CTA | `base44/functions/enviarOnboardingTrial/entry.ts:12` | P | carmen |
| Médio | Produto | Oito commits mudaram comportamento de pagamento e webhook sem trocar VERSAO_CODIGO, quebrando a rastreabilidade usada como prova de homologação | `base44/functions/webhookMercadoPago/entry.ts:31` | P | engenharia |
| Médio | RLS e functions | excluirUsuarioAdmin (nova; tentativa de corrigir a exclusão sem cascata) apaga Receita/Cardapio por created_by_id sem filtrar is_base, apaga Pagamento/PedidoDesistencia não aprovados e não barra no servidor a exclusão de contas admin | `base44/functions/excluirUsuarioAdmin/entry.ts:114` | M | engenharia |
| Médio | RLS e functions | Os testes offline de autorização passam sem cobrir o que mudou: test-scheduled-functions valida só a agenda legada de 6 jobs, test-rls-children só a RLS de linha de 7 filhas, e nenhum teste exige guard nas functions | `scripts/test-scheduled-functions.mjs:5` | M | engenharia |
| Baixo | Laboratório de Custos | 'Recalcular com preços atuais' descarta a formação de preço e as exclusões da versão anterior | `src/pages/CustosCalcular.jsx:171` | P | engenharia |
| Baixo | Engenharia | Dependabot travado: 10 PRs major esgotam o open-pull-requests-limit e o grupo minor/patch não abre desde 04/09 | `.github/dependabot.yml:10` | P | engenharia |
| Baixo | Listas e cache | Teto por requisição nunca medido e contraditório no repo; fetchAllPages para sem aviso quando pageSize > teto (agrava o item Baixo da busca do topo se o teto for 500) | `src/lib/fetchAllPages.js:16` | M | engenharia |
| Baixo | Listas e cache | NovaReceitaIA (acessível só por /receitas?nova=ia) opera com catálogo truncado em 3 leituras, contamina ['receitas-basicas'] com 200 receitas e cria ingredientes duplicados | `src/components/receita/NovaReceitaIA.jsx:97` | P | engenharia |
| Baixo | Recuperabilidade | exportarFaseAMigracao não serve de backup: exporta só o catálogo, sem donos, com datas truncadas no segundo, sem agendamento e com a cópia dentro do próprio Base44 | `base44/functions/exportarFaseAMigracao/entry.ts:109` | M | engenharia |
| Baixo | Recuperabilidade | Informação nova sobre a consolidação de medidas caseiras: apaga registros guardando só os IDs e aceita duplicatas com pesos diferentes | `base44/functions/sanearMedidaCaseira/entry.ts:199` | P | engenharia |
| Baixo | Funil | A meta de ativação em 48 h depende de um evento que o app só escreve: sem marco persistido, o painel admin não calcula ativação | `src/components/receita/EscaladorReceita.jsx:71` | P | engenharia |
| Baixo | Migração | [revisão 06/09, sem correção] Os 8 problemas de modelo da seção 4 seguem na main e na PR #44, e a cadeia 'certificada' os levaria à produção | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:488` | M | engenharia |
| Baixo | Migração | Documentação de migração contraditória e desatualizada: baseline, runtime, agenda de jobs, staging e status do plano | `docs/database/supabase-remote-baseline-2026-09-04.md:17` | P | engenharia |
| Baixo | Pagamentos | Prazo de arrependimento conta da criação da tentativa, não da aprovação: PIX pago depois encurta ou zera o direito | `base44/functions/criarPagamentoMercadoPago/entry.ts:360` | P | engenharia |
| Baixo | Produto | Plano 41 tem um gate de aquisição impossível de cumprir e não reflete o que foi feito nas duas semanas | `docs/41-PLANO-DE-ACAO.md:280` | P | carmen |
| Baixo | Produto | Cutover Supabase da semana 11 é inviável: o schema alvo não comporta o que foi lançado depois de 04/09 | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:202` | G | engenharia |
| Baixo | Produto | Documentação técnica e de domínio congelada em 30/08: 25 functions, 32 entidades e 4 rotas do produto atual não estão documentadas | `docs/00-PROJECT-OVERVIEW.md:28` | G | engenharia |

25 achados médios/baixos confirmados foram omitidos aqui por serem sensíveis (relatório privado). 32 achados baixos não passaram por verificação e também estão só no relatório privado.

## Anexo B — Rechecagem da revisão de 06/09 (itens não sensíveis)

`Linha` é a linha do relatório `docs/reviews/2026-09-06-REVISAO-COMPLETA.md` da PR #45. Os itens do tipo segurança (17: 15 abertos, 2 corrigidos) estão só no relatório privado.

| Linha | Anexo | Sev. | Local | Achado | Status | Evidência atual |
|---|---|---|---|---|---|---|
| 377 | A | Alto | src/components/receita/EditReceitaDialog.jsx:153 | EditReceitaDialog sobrescreve linhagem/propriedade da cópia pessoal com metadados da receita de catálogo | ❌ aberto | Arquivo sem commits. EditReceitaDialog.jsx:153 retira do form (cópia da receita de catálogo) só id, datas, created_by_id, is_base e forked_from_id. :204 faz Receita.update(forkId, rest), gravando usua… |
| 378 | A | Alto | src/components/receita/ImportarLoteDialog.jsx:589 | Importação com IA cria Ingrediente diretamente (RLS admin-only): para usuário comum a receita fica órfã/parcial | ❌ aberto | ImportarLoteDialog.jsx:589 ainda chama base44.entities.Ingrediente.create. Ingrediente.jsonc:109 mantém create só para admin. O diálogo segue exposto a qualquer usuário (Receitas.jsx:346 e 739, rota /… |
| 379 | A | Alto | src/lib/query-client.js:8 | refetchOnMount:false global faz invalidações entre páginas nunca refazerem a consulta (listas ficam obsoletas até 15 min) | ❌ aberto | query-client.js:8 continua com refetchOnMount:false e gcTime de 15 min. Só 4 queries sobrescrevem com 'always' (MinhasReceitas:35, MeusIngredientes:33, CustosHistorico:38, CustosInicio:52), todas ante… |
| 380 | A | Alto | src/pages/ReceitaAberta.jsx:896 | Duplicar receita não remapeia subreceita_parent_id: filhos de sub-receita ficam órfãos, invisíveis e ainda custeados | ❌ aberto | ReceitaAberta.jsx:897-905: duplicarReceitaMut copia cada item com ...irest (subreceita_parent_id original) sem mapear para os novos IDs. O único commit no arquivo (f82b5bcf) só adicionou AvisoEscalaTr… |
| 381 | A | Alto | src/pages/Receitas.jsx:186 | Composição da receita lida com limite padrão de 50 linhas (duplicar/excluir/exibir) | ❌ aberto | Seguem sem limit/paginação: Receitas.jsx:186 e 219, ReceitaAberta.jsx:138 (exibição), :163, :168 e :915 (exclusão), todos em IngredienteReceita/InsumoReceita/IngredienteEsquecidoReceita.filter({receit… |
| 382 | A | Médio | base44/functions/criarPagamentoMercadoPago/entry.ts:61 | Compra de plano mensal com anual vigente é aceita e reduz a assinatura para 30 dias | ❌ aberto | criarPagamentoMercadoPago/entry.ts:100-110 valida elegibilidade só para 'renovacao'; mensal não é barrado com anual vigente. ativarAssinaturaPagamento.ts:68-79 grava data_expiracao = hoje+30, sobrescr… |
| 383 | A | Médio | base44/functions/criarPagamentoMercadoPago/entry.ts:460 | Corrida entre resposta síncrona de cartão e webhook pode ativar duas vezes (notificações duplicadas e dois entitlements de Custos) | ❌ aberto | Fluxo síncrono em criarPagamentoMercadoPago/entry.ts:641-642 e webhook em webhookMercadoPago:190-192 continuam sem lock/CAS. A idempotência é ler-e-depois-gravar, sem atomicidade: ativarAssinaturaPaga… |
| 384 | A | Médio | base44/functions/fundirIngredientes/entry.ts:146 | Prévia da fusão de ingredientes truncada em 50 linhas (total e 'destino já existe' errados) | ❌ aberto | Arquivo sem commits. fundirIngredientes/entry.ts:146 (linhasOrigem) e :158 (destinoLinhas) usam filter sem limit. :154 filtra Receita por chunks de 200 IDs também sem limit (padrão 50). |
| 386 | A | Médio | base44/functions/importarIngredientesCsv/entry.ts:38 | Importação de ingredientes deduplica contra apenas 500 registros e cria duplicatas no catálogo global | ❌ aberto | importarIngredientesCsv/entry.ts:38 inalterado: Ingrediente.list('-nome', 500) monta o existMap de deduplicação. Ingredientes fora dos 500 primeiros (ordem Z→A) são recriados. |
| 387 | A | Médio | base44/functions/normalizarCustosReceitas/entry.ts:277 | Motor de custos server-side marca ingrediente esquecido como divergente pelo campo nome, contrariando regra documentada e o motor do frontend | ❌ aberto | normalizarCustosReceitas/entry.ts:277-286 inalterado: se esquecido.nome difere de ingrediente.nome, registra 'esquecido_nome_id_divergente', incrementa refAusente e pula o custo (continue). |
| 388 | A | Médio | base44/functions/verificarExcluirIngrediente/entry.ts:21 | verificarExcluirIngrediente marca/invalida só 50 receitas mas apaga todas as linhas | ❌ aberto | verificarExcluirIngrediente/entry.ts:21 lê as linhas com filter sem limit (50). :34 faz deleteMany de todas. O revisar e a invalidação (:37-51) cobrem só as receitaIds das 50 linhas lidas. |
| 389 | A | Médio | base44/shared/ativarAssinaturaPagamento.ts:66 | Renovação em D-30 reinicia o período a partir de hoje e descarta até 30 dias já pagos | ❌ aberto | ativarAssinaturaPagamento.ts:68-72 (6 commits desde a base, só em e-mail/supressão): dataInicio = hojeSaoPauloISO() e expiração = hoje + 365 também para 'renovacao'. Não soma o saldo da data_expiracao… |
| 390 | A | Médio | base44/shared/protecoesAutomacao.ts:204 | Execução manual do admin consome o cooldown de 20h e cancela silenciosamente a execução agendada seguinte | ❌ aberto | protecoesAutomacao.ts:204-208 inalterado: adquirirCooldownAutomacao usa a mesma chave automation_last_started:<chave> para admin e scheduler. A execução manual bloqueia a agendada com reason 'cooldown… |
| 391 | A | Médio | base44/shared/templateEmail.ts:20 | Nome do usuário com "{{" ou "$&" derruba os jobs agendados de e-mail inteiros | ❌ aberto | templateEmail.ts:20 ainda usa replace com string (interpreta $&) e :27-30 lança erro se sobrar {{x}}. Os jobs não têm try/catch por usuário, por exemplo enviarTrialExpirando:36-40, enviarTrialVencido:… |
| 392 | A | Médio | base44/shared/versaoDocumentosLegais.ts:1 | Versão dos documentos legais duplicada entre shared e src/lib sem teste de sincronismo | ❌ aberto | As constantes seguem duplicadas em base44/shared/versaoDocumentosLegais.ts:1-2 e src/lib/termosVersao.js:1-2. Nenhum script em scripts/ nem em package.json referencia qualquer dos dois arquivos. |
| 393 | A | Médio | scripts/test-laboratorio-custos.mjs:75 | test-laboratorio-custos.mjs está obsoleto: cenário 'completo' usa assinatura antiga de calcularLaboratorioCustos e falharia mesmo após corrigir o alias | ❌ aberto | Rodado offline hoje: falha com ERR_MODULE_NOT_FOUND '@/lib' (laboratorioCustosAccess.js). :75 ainda passa volumeMensal/valorMaoDeObraDireto/custoEmbalagemAdicional/outrosCustos, que motorCustos.js:194… |
| 394 | A | Médio | scripts/test-trial-7-em-30.mjs:37 | Testes de trial 7-em-30 e checkout do Laboratório de Custos existem mas não estão em nenhum script npm; o de trial está falhando | ❌ aberto | package.json não referencia nenhum dos dois. Rodado hoje: test-trial-7-em-30.mjs falha em :37 ('card Trial precisa mostrar Custos incluído'), e test-checkout-laboratorio-custos.mjs agora também falha… |
| 395 | A | Médio | src/App.jsx:131 | Rotas lazy sem ErrorBoundary: falha ao carregar chunk (ex.: após deploy) resulta em tela branca | ❌ aberto | App.jsx:144-237: rotas lazy (26-44+) só dentro de <Suspense>. Não há ErrorBoundary, componentDidCatch nem handler de vite:preloadError em src/. Os 6 commits no App.jsx não tratam isso (ex.: 76926bb8 é… |
| 396 | A | Médio | src/components/CustosRoute.jsx:21 | Ativar trial/comprar Laboratório de Custos devolve o usuário para a tela de bloqueio (entitlement em cache nunca é refeito) | ❌ aberto | CustosRoute.jsx:20-25 inalterado (staleTime 0, mas vale o refetchOnMount:false global). CustosBloqueado.jsx:124-126 ativa o trial e navega para /custos sem invalidar ['custos-entitlement']. Só o admin… |
| 397 | A | Médio | src/components/planejamento/DecimalInput.jsx:7 | DecimalInput não acompanha mudanças de value — Qtd. final em Doces & Bebidas fica desatualizada | ❌ aberto | DecimalInput.jsx:7 inalterado: useState(value) inicial, sem useEffect de sincronismo. DocesBebidasSection.jsx:199-201 passa qtdFinalEfetiva(...) sem key, e o reset para automático não atualiza o texto… |
| 398 | A | Médio | src/components/planejamento/EventoListaCompras.jsx:427 | Lista de Compras e Relatório de Produção ignoram quantidade_ajustada e custo de Doces & Bebidas (divergem do Dossiê/Etapa 4) | ❌ aberto | EventoListaCompras.jsx:427 ainda calcula pessoas*percentual*media e exibe custo_manual (:441), ignorando quantidade_ajustada e custo_unitario. O relatório faz o mesmo em relatoriosPlanejamentoPDF.js:1… |
| 399 | A | Médio | src/components/planejamento/EventoListaCompras.jsx:122 | Lista de Compras do Evento escala por porções (qtd_kg/PC) e não por peso — diverge do Dossiê/Pré-preparos | ❌ aberto | Arquivo sem commits. EventoListaCompras.jsx:122 ainda deriva porções como round(qtd_kg*1000/pc_g), e :190-211 escala por quantidade_por_porcao*porcoes, não pelo peso. |
| 400 | A | Médio | src/components/planejamento/NovoPlanejamentoDialog.jsx:261 | Componentes definidos dentro de NovoPlanejamentoDialog: campo numérico perde o foco a cada dígito | ❌ aberto | NovoPlanejamentoDialog.jsx:261 (QuantidadeSelector) e :287 (PerCapitaSlider) continuam declarados dentro do componente e usados como <QuantidadeSelector/> em :424-426 e :435-437. A cada render remonta… |
| 401 | A | Médio | src/components/planos/PixForm.jsx:38 | PIX aprovado nunca mostra sucesso: PixForm chama onSuccess() sem argumento | ❌ aberto | PixForm.jsx:44 ainda chama onSuccess?.() sem argumento. CheckoutDialog.jsx:109 passa setResultadoPagamento e :58 só mostra sucesso se resultadoPagamento for truthy. O novo ComprarZR.jsx:73-75 tolera u… |
| 402 | A | Médio | src/components/ProtectedRoute.jsx:26 | registrarDiaUsoTrial é invocado a cada navegação e a cada re-render do AuthProvider (checkUserAuth não memoizado nas deps) | ❌ aberto | ProtectedRoute.jsx:26-49 inalterado: o efeito que invoca registrarDiaUsoTrial tem location.pathname e checkUserAuth nas deps. AuthContext.jsx:101 define checkUserAuth como função async comum, sem useC… |
| 403 | A | Médio | src/components/ProtectedRoute.jsx:55 | Falha/timeout do public-settings expulsa usuário com sessão válida para /login e duplica checkUserAuth | ❌ aberto | ProtectedRoute.jsx sem alteração desde 883ecee: linhas 55-60 devolvem AppLoginRedirect para qualquer authError. AuthContext.jsx:59-89 grava authError 'unknown' e isLoadingAuth=false sem authChecked, e… |
| 404 | A | Médio | src/components/ProtectedRoute.jsx:35 | registrarDiaUsoTrial disparado a cada navegação e remonta a app inteira no primeiro acesso do dia | ❌ aberto | ProtectedRoute.jsx:26-49 continua igual: as deps incluem location.pathname e checkUserAuth, e a linha 39 chama checkUserAuth() quando dia_registrado. AuthContext.jsx:104 liga isLoadingAuth e App.jsx:1… |
| 405 | A | Médio | src/components/receita/BulkTagAssignDialog.jsx:27 | BulkTagAssignDialog cria ReceitaTag sem is_base/usuario_dono_id (falha para usuário comum, linhas invisíveis quando admin) | ❌ aberto | BulkTagAssignDialog.jsx:27-34 sem alteração: bulkCreate só com receita_id/tag_*. ReceitaTag.jsonc:39-56 exige admin ou is_base=false + usuario_dono_id=user; o read (58-71) exige is_base=true ou dono.… |
| 406 | A | Médio | src/components/receita/EditItemDialog.jsx:21 | queryKey ['ingredientes'] compartilhada por fetchers diferentes (500 itens vs lista completa) | ❌ aberto | EditItemDialog.jsx:20-23 ainda usa queryKey ['ingredientes'] com Ingrediente.list('-nome', 500). A mesma chave usa fetchAllPages em AddIngredienteDialog.jsx:36, NovaReceitaManual.jsx:54, IngredientesE… |
| 407 | A | Médio | src/components/receita/EditReceitaDialog.jsx:204 | Fork-on-edit pelo EditReceitaDialog sobrescreve dono e linhagem da cópia pessoal com valores do catálogo | ❌ aberto | EditReceitaDialog.jsx:153 tira só id, datas, created_by_id, is_base e forked_from_id do form (que é {...receita}). usuario_dono_id, receita_origem_id, receita_raiz_id e linhagem_* ficam em rest, e a l… |
| 408 | A | Médio | src/components/receita/ImportarLoteDialog.jsx:471 | Importar em lote sobrescreve receita existente por nome (apaga composição) sem confirmação; aborta para usuário comum | ❌ aberto | ImportarLoteDialog.jsx:471-481 sem alteração: buscarFuzzy(nome) acha a existente e o código faz Receita.update e depois apaga todos os IngredienteReceita, um a um. Não há confirmação nem ensureFork/ga… |
| 409 | A | Médio | src/lib/AuthContext.jsx:103 | Toda chamada a checkUserAuth() desmonta a árvore de rotas (spinner full-screen) | ❌ aberto | AuthContext.jsx:104 (antes 103) ainda faz setIsLoadingAuth(true) em todo checkUserAuth. App.jsx:127-133 e ProtectedRoute.jsx:51-53 trocam a árvore pelo spinner. O diff de 883ecee..HEAD só acrescentou… |
| 410 | A | Médio | src/lib/AuthContext.jsx:175 | Timeout/erro de rede em auth.me() tratado como não autenticado, sem retry | ❌ aberto | AuthContext.jsx:177-190: o catch grava isAuthenticated=false e authChecked=true, e só 401/403 viram authError. Um AUTH_TIMEOUT (authTimeout.js) cai em ProtectedRoute:62-64, que devolve AppLoginRedirec… |
| 411 | A | Médio | src/lib/conversorMedidas.js:21 | converterGramasParaMedida limita a fração a 20¾ e erra acima de ~21 medidas | ❌ aberto | conversorMedidas.js:21 continua com findClosestFraction(n, maxInt = 20), chamada sem maxInt na linha 105 (nArredondado). Arquivo sem alteração desde 883ecee. |
| 412 | A | Médio | src/lib/custoReceita.js:137 | porcoesEfetivas ignora unidadesFinais informadas e superestima insumos por_unidade | ❌ aberto | custoReceita.js:135-137 sem alteração: porcoesEfetivas = metricas.porcoes \|\| (unidadesFinais > 0 ? unidadesFinais : ...). unidadesFinais só vale quando metricas.porcoes é zero. |
| 413 | A | Médio | src/lib/custoReceita.js:218 | custoPorGrama/custoPorKgPronto com contexto lineariza insumos por_lote/por_unidade e diverge de custoEscalado | ❌ aberto | custoReceita.js:203-221 sem alteração: com contexto, calcula o lote com fator 1 e devolve custoTotal/rend, que o chamador multiplica linearmente. custoEscalado (229+) reescala o lote. |
| 414 | A | Médio | src/lib/custoReceita.js:91 | Motor canônico ignora marcador de sub-receita sem cache e devolve completo=true | ❌ aberto | custoReceita.js:91 ainda faz continue para tipo 'subreceita' sem registrar problema. completo (linha 195) não considera sub-receitas sem filhos em cache. Arquivo sem alteração. |
| 415 | A | Médio | src/lib/dossieEventoCalc.js:63 | Dossiê e Relatório de Custos do evento usam cache global da Receita enquanto a Etapa 3 usa preço pessoal canônico | ❌ aberto | dossieEventoCalc.js:63 e relatoriosPlanejamentoPDF.js:255 chamam custoPorKgPronto(rec, itens) sem contexto, o que cai no cache Receita.custo_total (custoReceita.js:220). EtapaCardapio.jsx:131 passa o… |
| 416 | A | Médio | src/lib/dossieEventoCalc.js:107 | Dossiê do Evento calcula custo pelo cache global Receita.custo_total, não pelo motor canônico da Etapa 3 | ❌ aberto | Mesma causa do item anterior: dossieEventoCalc.js:63 sem terceiro argumento, logo custoPorGrama usa receita.custo_total (custoReceita.js:220-221). Arquivo sem alteração desde 883ecee; a linha 107 do r… |
| 417 | A | Médio | src/lib/forkReceita.js:80 | Fork não copia InsumoReceita nem IngredienteEsquecidoReceita, mas herda o cache custo_insumos | ❌ aberto | forkReceita.js:72-103 sem alteração: copia só IngredienteReceita (79-84) e ReceitaTag (94-103). O ...rest da linha 73 leva custo_insumos e demais caches da origem. |
| 418 | A | Médio | src/lib/forkReceita.js:72 | Fork-on-edit sem rollback: cópia parcial vira 'cópia existente' e prende o usuário | ❌ aberto | forkReceita.js:72-103: cria a Receita e os filhos em sequência, sem try/catch nem rollback. As linhas 28-51 devolvem blocked/existingCopyId para qualquer cópia encontrada, inclusive parcial. Arquivo s… |
| 419 | A | Médio | src/lib/formatarModoPreparo.js:250 | formatarModoPreparo descarta o texto anterior ao primeiro marcador numérico e a normalização é persistida a cada salvamento | ❌ aberto | formatarModoPreparo.js:20-28 (arquivo de 43 linhas, sem alteração): o loop começa em i=1 e descarta partes[0]. A normalização é persistida em EditReceitaDialog.jsx:155-156 e ImportarLoteDialog.jsx:450… |
| 420 | A | Médio | src/lib/listaComprasReceitaCalc.js:270 | Lista de compras da receita omite sub-receitas sem filhos em cache, sem pendência | ❌ aberto | listaComprasReceitaCalc.js:31-32 (arquivo de 84 linhas, sem alteração) só aceita tipo === 'ingrediente'. O marcador de sub-receita sem filhos some sem gerar pendência, e ReceitaListaCompras.jsx não tr… |
| 421 | A | Médio | src/lib/mercadoPagoConfig.js:23 | Retry do SDK do Mercado Pago após falha fica pendente para sempre | ❌ aberto | mercadoPagoConfig.js:23-27 sem alteração: no retry, a tag <script> que já falhou continua no DOM. O código só anexa listeners load/error a ela, que não disparam de novo, e a promise nunca resolve. O c… |
| 422 | A | Médio | src/lib/statusAssinaturaUsuario.js:61 | Filtro 'Tipo de usuário' classifica clientes com plano 'renovacao' como visitantes | ❌ aberto | statusAssinaturaUsuario.js:88 ainda define isPago = mensal \|\| anual, e a linha 90 manda o resto para visitante. Os commits posteriores (ex.: f87f32dc) só ampliaram PLANO_LABEL (47-64). renovacao, di… |
| 423 | A | Médio | src/pages/CardapioAberto.jsx:195 | CardapioAberto: N+1 (3 requisições por receita + base inteira de receitas) a cada abertura | ❌ aberto | CardapioAberto.jsx:176-198 sem alteração: fetchAllPages(Receita) na linha 180 e mais IngredienteReceita, InsumoReceita e IngredienteEsquecidoReceita filtrados por receita (194-196), tudo dentro de loa… |
| 424 | A | Médio | src/pages/CustosCalcular.jsx:418 | Erros estruturados do servidor descartados: usuário vê 'Request failed with status code 400' | ❌ aberto | CustosCalcular.jsx:418 sem alteração: toast com err?.message, ignorando err.response.data.error. A linha 411 só lê resposta.data.error quando a resposta vem 2xx. |
| 425 | A | Médio | src/pages/ReceitaAberta.jsx:912 | Exclusão de receita não remove filhos nem referências (tags, insumos, esquecidos, cardápios, marcadores) | ❌ aberto | ReceitaAberta.jsx:913-923 (antes 912; +1 linha pelo import de AvisoEscalaTrial) apaga só IngredienteReceita e a Receita. O mesmo vale para Receitas.jsx:216-222. Não há função ou automação backend nova… |
| 426 | A | Médio | src/pages/ReceitaAberta.jsx:1020 | Reordenar, substituir, criar sub-título e remover sub-receita em receita do catálogo falham silenciosamente para usuário comum | ❌ aberto | ReceitaAberta.jsx:1021 (handleDragEnd), 925 (handleMove), 770, 779, 799, 819, 837, 858 e 884 (mutations) operam direto em id, sem ensureEditavel(). useMutation não tem onError. |
| 427 | A | Médio | src/pages/ReceitaAberta.jsx:924 | Mutações (reordenar, sub-título, substituir etc.) ignoram fork-on-edit e falham em silêncio | ❌ aberto | ReceitaAberta.jsx:925-1019 (handleMove) e as mutations replaceIngMut (779), addGrupoMut (819), convertToGrupoMut (837), updateGrupoMut (858) e deleteSubreceitaMut (884) continuam sem ensureEditavel e… |
| 428 | A | Médio | src/pages/Receitas.jsx:199 | Favoritar, 'A revisar' e Excluir na listagem falham em silêncio para usuário comum em receitas do catálogo | ❌ aberto | Receitas.jsx:198-226 sem alteração: favoritarMut, toggleRevisarMut e deleteMut chamam Receita.update/delete direto, sem fork nem onError. |
| 429 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:683 | Receita com ficha de custo nunca pode ser excluída (FK RESTRICT + fichas sem DELETE) | ❌ aberto | Migração inalterada e nenhuma migração nova em supabase/. A linha 683 mantém recipe_id ... on delete restrict, e só existe a policy cost_calculations_owner_read (2715), sem policy de DELETE. |
| 430 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:271 | household_measures perde a identidade ingrediente + utensílio + estado do alimento | ❌ aberto | Migração inalterada: household_measures (linhas 271-288) segue só com name, abbreviation, unit_type, grams e milliliters, sem ingredient_id, utensílio ou estado. |
| 431 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:488 | PK (menu_id, recipe_id) em menu_recipes impede a mesma receita em dias/refeições diferentes | ❌ aberto | Migração inalterada: menu_recipes (481-491) mantém primary key (menu_id, recipe_id) na linha 488. |
| 432 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:602 | cart_items modela carrinho de receitas/cardápios, mas o produto usa carrinho de ingredientes (CarrinhoItem) | ❌ aberto | Migração inalterada: cart_items (602-620) continua com item_type em ('recipe','menu','supply') e sem ingredient_id. |
| 433 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:226 | ingredients sem preço de referência/FC; user_ingredients sem favorito, sem unicidade e com NOT NULL que rejeita legado | ❌ aberto | Migração inalterada: ingredients (226-245) não tem preço de referência. user_ingredients (247-269) não tem favorito nem unique (owner_id, ingredient_id), e purchase_unit, package_quantity e package_pr… |
| 434 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:432 | recipe_items/recipe_supplies perdem atributos exigidos pelo motor de custos e escalonamento | ❌ aberto | Migração inalterada: recipe_items (402-430) tem só quantity, unit, group_name, notes, sort_order e optional, sem fc_override, pré-preparo, participa_compra ou subreceita_parent. recipe_supplies (432-4… |
| 435 | A | Médio | supabase/migrations/20260904141551_operational_schema_and_rls.sql:510 | menu_periods/menu_period_items não representam CardapioPeriodo/CardapioPeriodoItem | ❌ aberto | Migração inalterada: menu_periods (510-525) usa starts_at/ends_at timestamptz em vez de datas civis. menu_period_items (527-540) não tem tipo de origem nem classificação e só aceita recipe_id NOT NULL… |
| 436 | A | Baixo | .github/workflows/database.yml:33 | Verificação do banco fora do maintenance:check e sem script npm; pin da CLI só no CI | ❌ aberto | package.json:32 (maintenance:check) segue sem etapa de banco e não há script npm 'supabase'/'db'; o pin 2.116.0 + sha256 continua só em .github/workflows/database.yml:37-42. Nenhum commit em package.j… |
| 437 | A | Baixo | base44/entities/_temp.jsonc:1 | 17 entidades de sondagem/temporárias continuam declaradas | ❌ aberto | As 17 continuam em base44/entities: _temp.jsonc, _temp_*_probe.jsonc (9), _noop_probe(2).jsonc, TmpNoop(2).jsonc, DummyNoop2.jsonc, Fase111Probe.jsonc, RlsIsolationProbe.jsonc. Nenhum commit as remove… |
| 438 | A | Baixo | base44/entities/cardapio-periodo.jsonc:1 | Schemas kebab-case duplicados coexistem com CardapioPeriodo/CardapioPeriodoItem | ❌ aberto | base44/entities/cardapio-periodo.jsonc e cardapio-periodo-item.jsonc continuam presentes, ao lado de CardapioPeriodo/CardapioPeriodoItem. |
| 442 | A | Baixo | base44/functions/aplicarTagsAutomatico/entry.ts:175 | ReceitaTag gravada sem is_base/usuario_dono_id, invisível a usuários comuns | ❌ aberto | aplicarTagsAutomatico/entry.ts:160-166 monta o registro só com receita_id/tag_*; o bulkCreate está em :175. O read de ReceitaTag.jsonc:58-71 continua exigindo is_base ou usuario_dono_id. A função não… |
| 444 | A | Baixo | base44/functions/campanhaEmail/entry.ts:32 | Limite de 2000 usuários bloqueia destinatários fora da página; sem lote/rate limit | ❌ aberto | campanhaEmail/entry.ts:32 ainda faz User.list("-created_date", 2000); em :35 bloqueia e-mails ausentes do mapa. O laço em :39-47 envia sequencialmente, sem lote nem throttle. Arquivo sem mudança. |
| 445 | A | Baixo | base44/functions/converterMedidasReceitas/entry.ts:169 | Só processa as primeiras `limite` receitas e encerra a paginação como se não houvesse mais | ❌ aberto | converterMedidasReceitas/entry.ts:169 faz Receita.list("-nome", limite) e :170 fatia; :264-265 calculam temMais contra receitas.length (≤limite), então a paginação para no limite. Arquivo sem mudança. |
| 446 | A | Baixo | base44/functions/criarPagamentoMercadoPago/entry.ts:146 | custos_* cobrável sem Laboratório de Cozinha ativo; ativação lança erro após aprovação | ◐ parcial | bb82ac3b trocou a guarda para `addonId && !planoBaseId && !temAcesso` (entry.ts:194), bloqueando a compra avulsa sem base. Mas ativarCustos ainda lança erro pós-aprovação (shared/ativarCompraPagamento… |
| 447 | A | Baixo | base44/functions/criarPagamentoMercadoPago/entry.ts:279 | E-mail do pagador vem do cliente e não do usuário autenticado | ✅ corrigido | 2aaf3a0b (14/09): payerEmail em produção passou a ser user.email (entry.ts:366-368). payer.email do cliente só é validado como obrigatório em :123 e não entra no payload. |
| 448 | A | Baixo | base44/functions/criarPagamentoMercadoPago/entry.ts:169 | Checkout de Custos exige venda_habilitada mas não modulo_habilitado | ❌ aberto | criarPagamentoMercadoPago/entry.ts:231 ainda confere só configAddon.venda_habilitada e configModulo.venda_habilitada. shared/acessoLaboratorioCustos.ts:21 segue negando com 'comercial_indisponivel' qu… |
| 449 | A | Baixo | base44/functions/enviarLembretePendencia/entry.ts:29 | Lembrete enviado para pagamento pendente antigo mesmo se o cliente já pagou por outra tentativa | ❌ aberto | enviarLembretePendencia/entry.ts:30-33 filtra só status=pending, lembrete_pendencia_enviado e idade ≥3d. Não verifica outro Pagamento aprovado nem o status do User. Commits recentes só adicionaram sup… |
| 450 | A | Baixo | base44/functions/enviarTrialVencido/entry.ts:26 | Quem esgota os 7 dias de uso vira 'vencido' sem receber e-mail de trial encerrado | ❌ aberto | enviarTrialVencido/entry.ts:26-29 ainda seleciona só status=trial e data_expiracao==hoje (fim da janela de 30d). enviarReativacaoTrial (8f9efd88) usa D+3/D+7 sobre data_expiracao, então também não cob… |
| 452 | A | Baixo | base44/functions/inicializarTrialLaboratorioCustos/entry.ts:46 | Quebra (500) para usuário homologado sem ConfiguracaoAddonCustos | ❌ aberto | inicializarTrialLaboratorioCustos/entry.ts:46 ainda faz `Number(config.trial_dias \|\| 7)` sem optional chaining. Com config null e autorização de homologação, :31 deixa passar e ocorre TypeError → 50… |
| 453 | A | Baixo | base44/functions/inicializarTrialUsuario/entry.ts:67 | Sem idempotência para chamadas concorrentes: acesso Custos e boas-vindas duplicados | ❌ aberto | inicializarTrialUsuario/entry.ts:35-51 checa histórico, :55 faz User.update e :67-85 checa-e-cria AcessoLaboratorioCustosUsuario. É check-then-act sem lock/chave idempotente, e o e-mail em :89-107 não… |
| 454 | A | Baixo | base44/functions/obterEventoModelo/entry.ts:10 | Campos is_modelo/modelo_origem_id de Planejamento não existem no schema jsonc | ❌ aberto | obterEventoModelo/entry.ts:9-13 filtra Planejamento por { is_modelo: true }; grep em base44/entities/Planejamento.jsonc não acha is_modelo nem modelo_origem_id. Nenhum commit no schema desde 883ecee. |
| 455 | A | Baixo | base44/functions/padronizarCaixaNomes/entry.ts:3 | padronizarCaixaNomes não faz trim, ao contrário de toUpperName do frontend | ❌ aberto | padronizarCaixaNomes/entry.ts:3-5 continua como `(v \|\| '').toString().toUpperCase()`, sem trim. src/lib/textCase.js:6-7 faz .trim().toUpperCase(). |
| 456 | A | Baixo | base44/functions/sanearMedidaCaseira/entry.ts:192 | Consolidação usa list(10000) acima do máximo de 5.000 do SDK — referências órfãs | ❌ aberto | sanearMedidaCaseira/entry.ts:192 ainda faz IngredienteReceita.list('-created_date', 10000), e MedidaCaseira.list(...,10000) em :61, :115 e :180. Não há paginação. Arquivo sem mudança. |
| 457 | A | Baixo | base44/functions/webhookMercadoPago/entry.ts:122 | Webhook responde 200 quando a reconsulta ao Mercado Pago falha, impedindo retry | ❌ aberto | webhookMercadoPago/entry.ts:130-133: com !recursoResponse.ok ou recurso nulo, registra 'order_nao_encontrada' e retorna { status: 200 }. Os 11 commits no arquivo não mudaram esse ramo. |
| 458 | A | Baixo | base44/functions/webhookMercadoPago/entry.ts:166 | Estorno não reparado por replay: ramo idempotente só reparava aprovações | ✅ corrigido | 8ce9be8d (14/09): o ramo idempotente (entry.ts:182) chama finalizarEstornoConfirmado, que reexecuta revogarCompraEstorno (shared/processarDesistencia.ts:125-145). reprocessarPagamentoPix/entry.ts:79-8… |
| 460 | A | Baixo | base44/shared/ativarAssinaturaPagamento.ts:57 | Replays 'approved' re-estendem assinatura e reenviam e-mails para usuários sem pagamento_ativo_id | ❌ aberto | ativarAssinaturaPagamento.ts:57-66: as guardas só atuam se pagamento_ativo_id existe; sem ele (legado), um replay via webhook ou reprocessarPagamentoPix:77 regrava data_inicio=hoje e nova expiração (:… |
| 461 | A | Baixo | base44/shared/protecoesAutomacao.ts:193 | Execuções ignoradas por janela/cooldown retornam 200 indistinguíveis de sucesso; janela de 30 min | ❌ aberto | protecoesAutomacao.ts:193-199 ainda devolve Response.json({ ignored: true, reason: 'outside_schedule_window' }) com status 200 padrão (idem em :211 para cooldown). Janelas de 30 min mantidas, ex. envi… |
| 463 | A | Baixo | docs/security/SUBSCRIPTION_ACCESS_MATRIX_2026-08-23.md:30 | Matriz de assinaturas diverge do código (trial 7 dias vs 7-em-30; vencido com pagamento vigente liberado) | ❌ aberto | O doc não mudou: :30 diz 'Vencido com data futura \| Bloqueado' e :39 'Trial: 7 dias'. O código segue promovendo vencido+pagamento_ativo_id a 'ativo' (shared/acessoAssinatura.ts:28-30) e usa janela 7_… |
| 464 | A | Baixo | index.html:57 | returnTo e access_token descartados na canonicalização de host (storage por origem antes do redirect) | ❌ aberto | index.html:57-76 ainda guarda access_token/returnTo no storage da origem e limpa a URL. Depois App.jsx:104-106 redireciona para app.laboratoriodecozinha.com.br via getCanonicalAppRedirectUrl (src/lib/… |
| 466 | A | Baixo | package.json:21 | Motores centrais de receita não têm teste em scripts/ nem no maintenance:check | ❌ aberto | Nenhum script em scripts/*.mjs importa motorReceita, custoReceita, rendimentoReceita, cardapioPeriodo, explodirReceitaCarrinho, forkReceita ou ingredienteReceitaCalc. package.json:32 (maintenance:chec… |
| 467 | A | Baixo | scripts/test-trial-7-em-30.mjs:1 | test-trial-7-em-30.mjs não é executado por nenhum npm script nem pelo maintenance:check | ❌ aberto | grep 'trial-7' em package.json e .github/ não retorna nada no HEAD; o arquivo continua em scripts/test-trial-7-em-30.mjs sem chamador. |
| 468 | A | Baixo | src/components/comunicacao/CampanhasTab.jsx:20 | Envio de campanha sem catch: 403/500 viram rejeição não tratada e sem feedback | ❌ aberto | Arquivo sem commits desde 883ecee. handleTeste (CampanhasTab.jsx:20-32) e handleConfirmarDisparo (34-45) continuam com try/finally sem catch em torno de base44.functions.invoke('campanhaEmail'). |
| 469 | A | Baixo | src/components/layout/TopBarSearch.jsx:38 | Busca do topo carrega até 5000 registros por tipo e pode ignorar itens além da página máxima do SDK | ❌ aberto | Sem mudanças desde a base. TopBarSearch.jsx:38, 45 e 52 ainda chamam Receita/Ingrediente/Cardapio.list('-updated_date', 5000), enquanto fetchAllPages.js documenta um limite de 500 por requisição. |
| 470 | A | Baixo | src/components/receita/NovaReceitaIA.jsx:232 | Filtro de tags para doces compara 'Sem Glúten'/'Sem Lactose' com tags cadastradas 'Sem glúten'/'Sem lactose' | ❌ aberto | NovaReceitaIA.jsx:232 mantém TAGS_PERMITIDAS_DOCES = ['Sem Glúten','Sem Lactose',...]; linhas 234-236 fazem includes e t.nome === nome com comparação exata. O prompt (linha 186) usa 'Sem glúten' na li… |
| 471 | A | Baixo | src/components/receita/NovaReceitaIA.jsx:92 | Chave de cache ['ingredientes'] compartilhada entre fetchAllPages (todos) e list(500): lista pode ficar truncada | ❌ aberto | NovaReceitaIA.jsx:90-93 continua com queryKey ['ingredientes'] + Ingrediente.list('-nome', 500), assim como EditItemDialog.jsx:21-22. Outros 14 componentes usam a mesma chave com fetchAllPages (ex.: I… |
| 472 | A | Baixo | src/components/receita/NovoIngredienteRapido.jsx:43 | 'Novo ingrediente' rápido oferecido a usuários comuns, mas Ingrediente.create é admin-only na RLS | ❌ aberto | NovoIngredienteRapido.jsx:43 ainda chama Ingrediente.create. base44/entities/Ingrediente.jsonc:109 mantém create com role admin. AddIngredienteDialog.jsx:250 e NovaReceitaManual.jsx:707 exibem o botão… |
| 473 | A | Baixo | src/components/tags/TagSelector.jsx:56 | Criação de tags por usuário comum falha silenciosamente (RLS admin-only) e o erro é engolido | ❌ aberto | TagSelector.jsx:55-61: Tag.create com catch vazio ('ignora duplicatas'). base44/entities/Tag.jsonc:20 mantém create com role admin. Nenhum commit desde a base. |
| 474 | A | Baixo | src/lib/AuthContext.jsx:113 | Aceite de termos após OAuth usa critério diferente do servidor (presença vs versão vigente) | ❌ aberto | AuthContext.jsx:114 ainda testa !termos_aceitos_em \|\| !termos_versao_aceita. O servidor (registrarAceiteTermos/entry.ts:18-22) compara com VERSAO_TERMOS_ATUAL/VERSAO_PRIVACIDADE_ATUAL. O diff do HEA… |
| 475 | A | Baixo | src/lib/cardapioPeriodo.js:107 | atualizarCardapioPeriodo desloca datas dos itens uma a uma sem rollback antes de atualizar o cabeçalho | ❌ aberto | Arquivo sem commits desde 883ecee. cardapioPeriodo.js:107-117 faz um loop de CardapioPeriodoItem.update sequenciais; o CardapioPeriodo.update só vem na linha 131, sem compensação se algo falhar no mei… |
| 476 | A | Baixo | src/lib/conversorMedidas.js:214 | Pré-visualização de conversão na importação por IA não entende plurais/parênteses que o backend converte | ❌ aberto | conversorMedidas.js sem commits. normalizarMedidaLegacy (214-230) e converterMedida (277+) não removem parênteses nem tratam plurais. O backend converterMedidasReceitas/entry.ts:72-74 continua normali… |
| 477 | A | Baixo | src/lib/custoContexto.js:58 | carregarContextoCustosReceitas dispara 3 requisições por receita mais a carga completa de Ingredientes a cada chamada | ❌ aberto | custoContexto.js sem commits. As linhas 54-77 ainda fazem ids.map com fetchAllFilteredPages para IngredienteReceita, InsumoReceita e IngredienteEsquecidoReceita, mais carregarIngredientesEfetivosCusto… |
| 478 | A | Baixo | src/lib/custoReceita.js:120 | Regra 'proporcional=false mantém quantidade fixa' não é aplicada pelo motor de custos nem pelo escalonamento | ❌ aberto | custoReceita.js:120 continua com quantidadeLiquida = quantidade_por_porcao * porcoesBase * fatorSeguro, sem olhar item.proporcional. A regra segue documentada em base44/entities/IngredienteReceita.jso… |
| 479 | A | Baixo | src/lib/explodirReceitaCarrinho.js:341 | explodirReceitaParaCarrinho conta duas vezes filhos de sub-receita em cache e explode o fator sem rendimento | ❌ aberto | O arquivo tem 43 linhas (a linha 341 não existe). Código idêntico ao da base: 18-33 não filtra subreceita_parent_id/subreceita_cache, e 25 usa o fallback subQtdTotal/subPorcoesBase. Hoje não tem chama… |
| 481 | A | Baixo | src/lib/fichaCustosCalc.js:42 | Detalhe de ingredientes da Ficha de Custos não aplica as exclusões do motor canônico (nome divergente / referência ausente) | ❌ aberto | fichaCustosCalc.js sem commits. As linhas 38-54 calculam todo item com calcularItemIngredienteReceita, mesmo com ingRef nulo ou nome divergente. custoReceita.js:92-118 exclui esses casos. |
| 482 | A | Baixo | src/lib/query-client.js:11 | retry:1 global inclui erros 4xx (401/403/404) | ❌ aberto | query-client.js:11 mantém retry: 1 fixo, sem função que exclua status 4xx. Nenhum commit desde a base. |
| 483 | A | Baixo | src/lib/statusAssinaturaUsuario.js:7 | diasEntreHoje usa fuso do navegador enquanto as demais cópias usam America/Sao_Paulo | ❌ aberto | statusAssinaturaUsuario.js:7-14 continua com new Date(`${dataStr}T00:00:00`) e hoje.setHours(0,0,0,0), no fuso local. O diff do HEAD só adicionou labelPlano, PLANO_LABEL e ORIGEM_CADASTRO_LABEL. |
| 484 | A | Baixo | src/lib/sugerirUnidadeCompra.js:32 | Sugestão de unidade de compra por substring gera falsos positivos (ex.: 'Pimentão vermelho' → litro) | ❌ aberto | sugerirUnidadeCompra.js:32 ainda usa lower.includes(p) com PALAVRAS_LIQUIDO. 'mel' casa com 'vermelho' e 'rum' casa com outras palavras. Nenhum commit desde a base. |
| 485 | A | Baixo | src/lib/termosVersao.js:1 | Versão vigente dos Termos duplicada em duas constantes sem teste de sincronização | ❌ aberto | src/lib/termosVersao.js:1-2 e base44/shared/versaoDocumentosLegais.ts:1 definem VERSAO_TERMOS_ATUAL em separado. Nenhum script em scripts/ compara as duas. |
| 486 | A | Baixo | src/pages/Conta.jsx:94 | Conta.jsx grava campos de endereço no User que não existem no schema User.jsonc | ✅ corrigido | O commit f7975cde (12/09) adicionou logradouro, numero, complemento, bairro, cidade e estado em base44/entities/User.jsonc:175-210, e cep/cidade_uf/endereco foram documentados. O payload em Conta.jsx:… |
| 487 | A | Baixo | src/pages/CustosCalcular.jsx:295 | Popover 'Ingredientes esquecidos' mostra cache custo_total × qtd, diferente do valor canônico | ❌ aberto | CustosCalcular.jsx:295 mantém custoEscalado: Number(item.custo_total \|\| 0) * qtd. Nenhum commit no arquivo desde a base. |
| 488 | A | Baixo | src/pages/PerCapita.jsx:33 | Sobreposições de per capita do usuário listadas com limite padrão de 50 | ❌ aberto | PerCapita.jsx:31-34 continua com base44.entities.PerCapitaUsuario.list(), sem limite nem paginação. Nenhum commit desde a base. |
| 489 | A | Baixo | src/pages/ReceitaAberta.jsx:871 | Remover item em receita de catálogo faz o fork mas não remove o item e exibe 'Item removido' | ❌ aberto | Agora em ReceitaAberta.jsx:870-881 (deslocado +1). `if (forked) return receitaId;` na linha 872 ainda sai antes do delete, e o onSuccess na linha 880 mostra toast 'Item removido'. |
| 490 | A | Baixo | src/pages/ReceitaAberta.jsx:436 | commitTotalGrams grava peso_pre_preparo_total com fator sobre total local não persistido | ❌ aberto | Agora em ReceitaAberta.jsx:437-465. baseTotal = quantidadeTotal (estado local) e fatorRescale = g/baseTotal (446) ainda gravam peso_pre_preparo_total na linha 451. Código idêntico ao da base. |
| 491 | A | Baixo | src/pages/ReceitaAberta.jsx:153 | Cada abertura de receita baixa o catálogo inteiro de receitas (fetchAllPages) só para resolver nomes de sub-receita | ❌ aberto | ReceitaAberta.jsx:156-159 mantém useQuery ['receitas-basicas'] com fetchAllPages(base44.entities.Receita, '-nome'). O diff do HEAD só adicionou AvisoEscalaTrial. |
| 492 | A | Baixo | src/pages/ResetPassword.jsx:41 | ResetPassword aceita senha fraca (8 caracteres) enquanto o cadastro exige maiúscula, minúscula e número | ❌ aberto | ResetPassword.jsx:47 ainda valida só newPassword.length < 8. src/lib/registerValidation.js:10 exige [a-z], [A-Z] e \d. Os commits recentes mexeram só em returnTo e na tradução de erros. |
| 500 | B | Crítico | src/pages/OrcamentoCardapio.jsx:43 | Preço final do Orçamento da Refeição >= R$ 1.000 lido como R$ 0 e regravado como 0 | ✅ corrigido | O bug existia: em 883ecee, Number("1.500,00".replace(",",".")) dava NaN e virava 0. Corrigido no commit 0ef27820 (11/09), que criou src/lib/precoOrcamento.js (parsePrecoBR descarta o separador de milh… |
| 501 | B | Crítico | src/pages/OrcamentoEvento.jsx:35 | Preço final do Orçamento do Evento >= R$ 1.000 lido como R$ 0 e regravado como 0 | ✅ corrigido | Mesmo commit 0ef27820 (11/09). OrcamentoEvento.jsx:37 usa formatPrecoBR, e as linhas :45 e :58 usam parsePrecoBR, que remove os pontos de milhar antes de trocar a vírgula. Assim, "1.500,00" passa a va… |
| 502 | B | Alto | base44/functions/aplicarTagsAutomatico/entry.ts:160 | Tags automáticas criadas sem is_base/usuario_dono_id ficam invisíveis para não-admin | ❌ aberto | aplicarTagsAutomatico/entry.ts:160-166 monta ReceitaTag só com receita_id e tag_*, e grava via bulkCreate asServiceRole. Pela RLS de leitura em ReceitaTag.jsonc, só aparece para is_base=true ou usuari… |
| 503 | B | Alto | base44/functions/atualizarPrecosAutomatico/entry.ts:112 | Resultados da IA associados por índice global; lote com menos itens desloca preços | ❌ aberto | atualizarPrecosAutomatico/entry.ts:112 faz todosResultados.push(...resultadosLote) sem conferir se vieram 25 itens. As linhas :123-125 casam dados[i] com todosResultados[i]. Se a IA devolve N≠25 num l… |
| 504 | B | Alto | base44/functions/converterMedidasReceitas/entry.ts:24 | Frações mistas, vírgula decimal e ½ lidas como quantidade errada | ❌ aberto | Em converterMedidasReceitas/entry.ts:24, o loop por includes em DATA.fracoes casa "1/2" primeiro: "2 1/2" e "1 e 1/2" viram 0,5. No :31, parseFloat("1,5") dá 1. A regex do :104 não reconhece "½", e a… |
| 505 | B | Alto | base44/functions/converterMedidasReceitas/entry.ts:206 | Sobrescreve quantidades corretas e estima sólidos como ml≈g em receitas de todos os usuários | ❌ aberto | No :169, Receita.list roda asServiceRole sem filtrar dono. Nas linhas :206-216, qualquer conversão sobrescreve quantidade_por_porcao, inclusive a do tipo solido_estimado (:131-139), que usa ml como g.… |
| 506 | B | Alto | base44/functions/corrigirPorcoesBaseImportacao/entry.ts:30 | Altera receitas pessoais de qualquer usuário com mesmo nome das sopas | ❌ aberto | No :30, Receita.filter({nome:{$in:SOPAS}}) não filtra is_base, e forkReceita.js:55-63 mantém o nome na cópia. As linhas :84-93 forçam porcoes_base=1, per_capita 400 e a_validar. A função é acionável p… |
| 507 | B | Alto | base44/functions/corrigirRendimentoReceitas/entry.ts:64 | Grava peso_pre_preparo_total com regra pré-Fase 8 e invalida rendimentos confirmados | ❌ aberto | No backend (:64-68), os filhos sempre entram na soma e o marcador é ignorado. A regra canônica (rendimentoReceita.js:32-64) faz o contrário com cache v2: conta o marcador e ignora os filhos. O snapsho… |
| 508 | B | Alto | base44/functions/fundirIngredientes/entry.ts:134 | Exclui a origem sem reapontar IngredienteUsuario, PrecoIngredienteCliente, CarrinhoItem, Sinonimos e MedidaCaseira | ❌ aberto | A ação excluir_origem (:134-143) só confere IngredienteReceita e depois apaga o Ingrediente. Não reaponta IngredienteUsuario, PrecoIngredienteCliente, CarrinhoItem, SinonimosIngredientes, MedidaCaseir… |
| 509 | B | Alto | base44/functions/fundirIngredientes/entry.ts:61 | Fusão soma/apaga linhas de cache de sub-receita como ingredientes diretos | ❌ aberto | O filtro das linhas :61-64 é tipo='ingrediente' e não exclui subreceita_parent_id/subreceita_cache; os filhos de cache também são tipo 'ingrediente' (sincronizarSubreceita:180-192). Como destinoPorRec… |
| 510 | B | Alto | base44/functions/importarIngredientesCsv/entry.ts:62 | Importação CSV zera preco_por_g_rs de existentes quando não há colunas de preço | ❌ aberto | importarIngredientesCsv/entry.ts:62 inicia preco_por_g_rs=0 e :75 põe o valor no payload. A limpeza do :78 só remove undefined, então o 0 fica. Para ingredientes existentes, toUpdate (:86) e bulkUpdat… |
| 511 | B | Alto | docs/12-JOBS-AND-AUTOMATIONS.md:7 | Janelas do gate agendado incompatíveis com horários das automações da plataforma | ❌ aberto | Janelas do gate (hora SP): TrialExpirando 07:55–08:25, TrialVencido 07:45–08:15, PlanoVencendo 08:05–08:35, Lembrete 08:15–08:45. Os crons em base44/workflows (d68bc17d) disparam às 09:00, 09:05, 09:1… |
| 512 | B | Alto | src/components/comunicacao/TemplateEmailDialog.jsx:77 | Editar template cria registro sem status e desliga envio silenciosamente | ❌ aberto | TemplateEmailDialog.jsx:77 cria o template sem status; o default do schema é "rascunho". templateEmail.ts:14 só envia com status "ativo", e sem template o envio é permitido. TransacionaisTab.jsx:200 j… |
| 513 | B | Alto | src/components/ingrediente/ficha/MedidaSinonimosCard.jsx:26 | Medidas caseiras v2 (sem alimento) invisíveis na ficha, tela Medidas, cardápio e exportação | ❌ aberto | MedidaSinonimosCard.jsx:26 busca por m.alimento, mas normalizarPayloadMedidaCaseira (medidaCaseiraModel.js:90) apaga alimento, e CadastrarMedidaDialog cria o registro v2 por ele. MedidasCaseiras.jsx:1… |
| 514 | B | Alto | src/lib/fichaCardapioPDF.js:127 | ≈ / ⚠ / ↳ / ▸ saem ilegíveis nos PDFs jsPDF (fontes padrão WinAnsi) | ❌ aberto | Aparecem em fichaCardapioPDF.js:127 (≈), fichaCustosPDF.js:138 (↳), receitasCardapioPDF.js:132 (▸) e dossieEventoPDF.js:84,168,172 (⚠). Os PDFs usam helvetica/times padrão do jsPDF, que ficam em WinAn… |
| 515 | B | Alto | src/lib/relatoriosPlanejamentoPDF.js:255 | Ficha de Custos e Dossiê usam cache Receita.custo_total, divergindo da Etapa 3 (motor canônico) | ❌ aberto | relatoriosPlanejamentoPDF.js:255 e dossieEventoCalc.js:63 chamam custoPorKgPronto sem contexto, e custoReceita.js (custoPorGrama) cai no cache Receita.custo_total. Já EtapaCardapio.jsx:131-135 passa i… |
| 516 | B | Alto | src/lib/relatoriosPlanejamentoPDF.js:46 | Relatórios do Evento carregam só 500 receitas; pratos ficam sem custo/descritivo | ❌ aberto | relatoriosPlanejamentoPDF.js:46 usa Receita.list("-nome", 500) sem paginar. Receita fora do receitaMap sai com custo 0 (semCusto em :257) e descritivo vazio (orcamentoEventoCalc.js:20). O loader també… |
| 517 | B | Alto | src/pages/CardapioAberto.jsx:309 | Buffet: quantidade em kg passada ao motor como gramas (custo ~1000x menor, fichas 0,00 kg) | ❌ aberto | No Buffet, CardapioAberto.jsx:308-315 grava per_capita e quantidade_total_g em kg (CardapioTabelaReceitas.jsx:33 lê o campo como kg). Mas custoEscalado recebe esse valor como gramas (:375-376 e custoC… |
| 518 | B | Alto | src/pages/CustosBloqueado.jsx:123 | Ativar trial devolve o usuário à tela de bloqueio (cache do entitlement não invalidado) | ❌ aberto | CustosBloqueado.jsx:124-126 navega para /custos sem invalidar ["custos-entitlement", user.id]. CustosRoute.jsx:20-35 lê esse cache, e query-client.js:8-10 usa refetchOnMount:false com gcTime de 15 min… |
| 519 | B | Alto | src/pages/CustosCalcular.jsx:220 | Formação avançada congela preço/margem; mudanças de custo geram margem_estimada inconsistente | ❌ aberto | Com formacaoPreco, CustosCalcular.jsx:220-227 fixa preço e margem. Alterar quantidade, insumos adicionais ou exclusões (:300-303), ou restaurar o rascunho (:65), não limpa formacaoPreco. O :387 grava… |
| 520 | B | Alto | src/pages/Receitas.jsx:217 | Exclusão de receita apaga só IngredienteReceita e deixa tags, insumos, esquecidos, itens de cardápio e marcadores órfãos | ❌ aberto | Receitas.jsx:217-221 apaga só IngredienteReceita e a Receita. Ficam órfãos ReceitaTag, InsumoReceita, IngredienteEsquecidoReceita, CardapioReceita e marcadores subreceita em outras receitas. ReceitaAb… |
| 521 | B | Alto | supabase/migrations/20260904141551_operational_schema_and_rls.sql:754 | CHECK margin_pct >= 0 rejeita fichas com margem negativa | ❌ aberto | A migração ainda tem, no :754, check (margin_pct >= 0 and margin_pct < 100). Na origem, preço abaixo do custo gera margem negativa (motorCustos.js:102-106, CustosCalcular modo preço), e salvarCalculoC… |
| 522 | B | Médio | base44/functions/aplicarTagsAutomatico/entry.ts:89 | Regras 'Sem Glúten'/'Sem Lactose' geram alegações de restrição alimentar falsas | ❌ aberto | entry.ts:89-106 sem mudança desde a base: em doces, 'Sem Glúten' só exige ausência de 'farinha de trigo' (aveia, farinha de rosca, biscoito, cevada passam) e 'Sem Lactose' só procura lista curta (crea… |
| 523 | B | Médio | base44/functions/atualizarPrecosAutomatico/entry.ts:6 | 'LATICÍNIOS' em caixa alta não casa com o enum 'Laticínios'; laticínios ficam fora da atualização | ❌ aberto | entry.ts:6 CATS_VOLATEIS ainda traz "LATICÍNIOS"; o enum em base44/entities/Ingrediente.jsonc:11 é "Laticínios". O filtro includes() na linha 90 compara exato, então laticínios nunca entram. Arquivo s… |
| 524 | B | Médio | base44/functions/atualizarPrecosAutomatico/entry.ts:80 | Execução manual por admin consome o cooldown de 144 h e cancela o próximo agendamento; roda por padrão sem configuração | ❌ aberto | shared/protecoesAutomacao.ts:193-208: admin passa fora da janela e mesmo assim grava automation_last_started (adquirirCooldownAutomacao:141-148). A segunda seguinte, menos de 144 h depois, recebe 'coo… |
| 525 | B | Médio | base44/functions/backfillMedidasCaseiras/entry.ts:18 | Loop infinito: skip é calculado mas nunca passado ao list() | ❌ aberto | entry.ts:18 list('-created_date', limit) sem skip; linha 23 incrementa skip sem usar. Com ≥200 IngredienteReceita, batch.length===200 sempre e o while(hasMore) não termina (até o timeout). Arquivo ina… |
| 528 | B | Médio | base44/functions/fundirIngredientes/entry.ts:154 | Prévia da fusão filtra Receita com array literal em vez de $in, divergindo da convenção | ⊘ refutado | O SDK Base44 documenta array como atalho de 'qualquer valor listado' (entities.types.d.ts:216, 227 e 413), então {id: idsChunk} (linha 154) e {receita_id: receitaIdsBatch} (linha 76) equivalem a $in.… |
| 529 | B | Médio | base44/functions/importarIngredientesCsv/entry.ts:58 | CSV com vírgula decimal sem aspas desloca colunas e importa preço errado silenciosamente | ❌ aberto | parseCSV (linhas 131-158) separa em toda vírgula fora de aspas, e as linhas 48-91 não comparam row.length com o header. Uma linha com '5,99' vira dois campos, desloca preco_por_g_rs e fator_correcao,… |
| 530 | B | Médio | base44/functions/inicializarTrialLaboratorioCustos/entry.ts:73 | Tipo 'custos_trial_ativado' não existe nos enums de LogEmail/TemplateEmail; log pode falhar após criar o acesso | ❌ aberto | entry.ts:8 TIPO_EMAIL='custos_trial_ativado', com log na linha 73 depois do create do acesso (linha 50). Os enums em LogEmail.jsonc:31-50 e TemplateEmail.jsonc:7-24 seguem sem esse valor (d6fedc46 só… |
| 531 | B | Médio | base44/functions/padronizarCaixaNomes/entry.ts:59 | Reescreve nomes de eventos/cardápios/receitas de todos os usuários e rebaixa siglas em ingredientes | ⊘ refutado | A função aplica exatamente a regra de produto de src/lib/textCase.js:5-15 (MAIÚSCULAS para receita/cardápio/evento, sentence case para ingrediente), que a UI já impõe em todo salvamento (NovaReceitaMa… |
| 532 | B | Médio | base44/functions/preencherPerCapitaCategoria/entry.ts:20 | Usa categoria 'Lanche' (renomeada para 'Lanches') e aplica PC a receitas pessoais | ❌ aberto | entry.ts:20 mapeia "Lanche", mas o enum em Receita.jsonc:29 é "Lanches" ("Pratos Principais" também não existe no enum). Linha 31 lista todas as Receitas sem filtrar is_base, e a linha 62 faz bulkUpda… |
| 533 | B | Médio | base44/functions/registrarDiaUsoTrial/entry.ts:51 | Reativa trials legados já 'vencido', contrariando a regra documentada | ❌ aberto | entry.ts:51 inclui status 'vencido' em trialLegadoMigravel. Linha 67 volta para 'trial', e garantirCustosTrial (19-28) reativa o trial de Custos anterior. Diverge de docs/security/SUBSCRIPTION_ACCESS_… |
| 534 | B | Médio | base44/functions/salvarCalculoCusto/entry.ts:63 | Confia nos totais/snapshots do cliente sem recomputar nem validar a composição do custo_total | ⊘ refutado | entry.ts:63-87 valida a composição: custo_total = soma dos itens (cost_composition_mismatch), custo unitário, custo por porção e snapshot técnico = ingredientes + insumos + esquecidos. A ficha é do pr… |
| 535 | B | Médio | base44/functions/saneamentoIngredientes/entry.ts:62 | Vincula linhas quebradas ao primeiro ingrediente com nome parcialmente parecido e prioriza nome sobre ID | ❌ aberto | entry.ts:62-74 usa includes() nos dois sentidos e pega o primeiro da iteração (ex.: 'arroz' casa 'arroz arbóreo'). Linhas 81-96 reapontam IDs válidos quando o nome em cache diverge. Sem dry-run; grava… |
| 536 | B | Médio | base44/functions/sanearCustosPendentes/entry.ts:556 | Modo aplicar altera preço mestre, custo_comportamento e fonte de sub-receita sem invalidar caches dependentes | ❌ aberto | entry.ts:555-561 faz bulkUpdate em Ingrediente/IngredienteReceita (fonte e reaproveitamento, 328-358) sem chamar invalidarCustosPorDependencias; o arquivo nem importa a função. A UI (AuditoriaCustosRe… |
| 537 | B | Médio | base44/functions/sanearCustosPendentes/entry.ts:304 | Conta filhos de cache desatualizados como 'fixáveis', mas a aplicação nunca ressincroniza os caches | ❌ aberto | entry.ts:303-331 corrige só o item fonte (itemFonteEditavel) e conta o filho como fixável. O fluxo AuditoriaCustosReceitas.jsx:156-158 chama sincronizarSubreceita antes (só migrar_preparacoes_exatas)… |
| 538 | B | Médio | base44/functions/verificarExcluirIngrediente/entry.ts:34 | Exclusão de ingrediente apaga linhas de cache de sub-receita de todos os usuários e deixa referências órfãs | ❌ aberto | entry.ts:34 faz deleteMany({ingrediente_id}) em todas as receitas, inclusive pessoais e filhos de cache. Linha 54 apaga o Ingrediente sem tratar IngredienteEsquecidoReceita, IngredienteUsuario, PrecoI… |
| 539 | B | Médio | base44/shared/acessoLaboratorioCustos.ts:16 | Trial da plataforma ignora modulo_habilitado/trial_habilitado e deriva acesso do perfil, contrariando CONTEXT.md e o schema | ❌ aberto | acessoLaboratorioCustos.ts:16-18 libera Custos quando plano_atual e status são 'trial', antes de checar config.modulo_habilitado (linha 21), e ignora trial_habilitado. CONTEXT.md:38-40 diz que a autor… |
| 540 | B | Médio | docs/security/GO_LIVE_OPERATIONAL_QA_2026-08-23.md:179 | Go-live QA diz Renovação 'Em breve' e checkout só mensal/anual; o código já vende renovação e planos do Custos | ❌ aberto | O doc (linha 179, no presente, 'No estado atual') não foi atualizado, e RLS_AUDIT:478 aponta para ele. Já criarPagamentoMercadoPago/entry.ts:22 aceita renovacao, custos_mensal, custos_anual e ofertas… |
| 541 | B | Médio | index.html:5 | favicon.svg e manifest.json ficam fora do build (não existem em dist/) | ⊘ refutado | O Vite processa os href de index.html na raiz: dist/index.html:5 e :29 apontam para /assets/favicon-C-aBEUBU.svg e /assets/manifest-RCtMKkYf.json, e os dois estão em dist/assets. Resíduo menor: o mani… |
| 542 | B | Médio | scripts/test-laboratorio-custos-fechamento.mjs:59 | Asserções de RLS passam mesmo com o histórico de custos aberto | ❌ aberto | Linhas 59-64 usam schema.includes() sobre o arquivo inteiro: '"update"' e '"role": "admin"' podem estar em blocos diferentes, e '"data.user_id"' não é amarrado ao read. Um update/read afrouxado contin… |
| 543 | B | Médio | scripts/test-tenant-isolation-e2e-temp.mjs:143 | expectDenied aceita qualquer exceção (status null) como negação de acesso | ❌ aberto | test-tenant-isolation-e2e-temp.mjs:141-151: no catch, a linha 148 aceita status == null. TypeError, falha de rede ou bug no próprio fn contam como 'negado' e o teste passa. Arquivo sem mudanças desde… |
| 544 | B | Médio | src/components/CalculadoraCusto.jsx:134 | Calculadora apaga o '0' digitado: não dá para informar valores menores que 1 (ex.: 0,99) | ❌ aberto | CalculadoraCusto.jsx:134 e :150: onChange faz parseFloat(v) \|\| "". Digitar '0' vira "" e o input controlado limpa o campo, então '0,99' não sai digitando normalmente (só colando ou começando por '.'… |
| 545 | B | Médio | src/components/comunicacao/CampanhasTab.jsx:34 | Disparo/teste de campanha sem tratamento de erro e sem exibir destinatários bloqueados | ❌ aberto | CampanhasTab.jsx:20-44: try/finally sem catch. Um 4xx/5xx do invoke vira rejeição não tratada, sem toast. O backend devolve 'bloqueados' (campanhaEmail/entry.ts:36 e :48), mas o toast da linha 39 só m… |
| 546 | B | Médio | src/components/comunicacao/TransacionaisTab.jsx:153 | Aba Transacionais mostra 'Rascunho' para e-mails enviados pelo fallback | ❌ aberto | Agora em TransacionaisTab.jsx:198-201: sem TemplateEmail, mostra 'Rascunho'. Mas shared/templateEmail.ts:14 envia (ativo=true) quando não há template, e ativarAssinaturaPagamento.ts:113 manda pagament… |
| 547 | B | Médio | src/components/comunicacao/UsuariosTab.jsx:152 | Ação em massa 'Ativar' grava só status_assinatura='ativo' (sem plano/data), quebrando o trial 7_em_30 e mascarando assinaturas expiradas | ❌ aberto | UsuariosTab.jsx:168-181: aplicarStatus faz User.update({status_assinatura}) e nada mais. acessoAssinatura.js:43 só limita 7 dias se status==='trial', então trial vira 30 dias livres. Com data vencida,… |
| 548 | B | Médio | src/components/comunicacao/UsuariosTab.jsx:189 | Exclusão de usuários feita direto do cliente, sequencial e sem cascata | ◐ parcial | 2d3b4f7c (16/09): UsuariosTab.jsx:218 chama a function excluirUsuarioAdmin (servidor, admin-only, com cascata e auditoria). A cascata ainda não cobre CalculoCustoItem, ReceitaTag, CardapioTag, Ingredi… |
| 549 | B | Médio | src/components/configuracoes/DadosEmpresaSection.jsx:70 | 'Dados da empresa/marca' e 'Preferências gerais' gravam AppConfig que nenhum código lê (logo nunca aparece nos PDFs) | ❌ aberto | DadosEmpresaSection.jsx:67-69 grava empresa_nome/empresa_logo_url e :94 promete a logo nos PDFs. PreferenciasGeraisSection.jsx:10 grava unidade_padrao_receita. grep em src/ e base44/ não acha nenhum l… |
| 550 | B | Médio | src/components/custos/AdicionarDespesaDialog.jsx:55 | Parser do valor mensal remove todos os pontos: '1500.50' vira R$ 150.050,00 | ❌ aberto | AdicionarDespesaDialog.jsx:51-58: texto.replace(/\./g,'').replace(',','.'), então '1500.50' vira 150050. O campo (:169) é texto livre com inputMode=decimal, sem máscara nem aviso. Nenhum commit no arq… |
| 551 | B | Médio | src/components/ingrediente/IngredienteFormDialog.jsx:113 | CalculadoraCusto abre com valores do formulário anterior (ou vazios) ao reabrir o diálogo de ingrediente | ❌ aberto | IngredienteFormDialog.jsx:114 passa form.peso_embalagem_g como initial*, mas resetForm só roda no onOpenAutoFocus (:56), depois da montagem. CalculadoraCusto.jsx:62-65 usa useState(initial*) sem ressi… |
| 552 | B | Médio | src/components/layout/TopBarSearch.jsx:61 | Busca global omite receitas pessoais autorais e usa created_by_id em vez de usuario_dono_id | ❌ aberto | TopBarSearch.jsx:69 mostra ao não-admin só is_base===true (troca por fork). Receitas pessoais sem forked_from_id nunca aparecem. :65 usa created_by_id, enquanto a regra canônica (receitaPessoal.js:3-4… |
| 553 | B | Médio | src/components/planos/PixForm.jsx:49 | Polling do PIX para em silêncio (troca de aba ou timeout de 10 min) com a tela ainda em 'Aguardando confirmação' | ❌ aberto | PixForm.jsx:55: setTimeout(pararPolling, 10 min) só limpa os timers, sem mudar estado, e :164-170 segue com spinner 'Aguardando confirmação'. O backend não define expiração do PIX (padrão MP maior). T… |
| 555 | B | Médio | src/lib/preferenciaIngredienteUsuario.js:131 | Salvar 'Meus dados de compra' sem quantidade/preço cria registro pessoal que sobrescreve unidade/embalagem do mestre com vazio/zero | ❌ aberto | preferenciaIngredienteUsuario.js:123-138 grava peso_embalagem_g=0 e unidade_compra='' sem validar. :64-70 (aplicarPreferencias) só ignora preços <=0; peso 0 e unidade '' sobrepõem o mestre. Ingredient… |
| 556 | B | Médio | src/lib/prePreparosCalc.js:46 | Relatório de Pré-preparos ignora a margem de segurança e o kg manual do prato | ❌ aberto | prePreparosCalc.js:45-46: fator = pc_g×totalPessoas/rendimento. A Etapa Cardápio (EtapaCardapio.jsx:128-129) e o Relatório de Produção/Dossiê usam qtd_kg = qtd_kg_manual ?? pessoas×PC×(1+margem). Sem… |
| 557 | B | Médio | src/lib/printIsolado.js:30 | printarElementoIsolado registra onload após document.close() e remove o iframe 500 ms após print() | ⊘ refutado | printIsolado.js:20-35 copia o <link rel=stylesheet> do build (dist/index.html) para o iframe, então o load fica pendente e só dispara depois da atribuição do onload (:35). print() é bloqueante nos nav… |
| 558 | B | Médio | src/lib/receitasCardapioCalc.js:50 | Relatório 'Receitas do Cardápio' só casa medidas caseiras legadas (alimento/utensilio); as do modelo v2 nunca aparecem | ❌ aberto | receitasCardapioCalc.js:50 casa só m.alimento e :99 usa medida.utensilio. medidaCaseiraModel.js:90-91 (normalizarPayloadMedidaCaseira) apaga alimento/utensilio nos registros v2, que só têm ingrediente… |
| 559 | B | Médio | src/lib/receitasCardapioPDF.js:261 | Sumário do caderno 'Receitas do Cardápio' aponta páginas erradas quando uma receita ocupa mais de uma página | ❌ aberto | receitasCardapioCalc.js:129 fixa pagina: i + 2. receitasCardapioPDF.js:27 (checkBreak) faz addPage dentro da receita (chamado em ~:118/166/177/186) e também no próprio sumário (:65), deslocando as pág… |
| 560 | B | Médio | src/lib/relatoriosPlanejamentoPDF.js:193 | Relatório de Produção do Evento ignora a quantidade ajustada manualmente de Doces & Bebidas | ❌ aberto | relatoriosPlanejamentoPDF.js:193 recalcula total = pessoas×percentual/100×media e ignora item.quantidade_ajustada. Tela e Dossiê usam qtdFinalEfetiva (docesBebidasCalc.js:30-31; dossieEventoCalc.js:87… |
| 561 | B | Médio | src/lib/statusAssinaturaUsuario.js:16 | computeStatusUsuario ignora data_expiracao para 'ativo' e rotula trial vencido como 'Trial expirando' | ❌ aberto | statusAssinaturaUsuario.js:16-35: 'ativo' vira 'Ativo' sem olhar a data, e trial com dias<=3 (inclui negativos) vira 'Trial expirando'. Mitigado pelo job diário enviarTrialVencido (08:00 BRT, shared/a… |
| 562 | B | Médio | src/lib/useSalvarIngrediente.js:24 | Salvar ingrediente recalcula preco_por_g_rs=0 quando o peso da embalagem está vazio, zerando preços vindos de CSV/IA | ❌ aberto | useSalvarIngrediente.js:24-26 dá preco_por_g=0 sem peso, e :67 grava isso no mestre. importarIngredientesCsv/entry.ts:65-66 aceita preco_por_g_rs direto sem peso nem preço de embalagem; aí a validação… |
| 563 | B | Médio | src/pages/Cardapios.jsx:152 | Excluir Refeição na listagem deixa CardapioReceita/CardapioInsumo/CardapioTag órfãos | ❌ aberto | Cardapios.jsx:150-154: só base44.entities.Cardapio.delete(id), sem apagar os filhos. Não há automação de entidade nem function de cascata para Cardapio (grep 'Cardapio.delete' só acha este ponto e exc… |
| 564 | B | Médio | src/pages/Cardapios.jsx:185 | Duplicar refeição perde comportamento_custo/escala_base_unidades dos insumos (custo da cópia diverge) | ❌ aberto | Cardapios.jsx:185-193 copia só insumo_id, nome, quantidade, unidade e custos. Os campos existem em CardapioInsumo.jsonc:33-46 e escalarInsumoCardapio (escalonamentoCustos.js:121-133) volta ao padrão p… |
| 565 | B | Médio | src/pages/CustosCalcular.jsx:197 | Insumo adicional sem descrição entra no custo total mas não nos itens; servidor rejeita a ficha com erro genérico | ❌ aberto | CustosCalcular.jsx:197-200 soma todo insumo com valor no custo_total, mas :403 filtra os itens sem descrição. salvarCalculoCusto/entry.ts:63-66 compara as somas e devolve 400 cost_composition_mismatch… |
| 566 | B | Médio | src/pages/ExportarReceita.jsx:108 | Página legada /exportar/:id gera 'R$ NaN' e '• undefined — NaN g' com grupos, e usa fórmula de custo obsoleta | ❌ aberto | ExportarReceita.jsx:108-125 não pula tipo 'grupo'. NovaReceitaIA.jsx:425-430 cria grupo sem quantidade_por_porcao, e :142 soma NaN; :155 imprime '• undefined'. O custo usa qtd×fc×preco_por_g_rs do mes… |
| 567 | B | Médio | src/pages/MedidasCaseiras.jsx:145 | Tela admin Medidas Caseiras grava só campos legados; editar registro v2 não altera peso_g/ingrediente_id | ❌ aberto | MedidasCaseiras.jsx:145-150 grava alimento/utensilio/referencia_g sem normalizarPayloadMedidaCaseira. getPesoPorMedidaG (medidaCaseiraModel.js:31-37) prefere peso_g e getIngredienteIdMedida prefere in… |
| 568 | B | Médio | src/pages/NovaDicaCarmen.jsx:70 | Salvar dica da Carmen sem try/catch trava o formulário em caso de erro | ❌ aberto | NovaDicaCarmen.jsx:55-74: setSalvando(true), depois await DicaCarmen.create sem try/catch/finally. Se falhar, salvando fica true, os botões (:177,:184) ficam desabilitados para sempre e a rejeição não… |
| 569 | B | Médio | src/pages/Planos.jsx:65 | Após pagamento aprovado ou trial ativado a sessão não é atualizada; ProtectedRoute continua bloqueando até recarregar | ❌ aberto | Planos.jsx:86-91: inicializarTrialUsuario seguido de navigate('/') sem checkUserAuth. CheckoutDialog.jsx:97/109: onSuccess=setResultadoPagamento, também sem refresh. AuthContext não recarrega por foco… |
| 570 | B | Médio | src/pages/RelatorioPoucosIngredientes.jsx:28 | Relatório 'Poucos Ingredientes' fica em spinner eterno se a carga falhar e atualiza estado após desmontar | ❌ aberto | RelatorioPoucosIngredientes.jsx:28-63: IIFE async sem try/catch; se um fetchAllPages falhar, setLoading(false) nunca roda e o spinner fica eterno, sem toast. Não há flag de cancelamento (setState após… |

