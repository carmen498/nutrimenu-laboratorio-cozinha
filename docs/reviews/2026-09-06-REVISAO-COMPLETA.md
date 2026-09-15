# Revisão completa do projeto — 2026-09-06

Revisão de bugs, segurança e melhorias sobre todo o repositório: frontend (`src/`),
backend Base44 (`base44/functions`, `base44/shared`, `base44/entities`), migração
Supabase (`supabase/`), scripts de teste e documentação.

**Resultado:** 251 achados após deduplicação — **120 confirmados** por verificação
adversarial, 123 levantados mas não verificados, 8 refutados. Dois deles fazem o
produto perder dinheiro hoje: um orçamento de R$ 1.000 ou mais é lido como R$ 0 e
regravado assim; e um estorno não revoga o acesso do assinante.

| Severidade | Confirmados | Não verificados |
| --- | --- | --- |
| Crítico | 0 | 2 |
| Alto | 9 | 20 |
| Médio | 54 | 49 |
| Baixo | 57 | 52 |

Os dois críticos aparecem como "não verificados" porque o passe adversarial não
chegou a rodar sobre eles, mas ambos foram confirmados por execução direta durante
a consolidação (veja a seção 1). Por tipo, os confirmados se distribuem em 52 bugs,
28 problemas de integridade de dados, 14 de segurança, 11 de DX, 7 melhorias,
5 de performance e 3 de documentação.

## Estado do baseline

Tudo verde, exceto um script quebrado:

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | passa |
| `npm run typecheck` | passa |
| `npm run build` | passa |
| `test:orcamento`, `test:cardapio`, `test:renewal`, `test:cost-scaling`, `test:cost-signature`, `test:cost-reference`, `test:security`, `test:go-live` | passam |
| `npm run test:cost-lab` | **falha** — `ERR_MODULE_NOT_FOUND` |

`scripts/test-laboratorio-custos.mjs` importa `src/lib/laboratorioCustosAccess.js`,
que por sua vez importa `@/lib/acessoAssinatura` — um alias do Vite que o Node não
resolve. O script está no `cost-lab:check` mas fora do `maintenance:check`, então o
CI nunca acusou. Corrigir o alias não basta: o cenário `completo` do próprio script
usa uma assinatura antiga de `calcularLaboratorioCustos` e falharia em seguida.

## 1. Corrija primeiro

### 1.1 Orçamento de R$ 1.000 ou mais vira zero e é regravado

`src/pages/OrcamentoEvento.jsx:35` e `src/pages/OrcamentoCardapio.jsx:43`

Ao carregar, o preço salvo é formatado para exibição com
`toLocaleString("pt-BR", { minimumFractionDigits: 2 })` — que produz `"1.250,00"`
para R$ 1.250. Na volta, a conversão troca apenas a vírgula por ponto:

```js
Number(String(precoFinal).replace(",", "."))   // Number("1.250.00") → NaN → 0
```

O separador de milhar sobrevive, o resultado é `NaN` e o `|| 0` transforma em zero.
Como o campo tem `onBlur={savePrecoFinal}`, basta o usuário clicar no campo e sair
para o zero ser **persistido** por cima do preço real. Valores abaixo de mil não
levam separador e escapam, o que explica o bug ter passado despercebido.

```
$ node -e 'const s=(1250).toLocaleString("pt-BR",{minimumFractionDigits:2}); \
           console.log(JSON.stringify(s), "->", Number(String(s).replace(",",".")) || 0)'
"1.250,00" -> 0
```

**Correção:** normalizar com `replace(/\./g, "").replace(",", ".")` (ou usar
`DecimalInput`, que já existe em `src/components/planejamento/`) e nunca regravar
quando o parse resultar em `NaN`.

### 1.2 Estorno não revoga o acesso do assinante

`base44/shared/revogarAcessoEstorno.ts:29` e `base44/shared/acessoAssinatura.ts:28`

A revogação por estorno grava apenas `status_assinatura: "vencido"`, mantendo
`plano_atual`, `data_expiracao` (futura) e `pagamento_ativo_id` intactos. Só que o
motor de acesso promove exatamente essa combinação de volta para "ativo":

```ts
if (status === "vencido" && dataValida && dataExpiracao >= hojeSaoPauloISO(agora) && pagamentoVigente) {
  return "ativo";
}
```

