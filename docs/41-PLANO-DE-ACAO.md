# 41 — Plano de Ação 360°: Estabilidade, Onboarding, Vendas e Captação

**Versão:** 1.0 · **Data:** 11/09/2026 · **Responsável:** Carmen Reinstein · **Revisão:** trimestral
**Complementa:** `40-PLANO-CAPTACAO-USUARIOS.md` (estratégia de captação), `30-TROUBLESHOOTING.md` (erros conhecidos), `19-MIGRATION-PLAN.md` (migração Supabase/Vercel).

---

## 0. Resumo executivo

| Frente | Prioridade | Situação | Ação-chave |
|---|---|---|---|
| Estabilidade técnica | **P0** | Funil de pagamento com falhas de webhook e persistência | Corrigir assinatura do webhook, aprovação síncrona e orçamento **antes** de investir em aquisição |
| Onboarding (7 dias de trial) | P1 | Só existe e-mail de boas-vindas e aviso a 3 dias do fim | Sequência de 4 e-mails + barra de progresso do trial + mensagem no 1º "momento aha" |
| Conversão trial → pagante | P1 | 8 trials ativos, 1 pagante, nenhuma oferta de fim de trial | Oferta de 48h no fim do trial, plano anual como "2 meses grátis", recuperação de vencidos |
| Captação de clientes | P2 | Origem/segmento dos usuários não preenchidos (0/10) | Indicação, 3 parcerias, calendário Instagram, depois tráfego pago |
| Governança | contínuo | Este documento | Revisão mensal das métricas, atualização trimestral |

**Regra de ouro:** nenhum real em aquisição enquanto os itens P0 da seção 2 não estiverem com critério de aceite cumprido. Atrair usuários para um checkout que falha é desperdício e queima reputação.

---

## 1. Diagnóstico com dados reais (snapshot 11/09/2026)

### 1.1 Base comercial

| Indicador | Valor | Leitura |
|---|---|---|
| Usuários (não admin) | 10 | Base pequena: cada conversão pesa muito |
| Em trial | 8 | Onboarding é a alavanca imediata |
| Pagantes ativos | 1 | Conversão trial→pago ainda não validada |
| Vencidos | 1 | Nenhum fluxo de recuperação hoje |
| Origem / segmento preenchidos | 0 / 10 | Sem atribuição de canal; impossível medir CAC |

### 1.2 Pagamentos (87 tentativas históricas)

| Status | Qtd | Observação |
|---|---|---|
| rejected | 53 | Predominantemente cartão em homologação; inclui rejeições `high_risk` por falta de device fingerprint |
| estornado | 21 | Testes de estorno |
| pending | 9 | PIX sem confirmação — candidatos a `reprocessarPagamentoPix` |
| cancelled | 3 | — |
| approved | 1 | — |

### 1.3 Webhook Mercado Pago (121 notificações)

| Resultado | Qtd | Leitura |
|---|---|---|
| assinatura_invalida | **67 (55%)** | **P0.** Mais da metade das notificações é descartada: segredo desatualizado, header mal lido ou URL divergente da cadastrada no MP |
| processado | 42 | — |
| status_nao_final | 8 | Esperado |
| order_nao_encontrada | 4 | Notificações de ambiente cruzado (sandbox × prod) |

### 1.4 E-mails transacionais (73 envios)

| Indicador | Valor |
|---|---|
| Enviados / falhou | 50 / **23 (32%)** |
| Boas-vindas | 31 |
| Trial expirando | 5 |
| Trial vencido | 1 |
| Pagamento aprovado | 17 |

Uma taxa de falha de 32% em transacionais é inaceitável para o funil: o usuário que não recebe "trial expirando" não converte.

### 1.5 Qualidade dos dados de catálogo

| Indicador | Valor | Impacto |
|---|---|---|
| Ingredientes com preço zero | 44 / 663 | Custos de receita incompletos |
| Ingredientes com preço estimado por IA | 299 | Precisam de confirmação manual gradual |
| Ingredientes marcados "revisar" | 333 | Dívida de curadoria |
| Receitas-base sem per capita | 31 / 2.252 | Quebram o cálculo de eventos |
| Receitas com rendimento não confirmado | 2.252 (100%) | Campo `rendimento_status` nunca foi populado — precisa de backfill "legado" |
| Receitas com cache de custo incompleto | 669 | Reflexo dos ingredientes sem preço |

