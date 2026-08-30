# Plano de Captação de Usuários — Laboratório de Cozinha

**Versão:** 1.0 · **Data:** 30/08/2026 · **Responsável:** Carmen Reinstein

## 1. Objetivo

Aumentar a base de assinantes pagantes do Laboratório de Cozinha por três frentes complementares:

1. **Conversão do trial em assinantes** (maior alavanca de curto prazo — usuários já dentro do produto)
2. **Parcerias e indicações** (crescimento de baixo custo com alta confiança)
3. **Marketing digital e redes sociais** (topo de funil e autoridade de marca)

**Público-alvo:** cozinheiras(os) profissionais, personal chefs, donos de buffets, marmiteiros, confeiteiros e pequenos empreendedores de alimentação no Brasil que precisam escalar receitas, calcular custos e montar orçamentos.

---

## 2. Frente 1 — Conversão do Trial em Assinantes

### Diagnóstico
O app já possui: trial automático, e-mails transacionais (trial expirando / vencido), lembrete de pagamento pendente, WhatsApp transacional e painel de saúde operacional. A oportunidade está em ativar o usuário **dentro do período de trial**.

### Estratégias

**2.1 Jornada de ativação (primeiros 7 dias)**
- Definir o "momento aha": o usuário escalar sua primeira receita ou gerar seu primeiro orçamento.
- Sequência de e-mails de onboarding (usar infraestrutura de templates existente):
  - Dia 0: boas-vindas + vídeo curto "escale sua primeira receita em 2 minutos"
  - Dia 2: "Você sabia?" — cálculo de custos e lista de compras automática
  - Dia 5: caso real de uso (orçamento de evento) + convite para o WhatsApp
  - Véspera do fim do trial: resumo do que o usuário criou ("você já cadastrou X receitas") + oferta

**2.2 Gatilhos dentro do app**
- Banner de progresso no trial: "faltam N dias" com CTA para os planos (aproveitar `AvisoAssinaturaBanner`).
- Após o usuário concluir uma ação de valor (1ª receita escalada, 1º orçamento gerado), mostrar mensagem contextual: "isso ficará salvo no seu plano".

**2.3 Oferta de conversão**
- Desconto de primeira assinatura válido apenas nas 48h finais do trial (urgência real).
- Destacar o plano anual como "2 meses grátis" no comparativo.

**2.4 Recuperação de trial vencido**
- E-mail 3 e 7 dias após o vencimento com oferta de reativação.
- WhatsApp reativo (infra Wascript existente) para trials vencidos com alto uso (ex.: >5 receitas criadas).

### Métricas
| Métrica | Como medir | Meta inicial |
|---|---|---|
| Ativação (1ª receita escalada no trial) | eventos do app | > 60% |
| Conversão trial → pagante | Pagamentos aprovados / trials iniciados | > 10% |
| Reativação de trial vencido | reativações / trials vencidos | > 3% |

---

## 3. Frente 2 — Parcerias e Indicações

### Estratégias

**3.1 Programa de indicação ("indique uma colega")**
- Mecânica simples: quem indica ganha 1 mês grátis quando a indicada assina; a indicada ganha desconto no 1º mês.
- Começar manual (cupom/registro pelo painel admin) antes de automatizar no app.

**3.2 Parcerias com escolas e cursos de gastronomia**
- Oferecer o app como ferramenta de aula (fichas técnicas, per capita, custos) com plano educacional.
- Alvos: cursos técnicos, Senac, escolas de confeitaria, cursos online de precificação.
- Proposta: licenças em grupo com desconto + aula demonstrativa dada pela Carmen.

**3.3 Comunidades e influenciadores do nicho**
- Mapear 10–20 perfis de precificação/confeitaria/marmitas com 10k–100k seguidores.
- Oferta: acesso gratuito + comissão por assinatura via cupom exclusivo (rastreável no admin).

**3.4 Parcerias com fornecedores locais**
- Distribuidores de insumos e embalagens podem indicar o app aos clientes (material de balcão/QR code).

### Métricas
| Métrica | Meta inicial |
|---|---|
| Assinaturas via cupom de parceria/indicação | 15% das novas assinaturas |
| Parcerias ativas | 3 no primeiro trimestre |

---

## 4. Frente 3 — Marketing Digital e Redes Sociais

### Estratégias

**4.1 Instagram como canal principal (orgânico)**
- Posicionamento: Carmen como autoridade em cozinha profissional e precificação.
- Pilares de conteúdo (3–4 posts/semana):
  1. **Educação**: "quanto cobrar por marmita?", per capita para eventos, fator de correção
  2. **Bastidores/prova social**: telas do app resolvendo problemas reais
  3. **Dicas da Carmen**: reaproveitar o conteúdo já existente no app
- Reels curtos mostrando o app em uso (escalar receita de 4 → 150 porções em segundos).

**4.2 Tráfego pago (após validar o orgânico)**
- Meta Ads com objetivo de cadastro no trial; público: interesses em gastronomia profissional, confeitaria, buffet.
- Criativo vencedor do orgânico vira anúncio. Orçamento inicial de teste: R$ 300–500/mês, escalar pelo CAC.

**4.3 Landing page e SEO**
- A landing existente é a base: manter CTA único ("teste grátis") e prova social (depoimentos de usuárias reais).
- Conteúdo evergreen no blog/página: "como precificar bolo", "per capita para eventos" — termos com busca constante e baixa concorrência.

**4.4 WhatsApp como canal de relacionamento**
- Lista de transmissão/canal com dica semanal da Carmen — mantém a marca presente e nutre trials indecisos.

### Métricas
| Métrica | Meta inicial |
|---|---|
| Novos trials/mês vindos de redes | 50 |
| CAC (tráfego pago) | < 1 mensalidade |
| Taxa de clique landing → cadastro | > 25% |

---

## 5. Priorização e Cronograma (90 dias)

| Período | Ações |
|---|---|
| **Mês 1** | Sequência de onboarding por e-mail · banner de progresso do trial · calendário de conteúdo Instagram |
| **Mês 2** | Oferta de fim de trial (48h) · programa de indicação manual · abordagem das 3 primeiras parcerias |
| **Mês 3** | Recuperação de trial vencido via WhatsApp · teste de tráfego pago · revisão de métricas e ajuste |

**Regra de ouro:** conversão do trial vem primeiro — cada real investido em atrair novos usuários rende mais quando o funil interno converte bem.

## 6. Acompanhamento

- Revisão mensal das métricas usando o painel admin (Usuários, Pagamentos, Saúde Operacional).
- Cada cupom de parceria/campanha deve ser rastreável para atribuir a origem da assinatura.
- Atualizar este documento a cada trimestre com aprendizados e novas metas.