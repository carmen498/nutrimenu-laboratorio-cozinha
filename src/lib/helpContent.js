import { custosHelpContent } from "@/lib/custosHelpContent";

export const helpContent = {
  ...custosHelpContent,
  "Início": {
    context:
      "Este é o ponto de partida do Laboratório de Cozinha, sua plataforma de gastronomia planejada. Aqui você acessa rapidamente os módulos principais: Receitas, Cardápios, Ingredientes, Lista de Compras e a tabela de Per Capita. Cada módulo foi desenhado para facilitar o dia a dia de quem cozinha profissionalmente — do cálculo de custos à montagem de cardápios completos.",
    faqs: [
      {
        q: "O que é 'Minhas Receitas'?",
        a: "Todas as receitas do Laboratório de Cozinha são originais e compartilhadas com todos os usuários. Quando você edita uma receita (muda ingrediente, per capita, rendimento, etc.), o sistema cria automaticamente uma cópia personalizada só sua, salva em 'Minhas Receitas' — a receita original do Laboratório continua intacta para todo mundo. Se você tentar editar a mesma receita de novo, o sistema te leva direto para a sua versão em Minhas Receitas, para evitar cópias duplicadas.",
      },
      {
        q: "Por onde começar?",
        a: "O ideal é começar cadastrando seus ingredientes em Ingredientes > Novo Ingrediente. Depois, crie suas receitas em Receitas > Nova Receita. Com receitas e ingredientes no sistema, você já pode calcular custos automaticamente e montar cardápios.",
      },
      {
        q: "O que significa 'Receitas que se Multiplicam'?",
        a: "É o lema do Laboratório de Cozinha: a ideia de que uma receita bem planejada pode ser escalada para qualquer número de pessoas, com custos proporcionais e desperdício zero. O app faz essa multiplicação automaticamente.",
      },
      {
        q: "Como funciona o cálculo de custo?",
        a: "O custo é calculado a partir do preço dos ingredientes cadastrados. Quando você edita o preço de um ingrediente dentro de uma receita, o preço no banco também é atualizado. Assim, todas as receitas que usam aquele ingrediente refletem o novo valor.",
      },
      {
        q: "O que é a tabela de Per Capita?",
        a: "É uma referência de quanto cada preparação rende por pessoa, em gramas. Os valores vêm da POF IBGE 2017-2018 e de referências de UAN (Unidade de Alimentação e Nutrição). Você pode personalizar esses valores conforme sua realidade.",
      },
    ],
  },

  "Receitas": {
  context: "Aqui vive o coração do Laboratório de Cozinha: cada receita cadastrada é uma ficha técnica viva, que carrega em si o custo real, o rendimento exato e a memória de como aquele prato nasce — do ingrediente ao modo de preparo. Uma receita bem cadastrada não é só uma lista de itens: é a base que se multiplica em cardápios, eventos e outras receitas, sempre recalculando sozinha quando algo muda ao redor dela.",
  faqs: [
    { q: "Como eu cadastro uma receita nova?", a: "Nome (obrigatório) → Categoria, uma das 17 fixas (obrigatório) → PC Recomendado, pode preencher depois → Foto (opcional) → Tags (opcional) → Ingredientes, pelo menos 1 (obrigatório) → Modo de Preparo. Assim que ingredientes e PC estiverem definidos, Quantidade Total e Nº de Porções calculam sozinhos." },
    { q: "Quais são as formas de criar uma receita?", a: "Manual (campo a campo) · Colar receita (IA estrutura, a partir de um texto com ingredientes e preparo) · Importação em lote (arquivo TXT com várias receitas — se estiver em Word/PDF, peça para o Claude converter primeiro)." },
    { q: "Como adiciono ingredientes à receita?", a: "Botão '+ Ingrediente', selecionando da lista já cadastrada." },
    { q: "Como edito um ingrediente já adicionado?", a: "Clique no lápis ao lado dele na tabela." },
    { q: "Como organizo a receita em sub-títulos (Massa, Recheio etc.)?", a: "Botão '+ Sub-título' — cria um cabeçalho que agrupa ingredientes visualmente. É só organização, não gera subtotal de custo ou peso separado." },
    { q: "Posso usar uma receita já cadastrada como ingrediente de outra?", a: "Sim — qualquer receita do banco pode compor outra, não só as da categoria 'Receitas Base' (que é só organizacional)." },
    { q: "Como funciona o PC Recomendado?", a: "Peso ideal por porção, definido por você — não é automático. A tabela Per Capita (menu separado) serve de referência de mercado, mas não preenche esse campo sozinha." },
    { q: "Como funcionam as tags?", a: "Texto livre — você digita o que quiser, sem lista fixa." },
    { q: "O app padroniza o texto automaticamente?", a: "Sim — receita, cardápio e sub-título em MAIÚSCULAS; ingrediente com inicial maiúscula, ao salvar." },
    { q: "Como ajusto o peso total da receita inteira?", a: "Botão 'Ajustar peso total da receita' — recalcula tudo proporcionalmente e grava permanentemente." },
    { q: "Como excluo, duplico ou edito uma receita?", a: "Editar (grava automático, sem botão Salvar) · Duplicar · Excluir (com confirmação) · Favoritar (estrela) · 'A revisar' · Cor (mesma de Cores do Cardápio) · Adicionar tag." },
    { q: "Como gero um relatório de várias receitas de uma categoria?", a: "Expanda a categoria e use o botão de relatório dentro do card." },
    { q: "Como uso Insumos e Embalagens numa receita?", a: "Aparece tanto na receita quanto no Cardápio — você adiciona itens vindos do banco de Insumos (aba própria, com preços cadastrados). Soma separado do custo de ingredientes." },
    { q: "Como funciona 'Quanto cobrar se eu vender?'", a: "Ajuste a margem (%) pelo slider — preço sugerido por porção calculado em tempo real." },
    { q: "Como gero os relatórios da receita?", a: "'Exportar PDF' → Ficha Técnica ou Ficha de Custos; botão 'Lista de Compras' separado. Todos abrem em pré-visualização antes de baixar, com opção de Compartilhar." },
    { q: "Como uma receita vai parar em 'Minhas Receitas'?", a: "Automaticamente. Ao editar qualquer campo de uma receita original (ingrediente, PC Recomendado, Rendimento, ou usar o 'Escalar receita'), o sistema cria uma cópia personalizada e a salva em Minhas Receitas, sem nenhuma ação extra de sua parte." },
    { q: "Minhas Receitas é a mesma coisa que duplicar uma receita?", a: "Não. 'Duplicar receita' cria uma cópia manual, independente, sob demanda. Uma receita em 'Minhas Receitas' é gerada automaticamente no momento em que você edita uma receita original, e mantém o vínculo com ela." },
    { q: "Se eu editar a mesma receita original de novo, ele cria uma segunda cópia?", a: "Não. O sistema identifica que você já tem uma versão personalizada dessa receita e te leva direto para ela, evitando cópias duplicadas." },
    { q: "A receita original muda quando eu edito minha cópia?", a: "Não. A receita original do Laboratório permanece intacta e continua disponível normalmente para você e para os demais usuários." },
    { q: "Se o preço de um ingrediente mudar no catálogo, minha receita personalizada também muda?", a: "Sim. O custo é sempre calculado com o preço mais atual do catálogo — não fica congelado no momento em que você personalizou a receita." },
    { q: "Posso remover um ingrediente ou mudar o nome dele só na minha versão?", a: "Sim. Alterações feitas na lista de ingredientes da sua cópia pessoal afetam só a sua versão — a receita original e o catálogo geral de ingredientes não são alterados." },
    { q: "Como acesso minhas receitas personalizadas?", a: "Clique no card 'Minhas Receitas' na tela de Início, ou no mesmo card na tela de Receitas — os dois levam direto para a listagem das suas cópias." },
    { q: "Como sei quantas receitas já personalizei?", a: "O número ao lado de 'Minhas Receitas' (na tela de Início e na de Receitas) mostra a contagem atualizada em tempo real." },
    { q: "Se eu excluir uma receita de 'Minhas Receitas', perco o acesso a ela?", a: "Não. Você continua com acesso normal à receita original do Laboratório — só a sua versão personalizada é removida." },
    { q: "Existe limite de quantas receitas posso personalizar?", a: "Não, você pode ter quantas cópias pessoais quiser." }
  ]
},
  "Refeições": {
    context: "Refeições reúnem receitas e itens em uma composição pronta para servir. Esta área corresponde ao recurso anteriormente chamado Cardápios; os cadastros e o funcionamento foram preservados.",
    faqs: [
      { q: "O que mudou de Cardápios para Refeições?", a: "Mudou a organização e a nomenclatura. Os registros existentes continuam disponíveis e as funções de criar, editar, duplicar, favoritar e excluir permanecem iguais." },
      { q: "Como crio uma refeição?", a: "Use Nova Refeição, informe nome e tipo e depois inclua as receitas e os demais itens da composição." },
      { q: "Onde encontro minhas versões personalizadas?", a: "Abra o card Minhas Refeições na tela de Refeições." }
    ],
  },
  "Eventos": {
    context: "Eventos é o módulo independente para planejar uma ocasião completa: público, quantidades, cardápio do evento, doces, bebidas, compras e produção.",
    faqs: [
      { q: "Onde estão os eventos que já existiam?", a: "Todos foram preservados. Agora eles são acessados diretamente pelo item Eventos no menu do Laboratório de Cozinha." },
      { q: "Como crio um evento?", a: "Abra Eventos e use Novo Evento. O assistente mantém as etapas e os cálculos que já existiam." },
      { q: "Refeições e Eventos continuam relacionados?", a: "Sim. A separação organiza a navegação; ela não remove os recursos de composição e planejamento usados dentro do evento." }
    ],
  },
   "Cardápios e Eventos": {
  context: "Um Cardápio reúne receitas já cadastradas numa proposta completa — para um dia, uma semana, um evento — e calcula sozinho o peso total, o custo, e os relatórios prontos para cada público: a cozinha que vai produzir, o cliente que vai pagar, e você que precisa saber se vale a pena. Um Evento vai além do cardápio: é o planejamento completo de uma ocasião, do perfil de quem vai ser servido até a última garrafa de bebida. Em quatro etapas — Contexto, Clientes, Cardápio e Doces & Bebidas — o app transforma o número de convidados numa previsão realista de quanto produzir, quanto vai custar e quanta margem de segurança você precisa para não faltar nem sobrar.",
  faqs: [
    { q: "Por que os conceitos de Cardápio e Eventos são separados?", a: "Cardápio é a unidade simples — um conjunto de receitas, pessoas, custo. Serve pra qualquer contexto do dia a dia: o cardápio da semana, o cardápio diário de um restaurante, uma refeição pontual. Rápido de montar, sem etapas. Evento é a unidade completa de planejamento comercial — porque um evento (casamento, festa, buffet) não é só 'quais receitas eu vou servir', é um processo com várias camadas de decisão antes de chegar no cardápio: quem são os convidados (Clientes), que margem de segurança você precisa pra não faltar comida (imprevisto, repeteco), e uma categoria à parte que cardápio nenhum trata direito — Doces & Bebidas, que tem lógica de cálculo própria (consumo por pessoa, tipo de bebida), diferente de comida. Cardápio é o miolo que mora dentro de um Evento (na etapa 3), mas Evento carrega responsabilidade que Cardápio sozinho não assume." },
    { q: "Como crio um cardápio novo?", a: "Nome e Categoria são os campos principais na criação — os demais (pessoas, receitas, insumos) você preenche ao montar o cardápio." },
    { q: "As categorias de Cardápio são fixas?", a: "Sim — Diário, Semanal, Fim de semana, Especial, Comemoração, Marmitas, Buffet, Happy Hour e Personalizado são as únicas disponíveis." },
    { q: "Como adiciono receitas ao cardápio?", a: "Use '+ Adicionar item' (ou '+ Adicionar prato' no Evento) na seção Receitas. É possível filtrar por categoria da receita para facilitar a busca." },
    { q: "Como o Cardápio calcula a quantidade de cada receita?", a: "Ao adicionar uma receita ao cardápio, ela entra com o PC Recomendado já definido na própria ficha da receita — mas esse valor pode ser alterado aqui dentro, específico para este cardápio. A diferença é o conceito: enquanto na receita o PC é uma referência técnica isolada, no Cardápio ele é multiplicado pelo número de pessoas do evento, para que a quantidade total (kg) seja sempre compatível com quantas pessoas você realmente vai servir." },
    { q: "Posso abrir uma receita de dentro do cardápio para conferir os ingredientes?", a: "Sim. Ao clicar numa receita do cardápio, ela abre já escalada para a quantidade deste cardápio específico — mostrando cada ingrediente na proporção certa, com a indicação 'original: X g' ao lado de cada item. Qualquer ajuste feito nessa visualização fica registrado só para este cardápio, nunca sobrescreve a ficha da receita." },
    { q: "Como edito a categoria, a data ou o número de pessoas?", a: "Clique em 'Editar' — os campos ficam editáveis. O número de pessoas também pode ser ajustado direto pelos botões '−'/'+' no topo, recalculando o custo por pessoa na hora." },
    { q: "Por que uma receita abre com valores diferentes quando clico nela a partir do Cardápio?", a: "O escalador em contexto ajusta a receita para o PC e número de pessoas definidos NESTE cardápio — é temporário, a receita original não é alterada." },
    { q: "O que é 'Cores do Cardápio'?", a: "Mostra a distribuição de cores dos pratos e avisa quando uma cor domina demais o cardápio (ex.: 'Branco/Creme domina 67% dos pratos'), ajudando a evitar uma apresentação visualmente monótona." },
    { q: "Como adiciono Insumos e Embalagens ao cardápio?", a: "Botão '+ Banco' na seção Insumos e Embalagens, escolhendo do mesmo banco usado nas receitas." },
    { q: "Como funciona 'Quanto cobrar se eu vender?'", a: "Ajuste a margem (%) — o app mostra custo por unidade, valor da margem e o preço sugerido de venda." },
    { q: "O que significa o aviso 'prato sem custo completo'?", a: "Indica que algum prato do cardápio/evento tem um ingrediente sem preço cadastrado — o custo total fica subestimado até isso ser corrigido." },
    { q: "Quais relatórios posso gerar de um Cardápio?", a: "No botão 'Relatórios': Ficha do Cardápio (produção), Orçamento (documento para o cliente, sem custos internos), Pré-preparos (mise en place), Ficha de Custos (uso interno) e Receitas do Cardápio (lista para impressão). Cada um abre em pré-visualização antes de exportar ou compartilhar." },
    { q: "Como gero a lista de compras?", a: "Botão 'Lista de Compras' — soma os ingredientes de todas as receitas do cardápio/evento." },
    { q: "Como excluo, duplico ou favorito um Cardápio?", a: "Clique nos '...' ao lado do cardápio na lista para Duplicar ou Excluir. A estrela ☆ marca como favorito." },
    { q: "Como funcionam as 4 etapas do Evento?", a: "O Evento é montado em sequência: Contexto (o que é o evento) → Clientes (quem vai ser servido) → Cardápio (o que vai ser servido) → Doces & Bebidas (etapa opcional). Você pode salvar o evento a qualquer momento pelo botão 'Salvar Evento', sem precisar completar todas as etapas de uma vez." },
    { q: "O que preencho na etapa Contexto?", a: "Nome do evento (obrigatório) e Tipo do Planejamento — Almoço, Jantar, Coquetel, Data Comemorativa, Confraternização ou Outro (obrigatório). Também: Tipo de Serviço (Buffet, Empratado, À La Carte, Refeição Familiar, Self-Service ou Outro), Horário de início e Duração em horas — a duração impacta diretamente o cálculo de bebidas e aperitivos na etapa 4." },
    { q: "Como funciona a etapa Clientes?", a: "Informe quantos Homens, Mulheres e Crianças serão servidos — o total soma automaticamente. Cada grupo tem um Per Capita (g/pessoa) próprio, ajustável pelo slider, com um valor 'padrão' sugerido que você pode alterar conforme sua experiência com aquele público." },
    { q: "O que é a Margem de Segurança?", a: "Um percentual extra aplicado ao total de comida calculado, para cobrir imprevistos como repeteco ou variação de apetite. O app orienta: 10% para eventos controlados e empratados, 20% para buffet livre ou público variado. Mostra lado a lado o 'Total base (sem margem)' e o 'Total com margem', ambos em kg." },
    { q: "Como funciona a etapa Cardápio dentro do Evento?", a: "Funciona como um Cardápio comum — adicione pratos, filtre por categoria (Entrada, Prato Principal, Guarnição, Arroz/Massas, Saladas, Sobremesa), ajuste o PC de cada prato, acompanhe o custo total e por pessoa." },
    { q: "Doces & Bebidas é obrigatório?", a: "Não — é uma etapa opcional. Se você não precisar planejar doces e bebidas separadamente, pode salvar o evento sem completar essa etapa." },
    { q: "Como funciona a etapa Doces & Bebidas?", a: "Os itens ficam organizados por seção (Coquetel, Doces, Bebidas), cada um com checkbox de seleção, PC Médio, Quantidade Final, Custo Unitário (kg, unidade ou cento, dependendo do item) e % de Adesão — a estimativa de quantos convidados vão consumir aquele item. O custo é calculado separadamente e não soma ao total de comida em kg do Cardápio." },
    { q: "Como gero a lista de compras do Evento?", a: "Na etapa Cardápio, use o botão 'Salvar e Gerar Lista de Compras' — reúne os ingredientes de todos os pratos do evento." },
    { q: "Posso editar um evento já salvo?", a: "Sim — reabra o evento e navegue pelas 4 etapas normalmente, usando 'Voltar' ou clicando direto no nome da etapa no topo para pular entre elas." },
    { q: "Como um cardápio vai parar em 'Meus Cardápios'?", a: "Automaticamente. Ao editar qualquer parte de um cardápio original — adicionar/remover uma receita, alterar o PC por prato, editar tags, favoritar, ou até editar uma receita de dentro dele — o sistema cria uma cópia personalizada e a salva em Meus Cardápios, sem nenhuma ação extra de sua parte." },
    { q: "Se eu só adicionar uma receita ao cardápio, sem alterá-la, isso já personaliza o cardápio?", a: "Sim. Qualquer alteração no cardápio em si (incluindo montar a lista de receitas) já cria a cópia pessoal. A receita adicionada, porém, só ganha uma versão personalizada própria se você editar algo nela — só incluí-la no cardápio não gera cópia da receita." },
    { q: "Um cardápio pode ter receitas originais e receitas personalizadas ao mesmo tempo?", a: "Sim. Se você editar só uma das receitas de um cardápio com várias, apenas essa receita passa a usar sua versão personalizada — as demais continuam vindo direto da base original, e se atualizam automaticamente se a receita original mudar." },
    { q: "Meus Cardápios é a mesma coisa que duplicar um cardápio?", a: "Não. 'Duplicar cardápio' cria uma cópia manual, independente, sob demanda. Um cardápio em 'Meus Cardápios' é gerado automaticamente no momento em que você edita um cardápio original, e mantém o vínculo com ele." },
    { q: "Se eu editar o mesmo cardápio original de novo, ele cria uma segunda cópia?", a: "Não. O sistema identifica que você já tem uma versão personalizada desse cardápio e reaproveita ela, evitando cópias duplicadas." },
    { q: "O cardápio original muda quando eu edito minha cópia?", a: "Não. O cardápio original do Laboratório permanece intacto e continua disponível normalmente para você e para os demais usuários." },
    { q: "Os preços e custos do cardápio ficam desatualizados?", a: "Não, para as receitas não editadas. O custo de cada receita que ainda vem da base original é sempre calculado com o preço mais atual do catálogo — só as receitas que você personalizou dentro do cardápio têm seus próprios ingredientes e valores fixados na sua versão." },
    { q: "Como acesso meus cardápios personalizados?", a: "Clique no card 'Meus Cardápios' na tela de Cardápios — ele leva direto para a listagem das suas cópias." },
    { q: "Como sei quantos cardápios já personalizei?", a: "O número ao lado de 'Meus Cardápios' na tela de Cardápios mostra a contagem atualizada em tempo real." },
    { q: "Se eu excluir um cardápio de 'Meus Cardápios', perco o acesso a ele?", a: "Não. Você continua com acesso normal ao cardápio original do Laboratório — só a sua versão personalizada é removida." },
    { q: "Existe limite de quantos cardápios posso personalizar?", a: "Não, você pode ter quantas cópias pessoais quiser." }
  ]
},
 "Ingredientes": {
  context: "Cada ingrediente parte de um cadastro técnico do Laboratório, compartilhado por todos os usuários. Sobre essa base, cada usuário pode registrar seus próprios dados de compra — como preço, embalagem e fornecedor — sem alterar o ingrediente original. Esses dados pessoais alimentam os cálculos de custo das suas receitas, cardápios, listas de compras e orçamentos. Por isso, manter Meus Ingredientes atualizados é o que aproxima os custos do app da sua realidade de compra.",

  faqs: [
    { q: "Como cadastro um ingrediente novo?", a: "O catálogo de ingredientes é uma base técnica compartilhada do Laboratório. Por isso, a criação de novos ingredientes no cadastro-mãe é feita pela administração. O usuário trabalha com os ingredientes existentes e pode personalizar seus próprios dados de compra, preço, embalagem e fornecedor." },

    { q: "Como edito o preço de um ingrediente?", a: "Abra o ingrediente e informe o preço da embalagem, peso ou volume comprado e, se desejar, o fornecedor. Esses dados ficam vinculados somente à sua conta. O sistema calcula automaticamente o preço proporcional por g ou mL e passa a utilizar seu valor pessoal nos cálculos de custo." },

    { q: "O que é o Fator de Correção (FC)?", a: "O Fator de Correção relaciona o peso bruto comprado ao peso líquido realmente utilizável. Exemplo: se 1 kg de um alimento comprado resulta em 800 g após limpeza, o FC é 1,25. Como é uma característica técnica do ingrediente, o FC pertence ao cadastro-mãe do Laboratório e não é alterado individualmente pelo usuário." },

    { q: "O que são Sinônimos de um ingrediente?", a: "São nomes alternativos usados para facilitar buscas e reconhecimento de ingredientes. Por exemplo, um mesmo alimento pode ser conhecido por diferentes nomes ou grafias. Os sinônimos ajudam o sistema a localizar corretamente o ingrediente sem criar cadastros duplicados." },

    { q: "Como fundir dois ingredientes duplicados?", a: "A fusão é uma operação administrativa sobre o catálogo-mãe. Ela permite substituir um ingrediente duplicado pelo cadastro correto, preservando os vínculos com receitas. Como a alteração afeta toda a base compartilhada, essa função é restrita à administração." },

    { q: "Como atualizo o preço de vários ingredientes de uma vez?", a: "A atualização em lote do catálogo é uma função administrativa. Para o usuário, os preços pessoais são atualizados diretamente na ficha de cada ingrediente, permitindo registrar os valores efetivamente pagos por você, sem modificar os preços de outros usuários." },

    { q: "O que é a Atualização Automática de Preços?", a: "É um recurso administrativo utilizado para pesquisar e atualizar referências de mercado do catálogo. Ele não substitui o preço pessoal do usuário. O valor utilizado na sua realidade de compra continua sendo aquele registrado por você em Meus Ingredientes, quando houver." },

    { q: "Como importo ingredientes em lote?", a: "A importação em lote altera o catálogo técnico compartilhado e, por isso, é uma função administrativa. O usuário comum não precisa importar ingredientes para personalizar preços ou fornecedores: basta utilizar os ingredientes existentes no catálogo." },

    { q: "O que significa 'nunca atualizado' ou uma data em laranja/vermelho?", a: "É um alerta de atualização de preço. Ele indica que aquele valor ainda não possui uma data de atualização registrada ou que já está há muito tempo sem revisão. Serve como lembrete para conferir se o preço ainda corresponde à realidade de compra." },

    { q: "As categorias de ingredientes são fixas?", a: "Sim. As categorias pertencem à organização do catálogo-mãe e são padronizadas para manter a mesma estrutura em todo o Laboratório. O usuário pode personalizar seus dados comerciais, mas não altera a classificação técnica do ingrediente." },

    { q: "Como excluo ou edito um ingrediente?", a: "Há dois tipos de alteração. O usuário pode editar seus próprios dados de compra, como preço, embalagem e fornecedor. Já alterações estruturais — nome, categoria, FC, exclusão ou fusão — pertencem ao cadastro-mãe e ficam restritas à administração." },

    { q: "Como favorito um ingrediente?", a: "Clique na estrela ☆ ao lado do ingrediente. O favorito é apenas um atalho pessoal de consulta. Ele permite encontrar rapidamente os ingredientes que você usa ou consulta com mais frequência, sem alterar nenhum dado do ingrediente." },

    { q: "O que é 'Meus Ingredientes'?", a: "É a área que reúne os ingredientes do catálogo para os quais você já possui dados pessoais de compra. Um ingrediente passa a aparecer em Meus Ingredientes quando você registra informações como preço, embalagem, fornecedor ou outros dados comerciais próprios. O cadastro técnico original continua intacto." },

    { q: "Marcar como favorito faz o ingrediente entrar em 'Meus Ingredientes'?", a: "Não. Favoritos e Meus Ingredientes são independentes. Favoritar significa apenas marcar um ingrediente para acesso rápido. Para aparecer em Meus Ingredientes, ele precisa possuir dados pessoais de compra registrados por você." },

    { q: "Um ingrediente pode estar em Favoritos e em Meus Ingredientes ao mesmo tempo?", a: "Sim. Você pode ter, por exemplo, a farinha de trigo com seu preço e fornecedor cadastrados em Meus Ingredientes e também marcá-la como Favorita por utilizá-la com frequência." },

    { q: "Se eu alterar o preço de um ingrediente, isso muda para outros usuários?", a: "Não. Seu preço, embalagem e fornecedor são dados pessoais. Eles ficam associados somente à sua conta. O ingrediente-mãe e os dados dos demais usuários permanecem inalterados." },

    { q: "Se o Laboratório atualizar o ingrediente-mãe, eu perco meus dados pessoais?", a: "Não. A base técnica e seus dados comerciais são camadas diferentes. O Laboratório pode corrigir ou aperfeiçoar informações técnicas do ingrediente sem apagar seu preço, embalagem ou fornecedor pessoal." },

    { q: "Como vejo em quais receitas um ingrediente é usado?", a: "Abra a ficha do ingrediente. A seção de utilização mostra as receitas em que ele aparece, permitindo entender onde aquele ingrediente participa dos cálculos e quais preparações dependem dele." },

    { q: "Como gero um relatório PDF de ingredientes?", a: "Na tela Ingredientes, abra 'Mais' → 'PDF de ingredientes'. Você pode gerar o relatório de todos os ingredientes ou da categoria selecionada. Os dados apresentados respeitam a visão disponível para a sua conta." },

    { q: "Como uso o Carrinho a partir daqui?", a: "Clique no ícone de carrinho ao lado do ingrediente para adicioná-lo à sua lista de reposição. O Carrinho é independente de Favoritos e Meus Ingredientes: ele representa o que você pretende comprar, enquanto Meus Ingredientes guarda seus dados comerciais e Favoritos funciona como atalho de consulta." }
  ]
},
"Medidas": {
  context: "A ponte entre a precisão da balança e a praticidade da cozinha: aqui ficam as conversões que permitem que uma receita mostre '3 colheres de sopa' ao lado de '45g', sem você precisar fazer essa conta na cabeça toda vez.",
  faqs: [
    { q: "Como funciona a conversão de medida caseira?", a: "Cada ingrediente tem um peso de referência por unidade caseira (ex.: 1 xícara de farinha = 120g). O app usa isso para mostrar a medida junto ao peso em gramas na ficha da receita, quando o toggle 'Medida caseira' está ativado." },
    { q: "Como edito a conversão de um ingrediente específico?", a: "Você pode editar tanto pela tela de Medidas (buscando o ingrediente) quanto direto pela Ficha do Ingrediente — os dois caminhos levam ao mesmo lugar." },
    { q: "Posso cadastrar uma medida nova (ex.: '1 pitada', '1 dente')?", a: "Sim — não existe lista fixa de tipos de medida caseira, você pode criar um tipo novo sempre que precisar." },
    { q: "Por que algumas linhas de ingrediente não mostram medida caseira?", a: "Ingredientes sem conversão cadastrada aparecem com traço (—) na coluna Medida Caseira, em vez de um valor." }
  ]
},
"Insumos": {
  context: "Nem tudo que compõe o custo de um prato é ingrediente listado na receita. Água usada no preparo, farinha pra polvilhar a forma, óleo de untar, sal usado durante o cozimento, papel toalha, filme plástico — são os chamados 'itens esquecidos': custos reais que toda ficha técnica malfeita ignora, e que o Laboratório de Cozinha trata como uma categoria própria, com preço e cálculo estruturados: os Insumos e Embalagens.",
  faqs: [
    { q: "O que são 'itens esquecidos' e por que viraram Insumos e Embalagens?", a: "São os custos ocultos que toda ficha técnica costuma esquecer — água, farinha de polvilhar, óleo de untar, sal e pimenta usados no preparo, papel toalha, filme plástico, embalagens (com tampa, sem tampa, quadradas, redondas etc.), entre outros. Antes, esse era só um conceito educacional; hoje, o app estrutura isso numa única categoria — 'insumo' e 'embalagem' são cadastrados da mesma forma, sem distinção — com preço calculado e entrando de fato no custo total da receita." },
    { q: "Como cadastro um insumo novo?", a: "Clique em 'Novo Insumo', preencha Nome e Unidade de medida (obrigatórios), e opcionalmente o Preço da embalagem e a Quantidade total nela — o Preço por unidade calcula automaticamente a partir desses dois valores." },
    { q: "Como adiciono um insumo a uma receita ou cardápio?", a: "Na seção 'Insumos e Embalagens' da receita ou do cardápio, clique em '+ Banco' e escolha o item." },
    { q: "O que acontece se um insumo não tiver preço definido?", a: "Aparece com '—' na coluna Preço por unidade e não entra no cálculo do custo total até o preço ser preenchido." },
    { q: "Insumos entram no custo por porção da receita?", a: "Sim, quando adicionados — somam ao 'Custo total de produção', separado do custo de ingredientes." },
    { q: "Como excluo ou edito um insumo?", a: "Use o lápis para editar ou a lixeira para excluir, na linha do insumo na lista." }
  ]
},
"Carrinho": {
  context:
    "Lista de reposição de ingredientes para compra — centrada em ingredientes individuais, separada das listas de compras geradas por receita ou evento.",
  faqs: [
    {
      q: "Como adiciono um ingrediente ao Carrinho?",
      a: "Duas formas: 1) Clique no ícone de carrinho no menu lateral esquerdo e selecione os ingredientes que deseja adicionar à lista, um a um. 2) Na aba Ingredientes, busque pelo nome ou filtre por categoria e clique no ícone de carrinho ao lado do item para adicioná-lo à lista. Funciona como uma lista de reposição — os ingredientes vão sendo adicionados e ficam à espera da finalização da compra."
    },
    {
      q: "O Carrinho é a mesma coisa que a Lista de Compras de uma receita?",
      a: "Não. Lista de Compras é gerada a partir de uma receita ou cardápio específico. O Carrinho é uma lista de reposição geral, editável livremente."
    },
    {
      q: "Como marco um item como já comprado?",
      a: "Use o círculo ao lado de cada item no Carrinho."
    },
    {
      q: "Como removo um item do Carrinho?",
      a: "Clique no ícone de lixeira ao lado do item."
    },
    {
      q: "Como limpo o Carrinho inteiro de uma vez?",
      a: "Use o botão 'Limpar carrinho' no final da lista."
    },
    {
      q: "Como limpo só os itens já marcados como comprados?",
      a: "Use o botão 'Limpar comprados', ao lado de 'Limpar carrinho'."
    },
    {
      q: "Como o valor total é calculado?",
      a: "O 'Total da compra' soma o preço de cada item multiplicado pela quantidade definida."
    },
    {
      q: "Como eu exporto minha lista de compras em PDF?",
      a: "Clique em 'Exportar PDF' no topo da tela Carrinho. Você verá uma pré-visualização da lista antes de baixar o arquivo."
    },
    {
      q: "Os itens do Carrinho ficam salvos se eu sair da tela?",
      a: "Sim, o Carrinho persiste até você remover os itens manualmente."
    }
  ]
},
  "Lista de Compras": {
    context:
      "A lista de compras é gerada automaticamente a partir dos seus cardápios. Ela consolida todos os ingredientes necessários, calcula as quantidades com base no número de porções e estima o custo total da compra. Você pode marcar o que já tem em casa.",
    faqs: [
      {
        q: "Como gerar uma lista de compras?",
        a: "A partir de um cardápio aberto, clique em 'Gerar Lista de Compras'. O sistema consolida todos os ingredientes e calcula quantidades. A lista aparece na tela de Lista de Compras.",
      },
      {
        q: "Como funciona o 'Já Tenho'?",
        a: "Marque os ingredientes que você já tem em casa. O valor total da compra é recalculado descontando esses itens. Útil para evitar compras desnecessárias.",
      },
      {
        q: "Posso criar uma lista de compras manualmente?",
        a: "Sim, você pode criar uma lista vazia e adicionar itens manualmente. Mas o fluxo principal é gerar a partir de cardápios, que já trazem as quantidades exatas.",
      },
    ],
  },

  "Per Capita": {
  context: "Uma tabela de referência de quanto cada preparação rende por pessoa, baseada em consumo médio brasileiro (POF IBGE + Calculadora Nutrimenu). É consulta, não cálculo automático — você decide o PC de cada receita com base na sua experiência, usando esta tabela como apoio.",
  faqs: [
    { q: "Como busco um item na tabela?", a: "Use a busca por nome, ou filtre por grupo no menu suspenso (ex.: 'Receitas do dia-a-dia')." },
    { q: "Como edito o valor de um item?", a: "Clique no lápis ao lado do valor em gramas." },
    { q: "O que é a 'Medida caseira de referência'?", a: "Mostra a mesma quantidade em unidades práticas do dia a dia (ex.: '3 colheres de sopa cheia'), para facilitar a visualização sem precisar pesar." },
    { q: "Posso adicionar um item novo à tabela?", a: "Sim, use o botão 'Adicionar Item' — o item novo entra dentro de um grupo já existente (não é possível criar um grupo novo)." },
    { q: "Posso excluir um item?", a: "Não. Por ser uma tabela de referência, ela não tem exclusão — apenas edição e adição, para preservar a base de consulta." },
    { q: "Como exporto a tabela?", a: "Botão 'Exportar PDF' no topo." },
    { q: "Os valores daqui atualizam o PC das minhas receitas automaticamente?", a: "Não — é só referência de consulta. O PC de cada receita é definido manualmente na própria ficha dela." }
  ]
},
  "Relatório de Categorias": {
    context:
      "Relatório que agrupa todas as receitas por categoria, mostrando a contagem e a lista de nomes em cada uma. Permite exportar os dados em CSV para análise externa.",
    faqs: [
      {
        q: "O que este relatório mostra?",
        a: "Mostra todas as suas receitas organizadas por categoria (Carne Bovina, Aves, Sobremesas, etc.), com o total de receitas em cada categoria e a lista completa de nomes.",
      },
      {
        q: "Como exportar para CSV?",
        a: "Clique no botão 'Exportar CSV' no topo da página. O arquivo gerado tem três colunas: Categoria, Quantidade de Receitas e Nomes das Receitas. Pode ser aberto no Excel ou Google Sheets.",
      },
      {
        q: "Receitas com mais de uma categoria aparecem repetidas?",
        a: "Sim. Uma receita que está em 'Prato Principal' e 'Carne Bovina' aparece nas duas categorias. Isso ajuda a ter uma visão completa de cada categoria.",
      },
    ],
  },

  "Exportar Receita": {
    context:
      "Esta tela gera um PDF profissional da receita para impressão ou compartilhamento. O documento inclui ficha técnica completa com rendimento, ingredientes, custos, modo de preparo e informações nutricionais estimadas, tudo com a identidade visual do Laboratório de Cozinha.",
    faqs: [
      {
        q: "O que está incluído no PDF?",
        a: "O PDF inclui: nome da receita, foto, rendimento e porções, lista de ingredientes com quantidades e custos, sub-receitas, insumos e embalagens, modo de preparo completo, custo total e por porção, e tabela nutricional estimada.",
      },
      {
        q: "Posso personalizar o que aparece no PDF?",
        a: "O PDF é gerado com todas as informações da ficha. Para ocultar algo, edite a receita antes de exportar. O layout é padronizado com a identidade visual do Laboratório de Cozinha.",
      },
    ],
  },
};