---

## 2. Frente P0 — Estabilidade técnica

Cada item segue: **causa provável → correção → teste de regressão → critério de aceite**. A ordem é a ordem de execução.

### 2.1 Webhook Mercado Pago — 55% de assinaturas inválidas
- **Causa provável:** `MERCADOPAGO_WEBHOOK_SECRET` fora de sincronia com o painel MP; validação HMAC usando `data.id` bruto quando o MP envia em minúsculo/maiúsculo divergente; notificações do sandbox chegando na URL de produção.
- **Correção:** usar `testarAssinaturaWebhookMP` com uma notificação real capturada; alinhar o manifest (`id`, `request-id`, `ts`) exatamente ao formato do MP; separar URL sandbox (`webhookMercadoPagoSandboxE2E`) da de produção no painel MP; regenerar e reconfigurar o segredo.
- **Regressão:** replay de 5 notificações reais (approved, rejected, refunded, pending, cancelled) → todas `processado`.
- **Aceite:** `assinatura_invalida` < 2% em 7 dias corridos, medido em `LogWebhookMercadoPago`.

### 2.2 Aprovação síncrona não libera plano nem envia e-mail
- **Causa provável:** `criarPagamentoMercadoPago` retorna `approved` mas o fluxo de ativação (`ativarAssinaturaPagamento` / `ativarCompraPagamento`) só roda no webhook.
- **Correção:** chamar o mesmo helper compartilhado de ativação no retorno síncrono, com idempotência pela `idempotency_key`/`mercadopago_order_id`, para que webhook e retorno síncrono convirjam.
- **Regressão:** cartão aprovado no sandbox → `User.plano_atual` atualizado, `AcessoLaboratorioCustosUsuario` criado quando aplicável, `LogEmail pagamento_aprovado = enviado`, sem duplicidade quando o webhook chegar depois.
- **Aceite:** 100% dos `approved` com `User` atualizado em < 10 s e exatamente 1 e-mail.

### 2.3 Webhook `order.refunded` retornando 502
- **Causa provável:** exceção não tratada em `revogarAcessoEstorno` quando o pagamento já está estornado ou o usuário foi excluído; MP repete a notificação e acumula erros.
- **Correção:** responder 200 sempre que a notificação for reconhecida (mesmo já processada) e registrar `resultado` adequado; tratar `Pagamento` inexistente como `pagamento_interno_nao_encontrado`.
- **Aceite:** zero 5xx no MP para `order.refunded` em 7 dias; `reprocessarPagamentoEstorno` sem pendências.

### 2.4 Falha em 32% dos e-mails transacionais
- **Causa provável:** domínio remetente não verificado no Resend para parte dos destinos; wrapper HTML (`emailWrapper.ts`) não aplicado gerando payload inválido; destinatários de teste inexistentes.
- **Correção:** verificar domínio/DKIM no Resend; garantir que `renderTemplateEmail` sempre passe pelo wrapper; registrar `detalhe_erro` sanitizado em todo `falhou`.
- **Aceite:** taxa de falha < 3% em 30 dias; 100% dos `falhou` com `detalhe_erro` preenchido.

### 2.5 Persistência do preço no Orçamento (Cardápio e Evento)
- **Causa provável:** `preco_final_orcamento` salvo em estado local e gravado só em determinados caminhos de saída da tela; guard "Ativar Quanto cobrar" não bloqueia navegação.
- **Correção:** salvar em `onBlur`/debounce diretamente na entidade (`Cardapio` / `Planejamento`), com feedback visual "salvo"; converter o guard em bloqueio real via `useBlocker` do React Router.
- **Regressão:** editar preço → sair pelo menu → voltar → valor preservado; PDF do orçamento com o mesmo valor.
- **Aceite:** 10/10 tentativas manuais preservam o valor; nenhum relato de perda em 30 dias.