O mesmo override existe no espelho do frontend (`src/lib/acessoAssinatura.js:26`).
Resultado: quem estorna um plano anual continua usando o produto por até 12 meses.
O painel administrativo mostra "Vencido" — a inconsistência é invisível para o
suporte. Isso contradiz o critério de go-live ("estorno do pagamento vigente revoga
o acesso") e a matriz documentada em
`docs/security/SUBSCRIPTION_ACCESS_MATRIX_2026-08-23.md`.

O teste `scripts/test-subscription-matrix.mjs` cobre "vencido com data futura" mas
**sem** `pagamento_ativo_id`, por isso passa. A revogação do add-on Laboratório de
Custos funciona; o furo é só no plano base.

**Correção:** em `revogarAcessoEstorno`, além do status, encerrar o período —
`data_expiracao = hoje - 1 dia` e limpar `pagamento_ativo_id` (guardando o id
estornado em outro campo, para preservar a proteção contra replays antigos). E
adicionar o cenário com `pagamento_ativo_id` à matriz de testes.

### 1.3 Catálogo pode ser envenenado por qualquer usuário

`base44/entities/IngredienteReceita.jsonc:150` (e as outras seis entidades-filhas)

Nas sete filhas de Receita/Cardápio — `IngredienteReceita`, `ReceitaTag`,
`InsumoReceita`, `IngredienteEsquecidoReceita`, `CardapioReceita`, `CardapioInsumo`,
`CardapioTag` — os campos `is_base`, `usuario_dono_id` e a FK `receita_id` não têm
field-level security de escrita, ao contrário de `Receita.is_base`. A regra de
`update` exige apenas `data.usuario_dono_id == {{user.id}}`.

Um usuário comum cria uma linha privada válida e depois a atualiza com
`{ is_base: true, receita_id: "<id de uma receita do catálogo>" }`. A linha mantém
o `usuario_dono_id` dele, então a regra passa. Como `read` libera qualquer linha com
`is_base: true` e todos os leitores do frontend filtram só por `receita_id`, o item
injetado passa a aparecer para **todos os usuários**, contaminando ficha técnica,
custo e lista de compras.

`scripts/test-rls-children.mjs` passa 7/7 porque não testa FLS nem `update` desses
campos. A auditoria `RLS_AUDIT_2026-08-22.md:253` afirma que as filhas teriam
`is_base` restrito a admin — não corresponde aos schemas atuais.

**Correção:** adicionar `"rls": { "write": { "user_condition": { "role": "admin" } } }`
em `is_base` e `usuario_dono_id` nas sete entidades (o `secureChildEntities.js` já
grava os valores corretos na criação; o usuário nunca precisa alterá-los) e
estender o teste para verificar a presença dessas regras.

### 1.4 "Evento Modelo" pode ser sequestrado por qualquer usuário

`base44/functions/obterEventoModelo/entry.ts:9`

A function usa `asServiceRole` para devolver o `Planejamento` mais recentemente
atualizado com `is_modelo: true`, **sem verificar quem o criou**. O campo `is_modelo`
nem está declarado em `Planejamento.jsonc`, logo não tem field-level RLS, e a regra
de update permite ao dono editar o próprio registro. Um `Planejamento.update(meuId,
{ is_modelo: true })` faz o evento do atacante virar o "Evento Modelo" exibido a
todos os clientes — com nome, configuração de cardápio, preços e observações dele.
Vetor de conteúdo indevido dentro do app, além do vazamento dos próprios dados.

**Correção:** declarar `is_modelo` com `rls.write` = admin e filtrar também por
criador admin na function.

### 1.5 Composição de receita é lida com limite de 50 linhas

`src/pages/Receitas.jsx:186` e mais oito pontos

O SDK só envia `limit` quando informado, e o padrão documentado é **50** registros
(`entities.types.d.ts:263`), com ordenação `-created_date`. Vários fluxos centrais
leem a composição sem limite: duplicar (`Receitas.jsx:186`), excluir
(`Receitas.jsx:219`, `ReceitaAberta.jsx:914`), exibir/editar — que alimenta o
fork-on-edit —, ficha técnica, ficha de custos, exportação, lista de compras da
receita e `EtapaCardapio.jsx:85`.

Como filhos de cache de sub-receita são gravados como linhas de `IngredienteReceita`
da própria receita, uma receita com poucas sub-receitas passa fácil de 50 linhas.
Efeitos: duplicação e fork copiam só as 50 mais recentes; exclusão deixa o resto
órfão; ficha, custo e exportação ignoram silenciosamente os itens mais antigos.

O próprio repositório já resolve isso em outros pontos —
`fetchAllFilteredPages(..., "ordem", 500)` em `AddIngredienteDialog.jsx:86` e
`subreceitaUtils.js:56`.

**Correção:** trocar todas as leituras de composição por `fetchAllFilteredPages`
(já existe em `src/lib/fetchAllPages.js`) e adicionar uma regra de lint
(`no-restricted-syntax`) contra `.filter(`/`.list(` sem limite.

### 1.6 Demais achados de severidade alta confirmados

| Local | Problema |
| --- | --- |
| `src/lib/query-client.js:8` | `refetchOnMount: false` global faz invalidações entre páginas nunca refazerem a consulta; listas ficam obsoletas por até 15 min (gcTime). Quatro páginas já contornam localmente com `refetchOnMount: 'always'`. |
| `src/pages/ReceitaAberta.jsx:896` | Duplicar receita não remapeia `subreceita_parent_id`: os filhos de sub-receita ficam órfãos, somem da tabela mas continuam somando no custo, e nunca podem ser removidos. `forkReceita.js` já faz o remapeamento correto — a regra é conhecida. |
| `src/components/receita/EditReceitaDialog.jsx:153` | O diálogo faz `Receita.update(id, rest)` com o objeto inteiro, sobrescrevendo `usuario_dono_id`, `receita_origem_id` e `linhagem_*` da cópia pessoal recém-criada com os metadados do catálogo. Cada nova edição da receita-base gera outra cópia; "Minhas Receitas" acumula duplicatas. |
| `src/components/receita/ImportarLoteDialog.jsx:589` | A importação com IA chama `Ingrediente.create` (RLS admin-only) **depois** de já ter criado a receita e parte dos itens. Para o assinante comum a receita fica meio importada, sem rollback e sem relatório, e a re-tentativa repete o ciclo. |

## 2. Padrões sistêmicos

Os achados individuais se agrupam em sete padrões. Corrigir o padrão vale mais do
que corrigir cada ocorrência.

### 2.1 Limites de listagem assumidos, não declarados

Além do limite padrão de 50 da seção 1.5, há limites fixos espalhados que já
estouraram ou vão estourar: `importarIngredientesCsv` deduplica contra
`list('-nome', 500)` e cria duplicatas no catálogo global quando ele passa de 500
ingredientes; `verificarExcluirIngrediente` apaga **todas** as linhas mas só marca
`revisar` e invalida o cache de custo das 50 primeiras; a prévia de
`fundirIngredientes` mostra "50 receitas" para um ingrediente usado em 180;
`sanearMedidaCaseira` usa `list(10000)` acima do máximo de 5.000 do SDK;
`contagensHome` trunca em 5.000; a busca do topo carrega 5.000 registros por tipo.
A documentação cita um catálogo real de 2.234 receitas — vários desses limites já
foram ultrapassados em produção.

### 2.2 Dois motores de custo que discordam

Existe o motor canônico (`src/lib/custoReceita.js`, com preços pessoais do usuário)
e o cache global `Receita.custo_total`. A Etapa 3 do evento usa o canônico; o
Dossiê, a Ficha de Custos do Evento e os relatórios em PDF usam o cache
(`dossieEventoCalc.js:63`, `relatoriosPlanejamentoPDF.js:255`). O mesmo evento
mostra números diferentes em telas diferentes.

Some-se a isso: o motor server-side (`normalizarCustosReceitas:277`) marca um
ingrediente esquecido como divergente quando o campo `nome` difere do nome do
ingrediente — mas a regra 6 de `docs/business-rules/04-motor-custos.md` e o motor do
frontend dizem que `nome` é descrição de uso e a identidade é só o `ingrediente_id`.
Como a própria UI grava nomes como "Óleo/manteiga para untar", praticamente todo
esquecido criado no app faz o backend marcar a receita como incompleta —
permanentemente pendente na Auditoria de Custos, e o botão de recalcular nunca
resolve.

### 2.3 Propriedade e RLS não propagadas nas escritas

`aplicarTagsAutomatico` grava `ReceitaTag` via `asServiceRole` sem `is_base` nem
`usuario_dono_id`: a escrita passa, mas a leitura (que exige um dos dois) não — as
tags ficam invisíveis para usuários comuns. `BulkTagAssignDialog.jsx:27` tem o mesmo
defeito pelo lado do cliente. Em sentido oposto, várias telas oferecem a usuários
comuns ações que a RLS reserva a admin (`Ingrediente.create` no "novo ingrediente
rápido", criação de tags no `TagSelector`, `Insumo.update` em `InsumosSection`), e o
erro é engolido: a ação simplesmente não acontece.

### 2.4 Fork-on-edit parcial

O padrão "editar receita de catálogo cria uma cópia pessoal" está implementado em
`ReceitaAberta`, mas nem todas as mutações passam por ele. Reordenar itens, criar
sub-título, substituir ingrediente e remover sub-receita chamam a entidade
diretamente e **falham em silêncio** para o usuário comum. Na listagem, favoritar,
marcar "a revisar" e excluir têm o mesmo problema. E o fork em si não copia
`InsumoReceita` nem `IngredienteEsquecidoReceita`, embora herde o cache
`custo_insumos` — a cópia mostra um custo que sua composição não explica.

### 2.5 Escritas múltiplas sem compensação

Criar receita + itens + tags, fazer fork, fundir ingredientes, excluir receita e
seus filhos, salvar cálculo de custo + itens: nenhum desses fluxos tem rollback. A
falha no meio deixa estado inconsistente e visível. O caso mais grave é o fork
parcial (`forkReceita.js:72`): a cópia incompleta passa a ser encontrada como "cópia
existente" e o usuário fica preso a ela. A exclusão de receita
(`Receitas.jsx:217`, `ReceitaAberta.jsx:912`) remove só `IngredienteReceita` e deixa
tags, insumos, esquecidos, itens de cardápio e marcadores de sub-receita órfãos.

### 2.6 Números em formato pt-BR

Além dos dois orçamentos da seção 1.1, o padrão `replace(",", ".")` sem tratar o
separador de milhar aparece em outros campos monetários. `DecimalInput` não
acompanha mudanças externas de `value` (não tem efeito de sincronização), então a
"Qtd. final" de Doces & Bebidas fica exibindo o valor antigo depois de um recálculo.

### 2.7 Lógica duplicada entre front e back

Sete pares de arquivo espelham regra de negócio entre `src/lib/*.js` e
`base44/shared/*.ts`. Os verificadores executaram os dois lados com as mesmas
entradas: `regraRenovacao`, `parcelamentoPlanos`, `fusoBrasilia` e `custoAssinatura`
estão idênticos. Divergem: a versão dos documentos legais (duplicada sem teste de
sincronismo — dessincronizar joga todos os usuários num loop em `/aceitar-termos`),
`diasEntreHoje` em `statusAssinaturaUsuario.js` (usa o fuso do navegador enquanto as
outras cópias usam America/Sao_Paulo), `padronizarCaixaNomes` (não faz `trim`, ao
contrário do `toUpperName`) e o critério de aceite de termos após OAuth.

## 3. Segurança

Além dos itens 1.2, 1.3 e 1.4, os verificadores confirmaram:

- **`homologarMercadoPagoCustosSandbox`** (`entry.ts:3`) não chama `auth.me()`; a
  única proteção é um nonce gravado no repositório. Quem conhece o nonce pode,
  anonimamente, fazer a function assinar com o segredo de webhook de **produção** e
  disparar notificações ao endpoint produtivo. As outras functions de homologação
  foram neutralizadas com 410; esta ficou ativa e não está documentada.
- **Transferência de propriedade** (`Receita.jsonc:318`): a RLS permite ao dono
  alterar `usuario_dono_id` de receitas, cardápios e filhas para outro usuário.
- **`buscarPrecosIA`** (LLM com acesso à internet) pode ser invocada por qualquer
  assinante, não só por admin.
- **Exportação CSV** (`src/lib/exportCsv.js:6`) não neutraliza fórmulas — injeção de
  fórmula em relatórios administrativos.
- **`ConfiguracaoAddonCustos`** tem leitura pública e expõe observação
  administrativa e versão interna da oferta.
- **Trial 7-em-30**: os dias só são contabilizados pelo frontend; acesso direto às
  entidades ou functions não consome dias.
- **Validação de assinatura do webhook** não confere o frescor do `ts`, e o manifest
  diverge da especificação quando `x-request-id` está ausente.

O que **não** se sustentou: não há XSS explorável (as ocorrências de `innerHTML` são
estáticas), não há segredos no código-fonte (o Base44 injeta em runtime), o webhook
do Mercado Pago valida assinatura corretamente no caminho principal, e os campos de
plano/trial/termos em `User` têm field-level security de admin — o cliente não
consegue conceder trial a si mesmo via `updateMe`.

## 4. Migração Supabase

A migração de 2.833 linhas foi lida por completo e comparada com as entidades de
origem. As políticas RLS estão sólidas, mas o **modelo de dados perde informação**
em relação ao Base44 — se a migração ocorrer como está, funcionalidades quebram:

| Local | Problema |
| --- | --- |
| `...operational_schema_and_rls.sql:488` | PK `(menu_id, recipe_id)` em `menu_recipes` impede a mesma receita em dias/refeições diferentes do mesmo cardápio. |
| `...:602` | `cart_items` modela carrinho de receitas/cardápios, mas o carrinho do produto é de **ingredientes** (`CarrinhoItem`). |
| `...:432` | `recipe_items`/`recipe_supplies` perdem atributos que o motor de custos e o escalonamento exigem. |
| `...:510` | `menu_periods`/`menu_period_items` não representam `CardapioPeriodo`/`CardapioPeriodoItem` (datas civis, tipo de origem, classificação). |
| `...:271` | `household_measures` perde a identidade canônica ingrediente + utensílio + estado do alimento. |
| `...:226` | Catálogo de ingredientes sem preço de referência/FC; `user_ingredients` sem favorito, sem unicidade por ingrediente e com `NOT NULL` que rejeita registros legados. |
| `...:754` | `CHECK margin_pct >= 0` rejeita ficha com margem negativa — cenário legítimo (preço informado abaixo do custo). |
| `...:683` | FK `RESTRICT` + ausência de política de `DELETE` em fichas: receita com ficha de custo nunca pode ser excluída. |

A verificação do banco (`.github/workflows/database.yml`) não tem script npm nem
entra no `maintenance:check` — o pin da CLI só é imposto no CI.

## 5. Testes e ferramental

- `test:cost-lab` quebrado (ver baseline) e obsoleto em relação à API que testa.
- `scripts/test-trial-7-em-30.mjs` e `scripts/test-checkout-laboratorio-custos.mjs`
  não estão em nenhum script npm; o de trial **está falhando**.
- Nenhum script cobre `webhookMercadoPago`, `ativarAssinaturaPagamento` ou
  `revogarAcessoEstorno` de forma comportamental — só asserções de substring em
  `test-go-live-static`. É por isso que o achado 1.2 passou.
- Os motores centrais de receita não têm teste em `scripts/` nem no
  `maintenance:check`.
- `test-plano-renovacao.mjs` contorna o alias `@/` com uma substituição por regex —
  frágil pelo mesmo motivo que quebrou o `test:cost-lab`.
- 17 entidades de sondagem (`_temp*`, `_noop*`, `Tmp*`, `Dummy*`, `*Probe`) e dois
  schemas duplicados em kebab-case (`cardapio-periodo.jsonc`) continuam declarados.
- `src/pages/CustosPlanos.jsx` e `src/pages/OAuthConsent.jsx` não estão roteados em
  `App.jsx`.
- O ESLint cobre apenas `src/components` e `src/pages`; `src/lib`, `src/hooks` e
  `src/App.jsx` ficam de fora. Ampliar o escopo com a mesma config não gera nenhum
  erro novo — é seguro fazer agora.

## 6. Ordem sugerida

1. **Agora:** 1.1 (orçamento zerado) e 1.2 (estorno) — perda financeira direta.
2. **Esta semana:** 1.3 e 1.4 (RLS das filhas e `is_modelo`); neutralizar
   `homologarMercadoPagoCustosSandbox`; consertar `test:cost-lab` e colocar os
   scripts órfãos no `maintenance:check`.
3. **Próxima:** 1.5 (paginação da composição) junto com o padrão 2.1; unificar o
   motor de custos (2.2); completar o fork-on-edit (2.4).
4. **Antes da migração Supabase:** revisar o modelo da seção 4 — as oito divergências
   de schema são mais baratas de corrigir agora do que depois do cutover.

---

## Como esta revisão foi feita

Cinco workflows paralelos, um por área (bibliotecas do frontend, UI do frontend,
functions do backend, plataforma/entidades/Supabase, e temas transversais), com 23
revisores no total. Cada revisor leu integralmente os arquivos da sua área e
escreveu scripts em Node para executar as funções puras e confirmar hipóteses
numéricas antes de reportar.

Cada achado bruto passou por dois céticos independentes com lentes diferentes —
exatidão técnica (o código faz mesmo o que o achado diz?) e alcançabilidade
(é acionável em produção, ou já está mitigado em outra camada?) — instruídos a
refutar em caso de dúvida. Quando os dois discordaram, um terceiro agente decidiu.
Só sobreviveu o que nenhum dos dois conseguiu derrubar.

Os 123 achados do Anexo B têm evidência de código, mas o passe adversarial não
chegou a rodar sobre eles: são suspeitas a confirmar, não fatos. Nenhum arquivo do
repositório foi modificado durante a revisão.

Duas ressalvas: alguns achados de RLS dependem da semântica exata do Base44 para
`update` (se a plataforma reavalia a regra sobre o estado resultante ou só sobre a
linha existente) — isso não é reproduzível offline e está anotado em cada caso. E o
limite padrão de `filter` sem `limit` foi tomado da documentação de tipos do SDK;
vale confirmar contra o backend real.


---

## Anexo A — Achados confirmados (120)

Cada linha passou por dois verificadores adversariais independentes (exatidão técnica e alcançabilidade/mitigação) que tentaram derrubá-la e não conseguiram.

| Sev. | Tipo | Local | Achado | Área |
| --- | --- | --- | --- | --- |
| Alto | segurança | `base44/entities/IngredienteReceita.jsonc:150` | Filhas de Receita/Cardápio permitem ao dono promover linha privada a is_base=true e apontá-la para receita do catálogo (envenenamento do catálogo) | Entidades e RLS |
| Alto | segurança | `base44/functions/obterEventoModelo/entry.ts:9` | obterEventoModelo expõe a todos os usuários qualquer Planejamento marcado com is_modelo=true por qualquer usuário | Segurança (transversal) |
| Alto | segurança | `base44/shared/acessoAssinatura.ts:28` | Estorno não revoga acesso: regra 'vencido + pagamento_ativo_id' reverte status para 'ativo' | Segurança (transversal) |
| Alto | segurança | `base44/shared/revogarAcessoEstorno.ts:29` | Estorno não revoga acesso: 'vencido' é repromovido a 'ativo' porque pagamento_ativo_id e data_expiracao ficam intactos | Pagamentos (backend) |
| Alto | integridade | `src/components/receita/EditReceitaDialog.jsx:153` | EditReceitaDialog sobrescreve linhagem/propriedade da cópia pessoal com metadados da receita de catálogo | UI de receitas |
| Alto | bug | `src/components/receita/ImportarLoteDialog.jsx:589` | Importação com IA cria Ingrediente diretamente (RLS admin-only): para usuário comum a receita fica órfã/parcial | UI de receitas |
| Alto | bug | `src/lib/query-client.js:8` | refetchOnMount:false global faz invalidações entre páginas nunca refazerem a consulta (listas ficam obsoletas até 15 min) | React e performance |
| Alto | integridade | `src/pages/ReceitaAberta.jsx:896` | Duplicar receita não remapeia subreceita_parent_id: filhos de sub-receita ficam órfãos, invisíveis e ainda custeados | UI de receitas |
| Alto | integridade | `src/pages/Receitas.jsx:186` | Composição da receita lida com limite padrão de 50 linhas (duplicar/excluir/exibir) | Contratos front/back |
| Médio | bug | `base44/functions/criarPagamentoMercadoPago/entry.ts:61` | Compra de plano mensal com anual vigente é aceita e reduz a assinatura para 30 dias | Pagamentos (backend) |
| Médio | bug | `base44/functions/criarPagamentoMercadoPago/entry.ts:460` | Corrida entre resposta síncrona de cartão e webhook pode ativar duas vezes (notificações duplicadas e dois entitlements de Custos) | Pagamentos (backend) |
| Médio | bug | `base44/functions/fundirIngredientes/entry.ts:146` | Prévia da fusão de ingredientes truncada em 50 linhas (total e 'destino já existe' errados) | Contratos front/back |
| Médio | segurança | `base44/functions/homologarMercadoPagoCustosSandbox/entry.ts:3` | Function pública com NONCE hardcoded assina e dispara webhook do Mercado Pago em produção | Segurança (transversal) |
| Médio | integridade | `base44/functions/importarIngredientesCsv/entry.ts:38` | Importação de ingredientes deduplica contra apenas 500 registros e cria duplicatas no catálogo global | Segurança (transversal) |
| Médio | bug | `base44/functions/normalizarCustosReceitas/entry.ts:277` | Motor de custos server-side marca ingrediente esquecido como divergente pelo campo nome, contrariando regra documentada e o motor do frontend | Divergência front/back |
| Médio | integridade | `base44/functions/verificarExcluirIngrediente/entry.ts:21` | verificarExcluirIngrediente marca/invalida só 50 receitas mas apaga todas as linhas | Contratos front/back |
| Médio | bug | `base44/shared/ativarAssinaturaPagamento.ts:66` | Renovação em D-30 reinicia o período a partir de hoje e descarta até 30 dias já pagos | Pagamentos (backend) |
| Médio | bug | `base44/shared/protecoesAutomacao.ts:204` | Execução manual do admin consome o cooldown de 20h e cancela silenciosamente a execução agendada seguinte | Trial, e-mail e jobs |
| Médio | bug | `base44/shared/templateEmail.ts:20` | Nome do usuário com "{{" ou "$&" derruba os jobs agendados de e-mail inteiros | Trial, e-mail e jobs |
| Médio | DX | `base44/shared/versaoDocumentosLegais.ts:1` | Versão dos documentos legais duplicada entre shared e src/lib sem teste de sincronismo | Trial, e-mail e jobs |
| Médio | DX | `scripts/test-laboratorio-custos.mjs:75` | test-laboratorio-custos.mjs está obsoleto: cenário 'completo' usa assinatura antiga de calcularLaboratorioCustos e falharia mesmo após corrigir o alias | Motor de custos (lib) |
| Médio | DX | `scripts/test-trial-7-em-30.mjs:37` | Testes de trial 7-em-30 e checkout do Laboratório de Custos existem mas não estão em nenhum script npm; o de trial está falhando | Divergência front/back |
| Médio | bug | `src/App.jsx:131` | Rotas lazy sem ErrorBoundary: falha ao carregar chunk (ex.: após deploy) resulta em tela branca | React e performance |
| Médio | bug | `src/components/CustosRoute.jsx:21` | Ativar trial/comprar Laboratório de Custos devolve o usuário para a tela de bloqueio (entitlement em cache nunca é refeito) | React e performance |
| Médio | bug | `src/components/planejamento/DecimalInput.jsx:7` | DecimalInput não acompanha mudanças de value — Qtd. final em Doces & Bebidas fica desatualizada | UI de cardápios e eventos |
| Médio | integridade | `src/components/planejamento/EventoListaCompras.jsx:427` | Lista de Compras e Relatório de Produção ignoram quantidade_ajustada e custo de Doces & Bebidas (divergem do Dossiê/Etapa 4) | UI de cardápios e eventos |
| Médio | integridade | `src/components/planejamento/EventoListaCompras.jsx:122` | Lista de Compras do Evento escala por porções (qtd_kg/PC) e não por peso — diverge do Dossiê/Pré-preparos | UI de cardápios e eventos |
| Médio | bug | `src/components/planejamento/NovoPlanejamentoDialog.jsx:261` | Componentes definidos dentro de NovoPlanejamentoDialog: campo numérico perde o foco a cada dígito | React e performance |
| Médio | bug | `src/components/planos/PixForm.jsx:38` | PIX aprovado nunca mostra sucesso: PixForm chama onSuccess() sem argumento | Pagamentos (backend) |
| Médio | performance | `src/components/ProtectedRoute.jsx:26` | registrarDiaUsoTrial é invocado a cada navegação e a cada re-render do AuthProvider (checkUserAuth não memoizado nas deps) | Autenticação e rotas |
| Médio | bug | `src/components/ProtectedRoute.jsx:55` | Falha/timeout do public-settings expulsa usuário com sessão válida para /login e duplica checkUserAuth | Autenticação e rotas |
| Médio | bug | `src/components/ProtectedRoute.jsx:35` | Trial: registrarDiaUsoTrial disparado a cada navegação e remonta a aplicação inteira no primeiro acesso do dia | React e performance |
| Médio | bug | `src/components/receita/BulkTagAssignDialog.jsx:27` | BulkTagAssignDialog cria ReceitaTag sem campos de propriedade: falha para usuário comum e gera linhas invisíveis quando admin | Entidades e RLS |
| Médio | bug | `src/components/receita/EditItemDialog.jsx:21` | queryKey ["ingredientes"] compartilhada por fetchers diferentes (lista completa vs. 500 itens em ordem Z→A) | Contratos front/back |
| Médio | integridade | `src/components/receita/EditReceitaDialog.jsx:204` | Fork-on-edit pelo EditReceitaDialog sobrescreve dono e linhagem da cópia pessoal com valores do catálogo | Motor de receitas (lib) |
| Médio | integridade | `src/components/receita/ImportarLoteDialog.jsx:471` | Importar em lote sobrescreve receita existente por nome (apaga toda a composição) sem confirmação; para usuário comum aborta no meio do lote | UI de receitas |
| Médio | bug | `src/lib/AuthContext.jsx:103` | Toda chamada a checkUserAuth() desmonta a árvore inteira de rotas (spinner full-screen), perdendo estado da página e o destino de AceitarTermos | Autenticação e rotas |
| Médio | bug | `src/lib/AuthContext.jsx:175` | Timeout/erro de rede em auth.me() é tratado como 'não autenticado' e manda o usuário ao login sem opção de retry | Autenticação e rotas |
| Médio | bug | `src/lib/conversorMedidas.js:21` | converterGramasParaMedida limita a fração a 20¾ e exibe quantidade/gramas errados acima de ~21 medidas | Motor de receitas (lib) |
| Médio | bug | `src/lib/custoReceita.js:137` | porcoesEfetivas ignora unidadesFinais informadas (contradiz regra 4.2.5) e superestima insumos por_unidade no cardápio | Motor de custos (lib) |
| Médio | bug | `src/lib/custoReceita.js:218` | custoPorGrama/custoPorKgPronto com contexto lineariza insumos por_lote/por_unidade e diverge de custoEscalado para a mesma produção | Motor de custos (lib) |
| Médio | bug | `src/lib/custoReceita.js:91` | Motor canônico do frontend ignora marcador de sub-receita sem cache e devolve completo=true (custo subestimado sem aviso) | Divergência front/back |
| Médio | integridade | `src/lib/dossieEventoCalc.js:63` | Dossiê e Relatório de Custos do evento usam cache global da Receita enquanto a Etapa 3 usa preço pessoal canônico | Motor de custos (lib) |
| Médio | bug | `src/lib/dossieEventoCalc.js:107` | Dossiê do Evento calcula custo pelo cache global Receita.custo_total, não pelo motor canônico usado na Etapa 3 | Motor de receitas (lib) |
| Médio | integridade | `src/lib/forkReceita.js:80` | Cópia pessoal (fork) não copia InsumoReceita nem IngredienteEsquecidoReceita, mas herda o cache custo_insumos | Motor de receitas (lib) |
| Médio | integridade | `src/lib/forkReceita.js:72` | Fork-on-edit sem rollback: cópia parcial passa a ser a 'cópia existente' e o usuário fica preso a ela | UI de receitas |
| Médio | integridade | `src/lib/formatarModoPreparo.js:250` | formatarModoPreparo descarta o texto anterior ao primeiro marcador numérico e a normalização é persistida a cada salvamento | Motor de receitas (lib) |
| Médio | bug | `src/lib/listaComprasReceitaCalc.js:270` | Lista de compras da receita omite silenciosamente sub-receitas sem filhos em cache (sem pendência) | Motor de receitas (lib) |
| Médio | bug | `src/lib/mercadoPagoConfig.js:23` | Retry do SDK do Mercado Pago após falha de carregamento fica pendente para sempre (checkout com cartão trava até recarregar) | Motor de custos (lib) |
| Médio | bug | `src/lib/statusAssinaturaUsuario.js:61` | Filtro 'Tipo de usuário' da Administração classifica clientes com plano 'renovacao' como visitantes | Divergência front/back |
| Médio | performance | `src/pages/CardapioAberto.jsx:195` | CardapioAberto: N+1 (3 requisições por receita + base inteira de receitas) a cada abertura e a cada mudança do nº de pessoas | React e performance |
| Médio | DX | `src/pages/CustosCalcular.jsx:418` | Erros estruturados do servidor descartados: usuário vê 'Request failed with status code 400' | Contratos front/back |
| Médio | integridade | `src/pages/ReceitaAberta.jsx:912` | Exclusão de receita não remove filhos nem referências (tags, insumos, esquecidos, cardápios, marcadores de sub-receita) | UI de receitas |
| Médio | bug | `src/pages/ReceitaAberta.jsx:1020` | Reordenar, substituir, criar sub-título e remover sub-receita em receita do catálogo falham silenciosamente para usuário comum | React e performance |
| Médio | bug | `src/pages/ReceitaAberta.jsx:924` | Reordenar, sub-título, substituir ingrediente e outras mutações ignoram o fork-on-edit e falham em silêncio para usuário comum em receita de catálogo | UI de receitas |
| Médio | bug | `src/pages/Receitas.jsx:199` | Favoritar, 'A revisar' e Excluir na listagem falham em silêncio para usuário comum em receitas do catálogo | UI de receitas |
| Médio | bug | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:683` | Receita com ficha de custo nunca pode ser excluída (FK RESTRICT + fichas sem DELETE para ninguém) | Migração Supabase |
| Médio | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:271` | household_measures perde a identidade canônica ingrediente + utensílio + estado do alimento | Migração Supabase |
| Médio | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:488` | PK (menu_id, recipe_id) em menu_recipes impede a mesma receita em dias/refeições diferentes do cardápio | Migração Supabase |
| Médio | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:602` | cart_items modela carrinho de receitas/cardápios, mas o carrinho do produto é de ingredientes (CarrinhoItem) | Migração Supabase |
| Médio | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:226` | Catálogo de ingredientes sem preço de referência/FC e user_ingredients sem favorito, sem unicidade por ingrediente e com NOT NULL que rejeita registros legados | Migração Supabase |
| Médio | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:432` | recipe_items/recipe_supplies perdem atributos que o motor de custos e o escalonamento exigem | Migração Supabase |
| Médio | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:510` | menu_periods/menu_period_items não representam CardapioPeriodo/CardapioPeriodoItem (datas civis, tipo de origem, classificação) | Migração Supabase |
| Baixo | DX | `.github/workflows/database.yml:33` | Verificação do banco não entra no maintenance:check nem tem script npm; pin da CLI só é imposto no CI | Migração Supabase |
| Baixo | DX | `base44/entities/_temp.jsonc:1` | 17 entidades de sondagem/temporárias (_temp*, _noop*, Tmp*, Dummy*, *Probe) continuam declaradas no app | Entidades e RLS |
| Baixo | DX | `base44/entities/cardapio-periodo.jsonc:1` | Schemas duplicados cardapio-periodo.jsonc / cardapio-periodo-item.jsonc (kebab-case) coexistem com CardapioPeriodo/CardapioPeriodoItem | Entidades e RLS |
| Baixo | segurança | `base44/entities/ConfiguracaoAddonCustos.jsonc:80` | ConfiguracaoAddonCustos com leitura pública expõe observação administrativa e versão interna da oferta | Entidades e RLS |
| Baixo | segurança | `base44/entities/Receita.jsonc:233` | Dono de Receita/Cardápio pessoal pode transferir usuario_dono_id para outro usuário e substituir entradas do catálogo na visão da vítima | Entidades e RLS |
| Baixo | segurança | `base44/entities/Receita.jsonc:318` | RLS permite transferir a propriedade (usuario_dono_id) de receitas/cardápios e filhas para outro usuário | Segurança (transversal) |
| Baixo | integridade | `base44/functions/aplicarTagsAutomatico/entry.ts:175` | aplicarTagsAutomatico grava ReceitaTag sem is_base/usuario_dono_id, gerando linhas invisíveis para usuários comuns | Entidades e RLS |
| Baixo | segurança | `base44/functions/buscarPrecosIA/entry.ts:56` | buscarPrecosIA (LLM com internet) pode ser invocada por qualquer assinante, não só admin | Contratos front/back |
| Baixo | bug | `base44/functions/campanhaEmail/entry.ts:32` | campanhaEmail limita a 2000 usuários e bloqueia silenciosamente destinatários fora dessa página; sem lote/rate limit | Trial, e-mail e jobs |
| Baixo | bug | `base44/functions/converterMedidasReceitas/entry.ts:169` | converterMedidasReceitas só processa as primeiras `limite` receitas e encerra a paginação como se não houvesse mais | Divergência front/back |
| Baixo | bug | `base44/functions/criarPagamentoMercadoPago/entry.ts:146` | Plano custos_* pode ser cobrado sem Laboratório de Cozinha ativo; ativação lança erro após aprovação e deixa pagamento aprovado sem entitlement | Pagamentos (backend) |
| Baixo | melhoria | `base44/functions/criarPagamentoMercadoPago/entry.ts:279` | E-mail do pagador vem do cliente e não do usuário autenticado | Pagamentos (backend) |
| Baixo | bug | `base44/functions/criarPagamentoMercadoPago/entry.ts:169` | Checkout de Custos exige venda_habilitada mas não modulo_habilitado: é possível pagar e ficar bloqueado por 'comercial_indisponivel' | Pagamentos (backend) |
| Baixo | bug | `base44/functions/enviarLembretePendencia/entry.ts:29` | Lembrete de pendência é enviado para pagamento antigo mesmo quando o cliente já pagou por outra tentativa | Trial, e-mail e jobs |
| Baixo | melhoria | `base44/functions/enviarTrialVencido/entry.ts:26` | Usuário que esgota os 7 dias de uso vira 'vencido' sem receber e-mail de trial encerrado | Trial, e-mail e jobs |
| Baixo | segurança | `base44/functions/homologarMercadoPagoCustosSandbox/entry.ts:13` | Endpoint de homologação sem autenticação (nonce em código-fonte) permanece implantado | Contratos front/back |
| Baixo | bug | `base44/functions/inicializarTrialLaboratorioCustos/entry.ts:46` | inicializarTrialLaboratorioCustos quebra (500) para usuário homologado sem ConfiguracaoAddonCustos | Contratos front/back |
| Baixo | integridade | `base44/functions/inicializarTrialUsuario/entry.ts:67` | inicializarTrialUsuario sem idempotência para chamadas concorrentes: acesso Custos e e-mail de boas-vindas duplicados | Trial, e-mail e jobs |
| Baixo | integridade | `base44/functions/obterEventoModelo/entry.ts:10` | Campos is_modelo/modelo_origem_id de Planejamento não existem no schema jsonc | Contratos front/back |
| Baixo | integridade | `base44/functions/padronizarCaixaNomes/entry.ts:3` | padronizarCaixaNomes não faz trim, ao contrário de toUpperName do frontend | Divergência front/back |
| Baixo | integridade | `base44/functions/sanearMedidaCaseira/entry.ts:192` | Consolidação de medidas usa list(10000) acima do máximo de 5.000 do SDK — referências órfãs | Contratos front/back |
| Baixo | bug | `base44/functions/webhookMercadoPago/entry.ts:122` | Webhook responde 200 quando a reconsulta ao Mercado Pago falha, impedindo o retry do provedor (docs prometem 500) | Pagamentos (backend) |
| Baixo | bug | `base44/functions/webhookMercadoPago/entry.ts:166` | Estorno não é reparado por replay: status vira 'estornado' antes da revogação e o ramo idempotente só repara aprovações | Pagamentos (backend) |
| Baixo | segurança | `base44/shared/acessoAssinatura.ts:186` | Trial 7-em-30 só contabiliza dias via frontend; acesso direto às entidades/functions não consome dias | Segurança (transversal) |
| Baixo | bug | `base44/shared/ativarAssinaturaPagamento.ts:57` | Replays 'approved' (webhook ou 'Sincronizar pagamentos') re-estendem assinatura e reenviam e-mails para usuários sem pagamento_ativo_id | Pagamentos (backend) |
| Baixo | melhoria | `base44/shared/protecoesAutomacao.ts:193` | Execuções ignoradas por janela/cooldown retornam 200 e são indistinguíveis de sucesso; janela de 30 min coincide com horário observado no limite | Trial, e-mail e jobs |
| Baixo | segurança | `base44/shared/validarAssinaturaMercadoPago.ts:40` | Validação x-signature sem tolerância de ts e manifest diverge da especificação quando x-request-id está ausente | Pagamentos (backend) |
| Baixo | docs | `docs/security/SUBSCRIPTION_ACCESS_MATRIX_2026-08-23.md:30` | Documentação da matriz de assinaturas diverge do código (trial 7 dias vs janela 7-em-30; 'vencido' com pagamento vigente é liberado) | Autenticação e rotas |
| Baixo | bug | `index.html:57` | returnTo e access_token são descartados na canonicalização de host: index.html move os parâmetros para storage por origem antes do redirect para o subdomínio do app | Autenticação e rotas |
| Baixo | segurança | `index.html:63` | Bootstrap aceita access_token arbitrário na URL (fixação de sessão / login CSRF) | Segurança (transversal) |
| Baixo | DX | `package.json:21` | Motores centrais de receita não têm teste em scripts/ nem no maintenance:check | Motor de receitas (lib) |
| Baixo | DX | `scripts/test-trial-7-em-30.mjs:1` | scripts/test-trial-7-em-30.mjs não é executado por nenhum npm script nem pelo maintenance:check | Trial, e-mail e jobs |
| Baixo | DX | `src/components/comunicacao/CampanhasTab.jsx:20` | Envio de campanha sem catch: 403/500 viram rejeição não tratada e sem feedback | Contratos front/back |
| Baixo | performance | `src/components/layout/TopBarSearch.jsx:38` | Busca do topo carrega até 5000 registros por tipo e pode ignorar itens além da página máxima do SDK | React e performance |
| Baixo | bug | `src/components/receita/NovaReceitaIA.jsx:232` | Filtro de tags para doces compara 'Sem Glúten'/'Sem Lactose' (maiúsculas) com tags cadastradas como 'Sem glúten'/'Sem lactose' | UI de receitas |
| Baixo | integridade | `src/components/receita/NovaReceitaIA.jsx:92` | Chave de cache ["ingredientes"] compartilhada entre fetchAllPages (todos) e list(500): lista pode ficar truncada | React e performance |
| Baixo | bug | `src/components/receita/NovoIngredienteRapido.jsx:43` | 'Novo ingrediente' rápido é oferecido a usuários comuns, mas Ingrediente.create é admin-only na RLS | Entidades e RLS |
| Baixo | DX | `src/components/tags/TagSelector.jsx:56` | Criação de tags por usuário comum falha silenciosamente (RLS admin-only) e o erro é engolido | UI de receitas |
| Baixo | bug | `src/lib/AuthContext.jsx:113` | Aceite de termos após OAuth usa critério diferente do servidor (presença vs versão vigente) | Divergência front/back |
| Baixo | integridade | `src/lib/cardapioPeriodo.js:107` | atualizarCardapioPeriodo desloca as datas dos itens uma a uma sem rollback antes de atualizar o cabeçalho | Motor de receitas (lib) |
| Baixo | bug | `src/lib/conversorMedidas.js:214` | Pré-visualização de conversão na importação por IA não entende plurais/parênteses que o backend converte | Divergência front/back |
| Baixo | performance | `src/lib/custoContexto.js:58` | carregarContextoCustosReceitas dispara 3 requisições por receita mais a carga completa de Ingredientes a cada chamada | Motor de custos (lib) |
| Baixo | docs | `src/lib/custoReceita.js:120` | Regra documentada 'proporcional=false mantém quantidade fixa' não é aplicada pelo motor de custos (nem pelo escalonamento) | Motor de custos (lib) |
| Baixo | bug | `src/lib/explodirReceitaCarrinho.js:341` | explodirReceitaParaCarrinho conta duas vezes os filhos de sub-receita em cache e explode o fator quando a sub-receita não tem rendimento | Motor de receitas (lib) |
| Baixo | segurança | `src/lib/exportCsv.js:6` | Exportação CSV sem neutralizar fórmulas (CSV/formula injection) em relatórios administrativos | Segurança (transversal) |
| Baixo | integridade | `src/lib/fichaCustosCalc.js:42` | Detalhe de ingredientes da Ficha de Custos do cardápio não aplica as mesmas exclusões do motor canônico (nome divergente / referência ausente) | Motor de custos (lib) |
| Baixo | melhoria | `src/lib/query-client.js:11` | retry:1 global inclui erros 4xx (401/403/404): repete requisições que nunca vão passar e atrasa o erro em 1 s | React e performance |
| Baixo | bug | `src/lib/statusAssinaturaUsuario.js:7` | diasEntreHoje de statusAssinaturaUsuario usa fuso do navegador enquanto as demais cópias usam America/Sao_Paulo | Divergência front/back |
| Baixo | melhoria | `src/lib/sugerirUnidadeCompra.js:32` | Sugestão de unidade de compra por substring gera falsos positivos (ex.: 'Pimentão vermelho' → litro) | Motor de custos (lib) |
| Baixo | melhoria | `src/lib/termosVersao.js:1` | Versão vigente dos Termos duplicada em duas constantes sem teste de sincronização — divergência causa loop infinito em /aceitar-termos | Autenticação e rotas |
| Baixo | docs | `src/pages/Conta.jsx:94` | Conta.jsx grava campos de endereço no User que não existem no schema User.jsonc | Entidades e RLS |
| Baixo | bug | `src/pages/CustosCalcular.jsx:295` | Popover 'Ingredientes esquecidos' em Calcular Custo mostra cache custo_total × qtd, diferente do valor canônico somado no total | Motor de custos (lib) |
| Baixo | bug | `src/pages/PerCapita.jsx:33` | Sobreposições de per capita do usuário listadas com limite padrão de 50 | Contratos front/back |
| Baixo | bug | `src/pages/ReceitaAberta.jsx:871` | Remover item em receita de catálogo faz o fork mas não remove o item, e mesmo assim exibe 'Item removido' | UI de receitas |
| Baixo | bug | `src/pages/ReceitaAberta.jsx:436` | commitTotalGrams grava peso_pre_preparo_total com fator calculado sobre o total local (não persistido), deixando rendimento inconsistente | UI de receitas |
| Baixo | performance | `src/pages/ReceitaAberta.jsx:153` | Cada abertura de receita baixa o catálogo inteiro de receitas (fetchAllPages) só para resolver nomes de sub-receita | UI de receitas |
| Baixo | melhoria | `src/pages/ResetPassword.jsx:41` | ResetPassword aceita senha fraca (apenas 8 caracteres) enquanto o cadastro exige maiúscula, minúscula e número | Autenticação e rotas |

## Anexo B — Achados não verificados (123)

Levantados por um revisor com evidência de código, mas o passe adversarial não chegou a rodar sobre eles (limite de uso da sessão). Trate como suspeitas a confirmar, não como fatos.

| Sev. | Tipo | Local | Achado | Área |
| --- | --- | --- | --- | --- |
| Crítico | integridade | `src/pages/OrcamentoCardapio.jsx:43` | Preço final do Orçamento da Refeição ≥ R$ 1.000 é lido como R$ 0 e regravado como 0 | UI de cardápios e eventos |
| Crítico | integridade | `src/pages/OrcamentoEvento.jsx:35` | Preço final do Orçamento do Evento ≥ R$ 1.000 é lido como R$ 0 e regravado como 0 | UI de cardápios e eventos |
| Alto | bug | `base44/functions/aplicarTagsAutomatico/entry.ts:160` | Tags automáticas são criadas sem is_base/usuario_dono_id e ficam invisíveis para usuários não-admin | Ingredientes (backend) |
| Alto | integridade | `base44/functions/atualizarPrecosAutomatico/entry.ts:112` | Resultados da IA são associados por índice global: um lote com menos itens desloca os preços para os ingredientes errados | Ingredientes (backend) |
| Alto | integridade | `base44/functions/converterMedidasReceitas/entry.ts:24` | converterMedidasReceitas: frações mistas, vírgula decimal e ½ são lidas como quantidade errada | Manutenção de receitas |
| Alto | integridade | `base44/functions/converterMedidasReceitas/entry.ts:206` | converterMedidasReceitas sobrescreve quantidades corretas e estima sólidos como ml≈g em receitas de todos os usuários | Manutenção de receitas |
| Alto | integridade | `base44/functions/corrigirPorcoesBaseImportacao/entry.ts:30` | corrigirPorcoesBaseImportacao altera receitas pessoais de qualquer usuário que tenham o mesmo nome das sopas | Manutenção de receitas |
| Alto | integridade | `base44/functions/corrigirRendimentoReceitas/entry.ts:64` | corrigirRendimentoReceitas grava peso_pre_preparo_total com regra pré-Fase 8 e invalida rendimentos confirmados | Manutenção de receitas |
| Alto | integridade | `base44/functions/fundirIngredientes/entry.ts:134` | Fusão de ingredientes exclui a origem sem reapontar IngredienteUsuario, PrecoIngredienteCliente, CarrinhoItem, SinonimosIngredientes e MedidaCaseira | UI de ingredientes |
| Alto | integridade | `base44/functions/fundirIngredientes/entry.ts:61` | Fusão soma/apaga linhas de cache de sub-receita como se fossem ingredientes diretos, corrompendo custos após a próxima sincronização | Ingredientes (backend) |
| Alto | integridade | `base44/functions/importarIngredientesCsv/entry.ts:62` | Importação CSV zera preco_por_g_rs de ingredientes existentes quando o arquivo não traz colunas de preço | Ingredientes (backend) |
| Alto | bug | `docs/12-JOBS-AND-AUTOMATIONS.md:7` | Janelas do gate agendado são incompatíveis com os horários das automações registrados na plataforma (docs/12) | Documentação vs código |
| Alto | bug | `src/components/comunicacao/TemplateEmailDialog.jsx:77` | Editar template de e-mail transacional cria registro sem status e desliga o envio silenciosamente | UI de administração |
| Alto | bug | `src/components/ingrediente/ficha/MedidaSinonimosCard.jsx:26` | Medidas caseiras gravadas no modelo v2 (sem `alimento`) ficam invisíveis na ficha do ingrediente, na tela Medidas Caseiras, no cálculo de cardápio e na exportação | UI de ingredientes |
| Alto | bug | `src/lib/fichaCardapioPDF.js:127` | Textos com ≈ / ⚠ / ↳ / ▸ saem ilegíveis em todos os PDFs jsPDF (fontes padrão só suportam WinAnsi) | PDF e exportação |
| Alto | integridade | `src/lib/relatoriosPlanejamentoPDF.js:255` | Ficha de Custos e Dossiê do Evento usam cache global Receita.custo_total, divergindo da Etapa 3 que usa o motor canônico com preços do usuário | PDF e exportação |
| Alto | bug | `src/lib/relatoriosPlanejamentoPDF.js:46` | Relatórios do Evento carregam apenas 500 receitas (catálogo tem 2.234) — pratos ficam "sem custo"/sem descritivo | UI de cardápios e eventos |
| Alto | bug | `src/pages/CardapioAberto.jsx:309` | Refeição tipo Buffet: quantidade em kg é passada ao motor como gramas — custo ~1000× menor e fichas mostram 0,00 kg | UI de cardápios e eventos |
| Alto | bug | `src/pages/CustosBloqueado.jsx:123` | Ativar trial do Laboratório de Custos devolve o usuário à tela de bloqueio (cache do entitlement não é invalidado) | UI de custos e conta |
| Alto | integridade | `src/pages/CustosCalcular.jsx:220` | Formação avançada congela preço/margem: alterações posteriores no custo geram ficha com margem_estimada inconsistente | UI de custos e conta |
| Alto | integridade | `src/pages/Receitas.jsx:217` | Exclusão de receita apaga só IngredienteReceita e deixa tags, insumos, esquecidos, itens de cardápio e marcadores de sub-receita órfãos | Datas e números |
| Alto | integridade | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:754` | CHECK margin_pct >= 0 rejeita fichas com margem negativa (preço informado abaixo do custo) | Migração Supabase |
| Médio | bug | `base44/functions/aplicarTagsAutomatico/entry.ts:89` | Regras de 'Sem Glúten' e 'Sem Lactose' geram alegações de restrição alimentar falsas | Ingredientes (backend) |
| Médio | bug | `base44/functions/atualizarPrecosAutomatico/entry.ts:6` | Categoria 'LATICÍNIOS' em caixa alta nunca casa com o enum 'Laticínios': laticínios ficam fora da atualização automática | Ingredientes (backend) |
| Médio | bug | `base44/functions/atualizarPrecosAutomatico/entry.ts:80` | Execução manual por admin consome o cooldown de 144 h e cancela a próxima execução agendada; job roda por padrão quando a configuração não existe | Ingredientes (backend) |
| Médio | bug | `base44/functions/backfillMedidasCaseiras/entry.ts:18` | backfillMedidasCaseiras entra em loop infinito: skip é calculado mas nunca passado ao list() | Manutenção de receitas |
| Médio | segurança | `base44/functions/buscarPrecosIA/entry.ts:60` | buscarPrecosIA aceita lista ilimitada de nomes arbitrários de qualquer assinante e não valida o retorno | Ingredientes (backend) |
| Médio | segurança | `base44/functions/exportarFaseAMigracao/entry.ts:6` | Exportação Fase A inclui o campo `created_by` (e-mail do criador) apesar de declarar "sem dados pessoais" | Manutenção de receitas |
| Médio | bug | `base44/functions/fundirIngredientes/entry.ts:154` | Prévia da fusão filtra Receita/IngredienteReceita com array literal em vez de $in, divergindo da convenção do restante do código | Ingredientes (backend) |
| Médio | integridade | `base44/functions/importarIngredientesCsv/entry.ts:58` | CSV com vírgula decimal sem aspas desloca colunas e importa preço errado silenciosamente | UI de ingredientes |
| Médio | integridade | `base44/functions/inicializarTrialLaboratorioCustos/entry.ts:73` | Tipo de e-mail 'custos_trial_ativado' não existe nos enums de LogEmail/TemplateEmail: log pode falhar após criar o acesso | Trial, e-mail e jobs |
| Médio | integridade | `base44/functions/padronizarCaixaNomes/entry.ts:59` | padronizarCaixaNomes reescreve nomes de eventos/cardápios/receitas de todos os usuários e rebaixa siglas em ingredientes | Manutenção de receitas |
| Médio | bug | `base44/functions/preencherPerCapitaCategoria/entry.ts:20` | preencherPerCapitaCategoria usa categoria "Lanche" (renomeada para "Lanches") e aplica PC a receitas pessoais | Manutenção de receitas |
| Médio | docs | `base44/functions/registrarDiaUsoTrial/entry.ts:51` | `registrarDiaUsoTrial` reativa trials legados já `vencido`, contrariando a regra documentada de que vencido não libera acesso e que histórico de trial bloqueia novo trial | Documentação vs código |
| Médio | integridade | `base44/functions/salvarCalculoCusto/entry.ts:63` | salvarCalculoCusto confia nos totais/snapshots calculados no cliente sem recomputar nem validar a composição do custo_total | Custos (backend) |
| Médio | integridade | `base44/functions/saneamentoIngredientes/entry.ts:62` | Saneamento vincula linhas quebradas ao primeiro ingrediente com nome parcialmente parecido e prioriza nome sobre ID | Ingredientes (backend) |
| Médio | integridade | `base44/functions/sanearCustosPendentes/entry.ts:556` | sanearCustosPendentes (aplicar) altera preço mestre, custo_comportamento e fonte de sub-receita sem invalidar caches de custo dependentes | Custos (backend) |
| Médio | bug | `base44/functions/sanearCustosPendentes/entry.ts:304` | Saneamento conta filhos de cache desatualizados como 'fixáveis' mas o fluxo de aplicação nunca ressincroniza os caches | Custos (backend) |
| Médio | integridade | `base44/functions/verificarExcluirIngrediente/entry.ts:34` | Exclusão de ingrediente apaga linhas de cache de sub-receita em receitas de todos os usuários e deixa referências órfãs | Ingredientes (backend) |
| Médio | docs | `base44/shared/acessoLaboratorioCustos.ts:16` | Trial da plataforma ignora as flags `modulo_habilitado`/`trial_habilitado` do Laboratório de Custos e deriva acesso do perfil, contrariando CONTEXT.md e o schema | Documentação vs código |
| Médio | docs | `docs/security/GO_LIVE_OPERATIONAL_QA_2026-08-23.md:179` | Go-live QA afirma que Renovação está 'Em breve' e que o checkout aceita só mensal/anual; o código já vende renovação e planos do Custos | Documentação vs código |
| Médio | bug | `index.html:5` | favicon.svg e manifest.json ficam fora do build: index.html referencia /favicon.svg e /manifest.json que não existem em dist/ | Build e CI |
| Médio | melhoria | `scripts/test-laboratorio-custos-fechamento.mjs:59` | Asserções de RLS em test-laboratorio-custos-fechamento passam mesmo com o histórico de custos aberto a qualquer usuário | Build e CI |
| Médio | melhoria | `scripts/test-tenant-isolation-e2e-temp.mjs:143` | expectDenied em test-tenant-isolation-e2e-temp aceita qualquer exceção (status null) como negação de acesso | Build e CI |
| Médio | bug | `src/components/CalculadoraCusto.jsx:134` | Calculadora de custo apaga o "0" digitado: impossível informar quantidade/preço menores que 1 (ex.: 0,99) | UI de custos e conta |
| Médio | bug | `src/components/comunicacao/CampanhasTab.jsx:34` | Disparo/teste de campanha sem tratamento de erro e sem exibir destinatários bloqueados | UI de administração |
| Médio | bug | `src/components/comunicacao/TransacionaisTab.jsx:153` | Aba Transacionais mostra 'Rascunho' para e-mails que estão sendo enviados pelo fallback | UI de administração |
| Médio | integridade | `src/components/comunicacao/UsuariosTab.jsx:152` | Ação em massa 'Ativar' grava status_assinatura='ativo' sem plano/data, quebrando trial 7_em_30 e mascarando expirados | UI de administração |
| Médio | integridade | `src/components/comunicacao/UsuariosTab.jsx:189` | Exclusão de usuários é feita direto do cliente, sequencial e sem cascata | UI de administração |
| Médio | bug | `src/components/configuracoes/DadosEmpresaSection.jsx:70` | "Dados da empresa/marca" e "Preferências gerais" gravam AppConfig que nenhum código lê (logo nunca aparece nos PDFs) | UI de custos e conta |
| Médio | integridade | `src/components/custos/AdicionarDespesaDialog.jsx:55` | Parser de valor mensal remove pontos antes da vírgula: "1500.50" vira R$ 150.050,00 | UI de custos e conta |
| Médio | bug | `src/components/ingrediente/IngredienteFormDialog.jsx:113` | CalculadoraCusto inicializa com valores do formulário anterior (ou vazios) ao reabrir o diálogo de ingrediente | UI de ingredientes |
| Médio | bug | `src/components/layout/TopBarSearch.jsx:61` | Busca global omite receitas pessoais autorais e usa created_by_id em vez de usuario_dono_id | UI de administração |
| Médio | bug | `src/components/planos/PixForm.jsx:49` | Polling do PIX para silenciosamente (troca de aba Cartão/PIX ou timeout de 10 min) enquanto a tela segue em "Aguardando confirmação" | UI de custos e conta |
| Médio | segurança | `src/lib/exportCsv.js:51` | exportCsv não protege contra injeção de fórmulas (=, +, -, @) nem escapa quebras \r em campos de texto do usuário | PDF e exportação |
| Médio | integridade | `src/lib/preferenciaIngredienteUsuario.js:131` | Salvar "Meus dados de compra" sem quantidade/preço cria registro pessoal que sobrescreve unidade e embalagem do mestre com vazio/zero | UI de ingredientes |
| Médio | bug | `src/lib/prePreparosCalc.js:46` | Relatório de Pré-preparos do evento ignora a margem de segurança e o kg manual do prato (diverge de Produção/Dossiê/Lista) | Motor de receitas (lib) |
| Médio | bug | `src/lib/printIsolado.js:30` | printarElementoIsolado registra onload depois de document.close() e remove o iframe 500 ms após print(): risco de nunca imprimir ou vazar iframes | PDF e exportação |
| Médio | bug | `src/lib/receitasCardapioCalc.js:50` | Relatório 'Receitas do Cardápio' só encontra medidas caseiras no formato legado (alimento/utensilio) — medidas do modelo v2 nunca aparecem | Motor de receitas (lib) |
| Médio | bug | `src/lib/receitasCardapioPDF.js:261` | Sumário do caderno 'Receitas do Cardápio' aponta páginas erradas quando uma receita ocupa mais de uma página | PDF e exportação |
| Médio | integridade | `src/lib/relatoriosPlanejamentoPDF.js:193` | Relatório de Produção do Evento ignora a quantidade ajustada manualmente de Doces & Bebidas | PDF e exportação |
| Médio | bug | `src/lib/statusAssinaturaUsuario.js:16` | computeStatusUsuario ignora data_expiracao para 'ativo' e rotula trial vencido como 'Trial expirando' | UI de administração |
| Médio | integridade | `src/lib/useSalvarIngrediente.js:24` | Salvar ingrediente recalcula preco_por_g_rs = 0 quando peso da embalagem está vazio, zerando preços vindos de CSV/IA | Datas e números |
| Médio | integridade | `src/pages/Cardapios.jsx:152` | Excluir Refeição na listagem deixa CardapioReceita/CardapioInsumo/CardapioTag órfãos | UI de cardápios e eventos |
| Médio | bug | `src/pages/Cardapios.jsx:185` | Duplicar refeição na listagem perde comportamento_custo/escala_base_unidades dos insumos (custo da cópia diverge) | UI de cardápios e eventos |
| Médio | bug | `src/pages/CustosCalcular.jsx:197` | Insumo adicional sem descrição entra no custo total mas não nos itens: servidor rejeita a ficha com erro genérico | UI de custos e conta |
| Médio | bug | `src/pages/ExportarReceita.jsx:108` | Página legada /exportar/:id gera 'R$ NaN' e '• undefined — NaN g' quando a receita tem grupos, e usa fórmula de custo obsoleta | PDF e exportação |
| Médio | integridade | `src/pages/MedidasCaseiras.jsx:145` | Tela Medidas Caseiras (admin) grava apenas campos legados e ignora o modelo canônico; edição de registro v2 não altera peso_g/ingrediente_id | UI de ingredientes |
| Médio | bug | `src/pages/NovaDicaCarmen.jsx:70` | Salvar dica da Carmen sem try/catch trava o formulário em caso de erro | UI de administração |
| Médio | bug | `src/pages/Planos.jsx:65` | Após pagamento aprovado ou trial ativado a sessão do usuário não é atualizada; ProtectedRoute continua bloqueando o app até recarregar | UI de custos e conta |
| Médio | bug | `src/pages/RelatorioPoucosIngredientes.jsx:28` | Relatório 'Poucos Ingredientes' fica em spinner eterno se a carga falhar e atualiza estado após desmontar | UI de administração |
| Baixo | segurança | `.github/workflows/quality.yml:27` | CI: actions não fixadas por SHA e sem persist-credentials: false em quality.yml; Dependabot não cobre github-actions | Build e CI |
| Baixo | bug | `base44/functions/converterMedidasReceitas/entry.ts:170` | converterMedidasReceitas: paginação por slice de uma lista limitada nunca alcança receitas além de `limite` | Manutenção de receitas |
| Baixo | performance | `base44/functions/curadoriaCustosPendentes/entry.ts:137` | Functions de curadoria/saneamento carregam todas as tabelas em memória a cada chamada, inclusive em ações de leitura leve | Custos (backend) |
| Baixo | melhoria | `base44/functions/importarIngredientesCsv/entry.ts:97` | Importação de ingredientes grava lotes sem transação e aceita categoria/unidade fora do enum; separador ';' e milhar '1.234,56' são silenciosamente mal interpretados | Ingredientes (backend) |
| Baixo | bug | `base44/functions/migrarCategorias/entry.ts:9` | migrarCategorias grava categorias fora do enum atual e contradiz a faxina posterior | Manutenção de receitas |
| Baixo | bug | `base44/functions/normalizarCustosReceitas/entry.ts:127` | normalizarCustosReceitas grava por padrão (dry_run só quando === true), inclusive em GET sem corpo | Custos (backend) |
| Baixo | bug | `base44/functions/normalizarIngredienteReceita/entry.ts:330` | normalizarIngredienteReceita usa list com limite fixo (10000/5000) sem paginação — truncamento silencioso | Custos (backend) |
| Baixo | integridade | `base44/functions/normalizarIngredienteReceita/entry.ts:404` | normalizarIngredienteReceita trata undefined≠'' como mudança: regrava filhos de cache a cada execução e invalida custos sem alteração semântica | Custos (backend) |
| Baixo | bug | `base44/functions/registrarHistoricoReceita/entry.ts:28` | registrarHistoricoReceita recusa receitas pessoais legadas sem is_base=false e o erro é engolido no cliente | Manutenção de receitas |
| Baixo | DX | `base44/functions/salvarCalculoCusto/entry.ts:1` | Versões distintas do SDK Base44 fixadas entre functions de custo (0.8.38 / 0.8.40 / 0.8.43) e duas convenções de entrypoint | Custos (backend) |
| Baixo | bug | `base44/functions/salvarCalculoCusto/entry.ts:42` | Recálculo concorrente da mesma ficha não é atômico: duas versões posteriores com o mesmo calculo_origem_id | Custos (backend) |
| Baixo | bug | `base44/functions/sincronizarSubreceita/entry.ts:81` | sincronizarSubreceita ignora dry_run nos modos marker_id e todos_desatualizados (dry-run que escreve) | Custos (backend) |
| Baixo | integridade | `base44/functions/sincronizarSubreceita/entry.ts:385` | Reconstrução de cache de sub-receita sem compensação: falha entre bulkCreate e delete deixa filhos duplicados e custo dobrado | Custos (backend) |
| Baixo | bug | `base44/functions/usosIngrediente/entry.ts:82` | usosIngrediente calcula custo e percentual com regras diferentes do motor canônico | Ingredientes (backend) |
| Baixo | docs | `docs/13-WEBHOOKS.md:11` | Doc de webhooks afirma resposta 500 em erro inesperado; o código responde 200 `processing_failed` | Documentação vs código |
| Baixo | docs | `docs/security/RLS_AUDIT_2026-08-22.md:375` | Valores de cooldown/janela da atualização automática de preços divergem entre as docs de segurança e o código | Documentação vs código |
| Baixo | docs | `docs/security/RLS_AUDIT_2026-08-22.md:251` | Auditoria RLS afirma que `create` de Receita/Cardapio exige `is_base=false`, mas os schemas não têm essa condição (mitigado por FLS) | Documentação vs código |
| Baixo | DX | `eslint.config.js:9` | ESLint só valida src/components e src/pages; src/lib, src/hooks, src/App.jsx e src/main.jsx ficam sem lint (hoje sem erros, 58 warnings) | Build e CI |
| Baixo | DX | `jsconfig.json:18` | Typecheck não alcança 34 arquivos de src (App.jsx, ProtectedRoute, AdminRoute, CustosRoute, layout, hooks, main.jsx e 13 módulos de src/lib) | Build e CI |
| Baixo | melhoria | `manifest.json:9` | Manifest PWA só com ícone SVG 'any' — não atende aos critérios de instalabilidade do Chrome/Android nem do Safari iOS | Build e CI |
| Baixo | DX | `package.json:19` | Scripts de teste de regras críticas ficam fora dos gates e a matriz de assinaturas passa sem cobrir o modelo de trial vigente | Documentação vs código |
| Baixo | DX | `package.json:86` | Dependências instaladas mas não importadas (three, moment, lodash, date-fns, html2canvas, canvas-confetti, react-hot-toast, @radix-ui/react-toast, eslint-plugin-react-refresh) | Build e CI |
| Baixo | docs | `README-MIGRATION.md:34` | Docs apontam para `.env.example`, que não existe no repositório | Documentação vs código |
| Baixo | docs | `README.md:1` | README.md ainda é o boilerplate do Base44 e as instruções de ambiente não correspondem ao projeto | Documentação vs código |
| Baixo | performance | `scripts/test-build-budget.mjs:8` | Orçamento de build no limite (entry 95%, JS total 98%) com avisos de chunk suprimidos por logLevel 'error' e sem manualChunks | Build e CI |
| Baixo | melhoria | `scripts/test-go-live-static.mjs:39` | Testes 'go-live' e de segurança verificam strings literais do código-fonte, quebrando por refatoração e passando por coincidência | Build e CI |
| Baixo | DX | `scripts/test-plano-renovacao.mjs:21` | Testes de shared/*.ts via `data:` URL e regex de import quebram ao adicionar qualquer import relativo (padrão frágil, sem mensagem útil) | Build e CI |
| Baixo | melhoria | `src/App.jsx:178` | Rota /relatorio-categorias fica fora de AdminRoute e do menu, mas é uma tela de auditoria | UI de administração |
| Baixo | integridade | `src/components/admin/HistoricoPagamentosLinha.jsx:33` | 'Data de recebimento' do pagamento usa updated_date, que muda a cada atualização do registro | UI de administração |
| Baixo | melhoria | `src/components/auditoria/PreencherPerCapitaDialog.jsx:14` | Preenchimento em massa de per capita sem confirmação, sem catch e com acesso não defensivo ao resultado | UI de administração |
| Baixo | performance | `src/components/comunicacao/UsuariosTab.jsx:59` | Aba Usuários baixa todas as receitas, refeições, cardápios e eventos da base apenas para contar por usuário | UI de administração |
| Baixo | bug | `src/components/HelpPanel.jsx:79` | Cabeçalho do painel de ajuda (título e botão fechar) fica escondido sob a barra superior fixa | UI de custos e conta |
| Baixo | integridade | `src/components/ingrediente/AtualizarPrecosDialog.jsx:307` | Atualização de preços via IA não marca `preco_estimado` e assume embalagem de 1 kg quando o peso está ausente | UI de ingredientes |
| Baixo | bug | `src/components/ingrediente/ficha/MedidaSinonimosCard.jsx:52` | Ficha do ingrediente oferece "Editar medida" e cadastro de sinônimos a usuários não-admin, que falham por RLS | UI de ingredientes |
| Baixo | bug | `src/components/planejamento/ListaPlanejamentos.jsx:32` | Retomada de rascunho do evento não valida id/propriedade nem expira (sessionStorage) | UI de cardápios e eventos |
| Baixo | bug | `src/components/receita/NovaReceitaIA.jsx:467` | Cadastro de ingrediente por IA compara nomes sem normalizar acentos e cria duplicatas | Datas e números |
| Baixo | melhoria | `src/lib/exportCsv.js:67` | CSV gerado sem BOM e com vírgula como separador abre incorretamente no Excel pt-BR (acentos corrompidos, tudo em uma coluna, decimais com ponto) | PDF e exportação |
| Baixo | performance | `src/lib/receitasCardapioCalc.js:26` | Relatórios do cardápio fazem N+1 sequencial (Receita.get + IngredienteReceita.filter por receita) e carregam 3000 medidas/ingredientes a cada abertura | Motor de receitas (lib) |
| Baixo | bug | `src/lib/relatoriosPlanejamentoPDF.js:81` | Cabeçalho dos PDFs do Evento rotula a data de criação do registro como 'Data do evento' | PDF e exportação |
| Baixo | bug | `src/lib/secureChildEntities.js:4` | parentCache de secureChildEntities nunca expira, guarda `null` de pai inexistente e o invalidador não é chamado em lugar nenhum | Motor de receitas (lib) |
| Baixo | bug | `src/lib/subreceitaUtils.js:382` | explodeSubreceita copia quantidade_medida_caseira/medida_caseira da sub-receita para os filhos sem reescalar | Motor de receitas (lib) |
| Baixo | integridade | `src/lib/useSalvarIngrediente.js:71` | Admin grava no mestre campos de sobreposição pessoal (`favorito`, `_preco_estimado`, dados comerciais/histórico do IngredienteUsuario do próprio admin) | UI de ingredientes |
| Baixo | performance | `src/pages/CardapioAberto.jsx:180` | CardapioAberto recarrega o catálogo inteiro de receitas a cada abertura e faz N+1 na lista de compras | UI de cardápios e eventos |
| Baixo | segurança | `src/pages/CustosCalcular.jsx:23` | Rascunho do cálculo em sessionStorage não é isolado por usuário | UI de custos e conta |
| Baixo | integridade | `src/pages/CustosConfiguracoes.jsx:43` | `margem_padrao` é usado em três telas mas não está declarado no schema de ConfiguracaoCustosUsuario; update envia o registro inteiro | UI de custos e conta |
| Baixo | bug | `src/pages/CustosFicha.jsx:46` | Ficha antiga mantém botão "Recalcular com preços atuais" após recálculo por causa de cache sem refetch (servidor bloqueia com 409) | UI de custos e conta |
| Baixo | DX | `src/pages/CustosPlanos.jsx:39` | CustosPlanos.jsx é código morto: não está roteado em App.jsx e duplica PlanoCard/CustosBloqueado | UI de custos e conta |
| Baixo | bug | `src/pages/Ingredientes.jsx:225` | Filtro "Desatualizados" conta ingredientes sem preço (campos undefined) como desatualizados | UI de ingredientes |
| Baixo | bug | `src/pages/InsumosEmbalagens.jsx:39` | Preço/quantidade de insumo em campo texto aceita '1.250,00' e grava 1,25 | Datas e números |
| Baixo | performance | `supabase/migrations/20260904141551_operational_schema_and_rls.sql:1363` | Policies SELECT duplicadas (visible_read + owner_write_select) em 12 tabelas | Migração Supabase |
| Baixo | bug | `supabase/migrations/20260904141viewer51_operational_schema_and_rls.sql:426` | Ciclos indiretos de sub-receita (A→B→A) não são impedidos | Migração Supabase |
| Baixo | melhoria | `supabase/tests/database/operational_schema_rls.test.sql:352` | Suite pgTAP não cobre UPDATE/DELETE entre usuários, transferência de owner, promoção a catálogo nem legacy_id em UPDATE | Migração Supabase |

## Anexo C — Achados refutados (8)

Levantados e derrubados na verificação — registrados para que não sejam reabertos.

| Local | Alegação | Por que não se sustenta |
| --- | --- | --- |
| `supabase/migrations/20260904141551_operational_schema_and_rls.sql:152` | Índice único de entitlement 'corrente' impede pendente/ativo simultâneos e upgrade de trial para plano pago | exatidao: A descrição do índice está correta e reproduzi os erros: com PostgreSQL 16 local e a migração aplicada (`scratchpad/verify/probe_s3.sql`), inserir `ativo/30_dias/checkout` para usuário em `trial_ativo` e inserir `pendente` para usuário `ativo` retornam ambos `23505 ... user_entitlements_current_uidx`. Porém o cenário não corresponde ao fluxo homologado nem a semântica alegada se sustenta |
| `base44/functions/criarPagamentoMercadoPago/entry.ts:181` | Compra combinada usa o teto de parcelas do plano-base e ignora o limite do addon de Custos | exatidao: Confirmado por execução. entry.ts l.181-182: `planoParcelamento = planoBaseId \|\| addonId \|\| plano` → para compra combinada mensal+custos_anual a validação usa 'mensal'. pure.mjs com os módulos reais: validarParcelamentoPlano('mensal', 12) → {valido:true, maximo:12}; maxParcelasPlano('custos_anual') = 6, maxParcelasPlano('custos_mensal') = 1; validarParcelamentoPlano('custos_anual', 1 |
| `src/components/ProtectedRoute.jsx:70` | Gate de assinatura e de aceite de Termos é apenas client-side para CRUD de entidades; servidor protege só três functions | exatidao: Refutado como limitação intencional e documentada, além de descrição parcialmente incorreta. docs/security/SUBSCRIPTION_ACCESS_MATRIX_2026-08-23.md linhas 88-90 ('RLS × assinatura') afirma explicitamente: 'O entitlement comercial é aplicado em ProtectedRoute e nas funções pagas server-side. Não foi adicionada dependência de status_assinatura às regras RLS nesta fase para não misturar iso |
| `src/lib/laboratorioCustosAccess.js:33` | Cliente do Laboratório de Custos não exige assinatura base ativa (servidor exige) — depende só do ProtectedRoute | exatidao: A divergência entre as cópias é factual (script scratchpad/verify/acesso.mjs: user vencido+mensal com entitlement ativo → front `true addon_ativo`, server `false plano_base_inativo vencido`; base44/shared/acessoLaboratorioCustos.ts:12-13 vs src/lib/laboratorioCustosAccess.js:27-31 que só avalia a base no ramo trial), mas já está mitigada em outra camada, como o próprio achado reconhece:  |
| `src/lib/motorReceita.js:424` | calcularMetricasReceita ignora porcoesAlvo quando não há per capita, sem sinalizar | exatidao: O comportamento da função pura reproduz (scratchpad/verify/t_metricas.mjs: `{pc:0, pesoPosPreparo:1000, porcoes:0, fator:1}`; código em src/lib/motorReceita.js:40-46, não :424-426), mas o cenário de usuário alegado é inatingível e o modelo é intencional. (1) `ReceitaAberta.commitPorcoes` (:429-433) é passado como `onChangePorcoes` para `EscaladorReceita` (:1355), porém src/components/rec |
| `src/lib/periodoFiltro.js:17` | Filtro de período personalizado lança TypeError com data inválida | exatidao: A alegação sobre a lib é factual (verify/t10.mjs: `calcularIntervaloPeriodo('personalizado','abc','2026-03-01')` → TypeError: Cannot read properties of null (reading 'year'), periodoFiltro.js:17-18 sem guarda para o `null` de fusoBrasilia.js:7), mas está mitigada na única camada consumidora: `calcularIntervaloPeriodo` só é chamada em UsuariosTab.jsx:95 com `dataInicioCustom`/`dataFimCust |
| `src/lib/relatoriosPlanejamentoPDF.js:30` | JSON.parse de cardapio_config sem try/catch derruba a geração dos relatórios do evento | exatidao: Confirmado no código e por execução. (1) src/lib/relatoriosPlanejamentoPDF.js:29-31 faz `JSON.parse(planejamento.cardapio_config)` sem try/catch; script em scratchpad/verify/x-seguranca-11.mjs replicando as linhas exatas com a entrada do cenário ('{grupos: [}') produz `SyntaxError: Expected property name or '}' in JSON at position 1` (string vazia também lança: 'Unexpected end of JSON in |
| `src/pages/OAuthConsent.jsx:15` | Página OAuthConsent (e outras) não está registrada em App.jsx — fluxo de consentimento MCP é código morto ou quebrado | exatidao: Parcialmente correto, com erro factual relevante. Confirmado: `grep -rn OAuthConsent src` só acha a própria definição; `ls base44` = config.jsonc, connectors, entities, functions, shared (sem `mcp/`); `grep -ril mcp` fora de node_modules/dist só acha OAuthConsent.jsx, um comentário em src/lib/authReturnTo.js:2,33 e um asset; `CustosPlanos` e `ScrollToTop` não têm importadores. REFUTADA a |
