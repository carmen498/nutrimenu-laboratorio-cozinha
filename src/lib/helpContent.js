export const helpContent = {
  "Início": {
    context:
      "Este é o ponto de partida do Laboratório de Cozinha, sua plataforma de gastronomia planejada. Aqui você acessa rapidamente os módulos principais: Receitas, Cardápios, Ingredientes, Lista de Compras e a tabela de Per Capita. Cada módulo foi desenhado para facilitar o dia a dia de quem cozinha profissionalmente — do cálculo de custos à montagem de cardápios completos.",
    faqs: [
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
    { q: "Como gero os relatórios da receita?", a: "'Exportar PDF' → Ficha Técnica ou Ficha de Custos; botão 'Lista de Compras' separado. Todos abrem em pré-visualização antes de baixar, com opção de Compartilhar." }
  ]
},
  "Cardápios": {
    context:
      "Aqui você monta cardápios para diferentes ocasiões: diários, semanais, fins de semana, eventos especiais, marmitas e buffets. Cada cardápio combina receitas com quantidades per capita, calcula o custo total e sugere preço de venda com markup configurável.",
    faqs: [
      {
        q: "Como criar um cardápio?",
        a: "Clique em Novo Cardápio, escolha o tipo (diário, semanal, buffet etc.), defina o número de pessoas e adicione as receitas. O sistema usa os valores da tabela de per capita para calcular as quantidades.",
      },
      {
        q: "O que é markup e como usar?",
        a: "Markup é o percentual de lucro sobre o custo. Se o custo é R$ 10 e o markup é 100%, o preço sugerido é R$ 20. Você define o markup ideal para cada cardápio.",
      },
      {
        q: "Como funciona o cardápio semanal?",
        a: "No cardápio semanal, você organiza receitas por dia da semana e por refeição (café da manhã, almoço, lanche, jantar). O sistema calcula automaticamente a lista de compras para a semana inteira.",
      },
      {
        q: "Como gerar a lista de compras a partir de um cardápio?",
        a: "Abra o cardápio e use o botão 'Gerar Lista de Compras'. O sistema consolida todos os ingredientes de todas as receitas, calcula as quantidades necessárias e cria uma lista pronta para o mercado.",
      },
    ],
  },

  "Cardápio": {
    context:
      "Esta é a visão detalhada do cardápio, onde você gerencia as receitas incluídas, ajusta quantidades, vê o custo total consolidado e gera a lista de compras. Para cardápios semanais, você organiza as receitas por dia e refeição.",
    faqs: [
      {
        q: "Como adicionar ou remover receitas do cardápio?",
        a: "Use o botão 'Adicionar Receita' para buscar e incluir receitas. Para remover, use o ícone de lixeira ao lado de cada receita. O custo total é atualizado automaticamente.",
      },
      {
        q: "Como ajustar a quantidade per capita de uma receita?",
        a: "Clique no valor de per capita ao lado da receita. Você pode usar o valor padrão da tabela ou definir um valor personalizado para este cardápio específico.",
      },
      {
        q: "Como funciona o preço de venda sugerido?",
        a: "O preço de venda é calculado como: custo total × (1 + markup/100). Você pode ajustar o markup no topo do cardápio. O preço sugerido aparece destacado no resumo.",
      },
    ],
  },

   "Ingredientes": {
  context: "Cada ingrediente aqui carrega um preço vivo — a base sobre a qual todo o app calcula custo. Não é uma lista de compras: é a fonte da verdade que sustenta o custo de cada receita, cardápio e orçamento. Manter os preços em dia aqui é o que garante que tudo o mais no app esteja certo.",
  faqs: [
    { q: "Como cadastro um ingrediente novo?", a: "Obrigatório: Nome, Categoria e Unidade de compra. Peso da embalagem, preço e Fator de Correção podem ser preenchidos depois." },
    { q: "Como edito o preço de um ingrediente?", a: "Clique nele, edite o preço da embalagem — grava automaticamente ao sair do campo, sem botão 'Salvar'." },
    { q: "O que é o Fator de Correção (FC)?", a: "Percentual de perda no preparo — ex.: 1kg de frango comprado rende 800g limpo = FC 1,25. Não é uma informação obrigatória no cadastro; aparece como uma coluna que pode ser ativada/desativada pelo toggle 'FC' na tela. Para alterar o valor de um ingrediente específico, clique nele e edite o campo — a mudança grava automaticamente e recalcula o peso bruto em todas as receitas que usam aquele ingrediente." },
    { q: "O que são Sinônimos de um ingrediente?", a: "Termos alternativos (ex.: 'espaguete' e 'talharin') que ajudam o app a reconhecer o ingrediente em buscas e em textos colados para criar receitas." },
    { q: "Como fundir dois ingredientes duplicados?", a: "Esta funcionalidade ajuda a substituir ingredientes 'ditos semelhantes' em lote — todas as receitas que usam o ingrediente a ser eliminado são sinalizadas na tela antes da confirmação, para você conferir com segurança. Abra a Ficha do ingrediente a eliminar, clique em 'Fundir com outro ingrediente', escolha o destino e confirme. O sistema substitui automaticamente em todas as receitas, mantendo as quantidades originais, e exclui o duplicado do cadastro. Funciona mesmo com ingredientes usados em centenas de receitas." },
    { q: "Como atualizo o preço de vários ingredientes de uma vez (manual)?", a: "Em 'Mais', clique em 'Atualizar preços', escolha uma categoria, revise os preços sugeridos (fonte e variação %) e clique em 'Aceitar selecionados' ou 'Aceitar todos'. Atenção: esse recurso busca preços via IA web e consome créditos do app a cada execução — use com critério." },
    { q: "O que é a Atualização Automática de Preços?", a: "Busca preços de mercado via IA web, uma vez por semana. Fica DESLIGADA por padrão e consome créditos — ative só com critério." },
    { q: "Como importo ingredientes em lote?", a: "Via CSV, no formato padrão: categoria, nome, unidade de compra, peso da embalagem, preço, Fator de Correção." },
    { q: "O que significa 'nunca atualizado' ou uma data em laranja/vermelho?", a: "Indica que o preço não é atualizado há mais de 90 dias — vale revisar." },
    { q: "As categorias de ingredientes são fixas?", a: "Sim — categorias fixas, mantendo a organização consistente em todo o app." },
    { q: "Como excluo ou edito um ingrediente?", a: "Editar grava automático ao sair do campo. Excluir remove definitivamente — se o ingrediente estiver em uso em receitas, use 'Fundir' em vez de excluir direto, para não deixar receitas quebradas." },
    { q: "Como favorito um ingrediente?", a: "Clique na estrela ☆ ao lado do ingrediente na lista para marcá-lo como favorito e encontrá-lo mais rápido depois." },
    { q: "Como vejo em quais receitas um ingrediente é usado?", a: "Abra a Ficha do ingrediente — a seção 'Usado em X receitas' lista cada receita, com a quantidade, o custo e o % que aquele ingrediente representa no custo total dela." },
    { q: "Como gero um relatório PDF de ingredientes?", a: "Menu 'Mais' → 'PDF de ingredientes' → 'Todos' ou 'Categoria atual'." },
    { q: "Como uso o Carrinho a partir daqui?", a: "Clique no ícone de carrinho ao lado do ingrediente para adicionar 1 embalagem à lista de reposição." }
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