### 2.6 Dados de catálogo
| Item | Ação | Ferramenta existente | Aceite |
|---|---|---|---|
| 44 ingredientes preço zero | Atualização em lote por IA + confirmação manual | `atualizarPrecosLoteZerados`, tela "Preço zero" | 0 ingredientes com preço zero |
| 31 receitas sem per capita | Preencher por categoria | `preencherPerCapitaCategoria` | 0 receitas-base sem `per_capita_g` |
| 2.252 receitas sem `rendimento_status` | Backfill: `rendimento_status = legado` quando existe `rendimento_total`, `pendente` caso contrário | nova execução em `corrigirRendimentoReceitas` (modo dry-run primeiro) | 100% com status; revisão manual das contaminadas por `per_capita_g` |
| 669 caches de custo incompletos | Recalcular após os dois itens acima | `normalizarCustosReceitas` | < 5% incompletos |

### 2.7 Google OAuth "app not found"
- **Causa provável:** origem/redirect não cadastrada para o domínio customizado; falha de plataforma em alguns dispositivos (registrada em `known_issues`).
- **Correção:** validar origens autorizadas para `laborat-rio-de-cozinha.base44.app` **e** o domínio customizado; abrir chamado com o suporte da plataforma anexando dispositivo/navegador; exibir mensagem clara com fallback "entrar com e-mail" quando o OAuth falhar.
- **Aceite:** login Google funciona em Chrome/Safari desktop e mobile em ambos os domínios.

### 2.8 Latência
- **Causa provável:** páginas administrativas baixam entidades inteiras (`fetchAllPages` de Receita/Cardapio/Planejamento em `UsuariosTab`); ausência de `staleTime` em várias queries; imagens não otimizadas.
- **Correção:** mover agregações do admin para uma function (mesmo padrão de `contagensHome`); `staleTime` ≥ 5 min em listas estáveis; WebP nas imagens de hero.
- **Aceite:** Home < 2 s e Admin < 4 s em 4G (Lighthouse/Performance), medido antes e depois.

### 2.9 Migração Supabase/Vercel
Continua em **shadow-mode** conforme `19-MIGRATION-PLAN.md`. Não é bloqueador comercial; **não** fazer cutover durante uma campanha de aquisição. Janela recomendada: após os aceites de 2.1–2.5 e antes de escalar tráfego pago (Mês 3).

---

## 3. Frente P1 — Onboarding (primeiros 7 dias de trial)

### 3.1 Estado atual
- Cadastro → OTP → aceite de termos → `inicializarTrialUsuario` → e-mail de boas-vindas. Modelo "7 dias de uso em 30".
- Único gatilho no app: aviso quando faltam ≤ 3 dias (`AvisoAssinaturaHome`).
- Nenhuma orientação sobre o que fazer primeiro; nenhum "momento aha" definido.

### 3.2 Momento aha
**Escalar a primeira receita** (4 → 150 porções em segundos) ou **gerar o primeiro orçamento**. Toda a jornada converge para isso em até 48 h.

### 3.3 Sequência de e-mails (infra `TemplateEmail` + Resend)
| Dia | Tipo novo em `TemplateEmail` | Conteúdo | Gatilho |
|---|---|---|---|
| 0 | `boas_vindas` (existente) | Vídeo de 2 min "escale sua primeira receita" + link direto para /receitas | `inicializarTrialUsuario` |
| 2 | `onboarding_dia2` | "Você sabia?" custo por porção e lista de compras automática | workflow diário: `data_inicio + 2` e sem receita escalada |
| 5 | `onboarding_dia5` | Caso real: orçamento de evento + convite para o WhatsApp da Carmen | workflow diário: `data_inicio + 5` |
| Véspera | `onboarding_resumo_oferta` | "Você já criou X receitas e Y cardápios" + oferta de conversão (seção 4) | workflow diário: 6º dia de uso ou `data_expiracao − 1` |

Implementação: **uma** nova function `enviarOnboardingTrial` (com dedupe por `LogEmail.usuario_id + tipo`, mesmo padrão de `enviarTrialExpirando`) acionada por um workflow diário às 09:00 America/Sao_Paulo. Templates ficam editáveis em Admin → Comunicação → Transacionais.

### 3.4 Gatilhos dentro do app
| Gatilho | Onde | Status |
|---|---|---|
| Barra de progresso do trial ("X de 7 dias · janela até DD/MM") com CTA para planos | Home, todo o trial | **Implementado nesta versão** (`TrialProgressoBanner`) |
| Aviso de urgência a ≤ 3 dias | Home | Existente |
| Mensagem contextual após 1ª receita escalada / 1º orçamento: "isso ficará salvo no seu plano" | `EscaladorReceita`, `OrcamentoCardapio`, `OrcamentoEvento` | Próxima iteração — flag `onboarding_aha_visto` em `updateMe` |
| Checklist de primeiros passos (3 itens) | Home, enquanto não concluído | Próxima iteração |

### 3.5 Métricas
| Métrica | Fonte | Meta |
|---|---|---|
| Ativação (1ª receita escalada em 48 h) | `analytics.track("receita_escalada")` | > 60% |
| Abertura e-mails de onboarding | Resend | > 40% |
| Dias de uso médios do trial | `trial_dias_uso` | ≥ 4 de 7 |

---

## 4. Frente P1 — Conversão trial → assinante

### 4.1 Oferta de fim de trial (48 h)
- Novo registro em `ConfiguracaoPlano` com `plano_id = mensal` e `versao_oferta = "primeira-assinatura-48h"` ou campo `desconto_primeira_assinatura_pct` — o preço continua sendo decidido **server-side** em `criarPagamentoMercadoPago`.
- Elegibilidade: `status_assinatura = trial` e (`diasRestantes ≤ 2` ou `diasUsados ≥ 6`) e nunca pagou.
- UI: card em `Planos` com contador de expiração real (persistido em `User.oferta_conversao_expira_em`), tom amber.

### 4.2 Posicionamento do plano anual
- Landing e `/planos`: badge **"2 meses grátis"** (R$ 198 = 12 × 16,50 vs. 12 × 29,90 = R$ 358,80 → economia de R$ 160,80, equivalente a mais de 5 mensalidades; comunicar como "2 meses grátis" é conservador e verdadeiro).
- Manter todas as notas atuais sobre renovação **sem** as palavras proibidas (fidelidade/compromisso).

### 4.3 Recuperação de trial vencido
| Momento | Canal | Regra | Infra |
|---|---|---|---|
| D+3 do vencimento | E-mail `reativacao_d3` | todo trial vencido sem pagamento | `enviarTrialVencido` estendido com dia relativo |
| D+7 | E-mail `reativacao_d7` | idem | idem |
| D+3 | WhatsApp `reativacao_alto_uso` | trial vencido com > 5 receitas pessoais | `TemplateWascript` + `notificarWascript` |

### 4.4 Rastreabilidade
- Preencher `User.origem` e `User.segmento` **no cadastro** (campos já existem no admin; hoje 0/10 preenchidos) — 2 selects opcionais após o OTP.
- Novo campo `Pagamento.cupom` e `User.cupom_origem` para atribuição de parceria/indicação.
- Card no admin: **Conversão trial → pagante** = pagamentos aprovados de ex-trials ÷ trials iniciados no período.

### 4.5 Métricas
| Métrica | Meta 90 dias |
|---|---|
| Conversão trial → pagante | > 10% |
| Reativação de vencidos | > 3% |
| Share do plano anual entre novas assinaturas | > 50% |

---

## 5. Frente P2 — Captação de clientes

Detalhamento estratégico em `40-PLANO-CAPTACAO-USUARIOS.md`. Aqui, apenas o que muda no produto e a ordem.

### 5.1 Programa de indicação (manual primeiro)
- Nova entidade `Cupom` (`codigo`, `tipo: indicacao|parceria|campanha`, `dono_user_id`, `desconto_pct`, `bonus_indicador_dias`, `ativo`, `usos`).
- Fluxo: usuário copia seu código em `/conta` → indicada digita o cupom no checkout → `criarPagamentoMercadoPago` valida e aplica desconto server-side → ao aprovar, `ativarAssinaturaPagamento` estende `data_expiracao` do indicador em 30 dias e registra `Pagamento.cupom`.
- Gestão: nova aba **Cupons** em Admin → Comunicação.

### 5.2 Parcerias (3 no trimestre)
| Alvo | Oferta | Cupom |
|---|---|---|
| Escola/curso de gastronomia | Licença em grupo + aula demonstrativa da Carmen | `ESCOLA-<nome>` |
| Influenciador 10k–100k (precificação/confeitaria/marmitas) | Acesso gratuito + comissão por assinatura | `<handle>` |
| Distribuidor de insumos/embalagens | QR code de balcão | `INSUMO-<nome>` |

### 5.3 Conteúdo e tráfego
- Instagram 3–4 posts/semana (educação · bastidores/prova social · Dicas da Carmen reaproveitadas de `DicaCarmen`).
- Meta Ads só no Mês 3, R$ 300–500/mês, objetivo cadastro no trial, criativo = melhor Reel orgânico; escalar apenas se CAC < 1 mensalidade.
- Landing: adicionar 2–3 depoimentos reais e UTM → `User.origem` automático.

### 5.4 Métricas
| Métrica | Meta |
|---|---|
| Novos trials/mês | 50 |
| Assinaturas via cupom | 15% das novas |
| CAC (pago) | < R$ 29,90 |
| Landing → cadastro | > 25% |

---

## 6. Cronograma de 90 dias

| Semana | Entregas | Gate |
|---|---|---|
| 1–2 | 2.1 webhook, 2.2 aprovação síncrona, 2.3 refunded 502, 2.4 e-mails | Aceites 2.1–2.4 |
| 3 | 2.5 orçamento, 2.6 dados de catálogo (dry-run → aplicar) | Aceites 2.5–2.6 |
| 4 | 2.7 OAuth, 2.8 latência; `origem/segmento` no cadastro (4.4) | **Go para onboarding** |
| 5–6 | Sequência de e-mails (3.3), mensagem "momento aha", checklist (3.4) | Métricas 3.5 ativas |
| 7–8 | Oferta 48 h (4.1), badge anual (4.2), recuperação D+3/D+7 (4.3), card de conversão no admin | **Go para captação** |
| 9–10 | Entidade `Cupom` + aba admin + código em /conta (5.1); abordagem das 3 parcerias | Primeiro cupom ativo |
| 11 | Cutover Supabase/Vercel (2.9) em janela de baixo tráfego | Runbook 23 |
| 12 | Teste de tráfego pago (5.3); revisão deste documento | Métricas do trimestre |

---

## 7. Responsáveis e governança

| Papel | Responsável | Frequência |
|---|---|---|
| Decisão de produto, conteúdo, parcerias, Instagram | Carmen | contínuo |
| Execução técnica (P0, functions, workflows, UI) | Engenharia (Base44 / Bruno) | sprints semanais |
| Revisão de métricas (Admin → Usuários / Pagamentos / Saúde Operacional) | Carmen + Engenharia | mensal |
| Atualização deste documento | Engenharia | trimestral ou a cada gate |

**Painéis de acompanhamento já existentes:** Admin → Comunicação (Usuários, Transacionais, Saúde Operacional), Auditorias (preflight go-live, curadorias).

---

## 8. Critérios de aceite do plano (Go/No-Go por frente)

- [ ] **P0 concluído:** `assinatura_invalida` < 2%, aprovações síncronas ativando 100%, zero 5xx em `order.refunded`, falha de e-mail < 3%, preço de orçamento persistindo, 0 ingredientes sem preço, 0 receitas-base sem per capita.
- [ ] **Onboarding ativo:** 4 e-mails com template `ativo`, barra de progresso visível, evento `receita_escalada` sendo coletado.
- [ ] **Conversão instrumentada:** oferta de 48 h configurada, card de conversão no admin, recuperação D+3/D+7 rodando.
- [ ] **Captação pronta:** `origem/segmento` > 80% preenchidos nos novos cadastros, 1 cupom de parceria ativo, calendário de conteúdo do mês publicado.
- [ ] **Governança:** revisão mensal registrada; documento atualizado no fim do trimestre.

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Escalar tráfego antes do P0 | Gate explícito na semana 4; ninguém compra mídia sem aceite |
| Desconto de fim de trial virar expectativa permanente | Oferta única por conta, expiração persistida server-side |
| Cutover Supabase coincidir com campanha | Janela fixa na semana 11, sem mídia paga ativa |
| Cupons abusados | Validação server-side, 1 uso por conta, cupom vinculado a e-mail quando for indicação |
| Falha silenciosa de e-mail continuar | `detalhe_erro` obrigatório + card de alerta em Saúde Operacional |