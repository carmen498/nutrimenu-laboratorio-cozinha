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
  context: "Banco de receitas com ficha técnica completa: ingredientes, modo de preparo, custo por porção, e relatórios em PDF (Ficha Técnica, Ficha de Custos, Lista de Compras). Toda receita calcula custo automaticamente com base no preço atual dos ingredientes.",
  faqs: [
    { q: "Como vejo o custo de uma receita?", a: "Abra a receita e clique em 'Exportar PDF' → 'Ficha de Custos'. Mostra o custo total, por porção, por kg, e quais ingredientes pesam mais no preço." },
    { q: "Como gero a ficha técnica em PDF?", a: "Abra a receita e clique em 'Exportar PDF' → 'Ficha Técnica'. Sempre mostra os valores BASE da receita, mesmo se você tiver escalado na tela." },
    { q: "Como compartilho uma receita?", a: "Na Ficha Técnica ou Ficha de Custos, clique em 'Compartilhar' para enviar o PDF direto por WhatsApp." },
    { q: "O que é 'Ajustar para peso total'?", a: "Recalcula TODOS os ingredientes proporcionalmente para um novo peso total (ex.: 1kg, 500g) e grava essa mudança de forma permanente na receita. Diferente do escalador do Cardápio, que é temporário." },
    { q: "Como funcionam PC Recomendado, Nº de Porções e Quantidade Total?", a: "Quantidade Total é sempre a soma real dos ingredientes cadastrados — não muda ao editar o PC. PC Recomendado é o peso ideal por porção, editável livremente. Nº de Porções é calculado automaticamente (Quantidade Total ÷ PC)." },
    { q: "Por que a receita abre com valores diferentes quando venho de um Cardápio?", a: "É o escalador em contexto: ao abrir uma receita a partir de um Cardápio/Evento, ela mostra os valores escalados para aquele cardápio específico (selo 'escalado para...' no topo). É temporário — clique em 'Restaurar original' para voltar à ficha base, ou abra pela lista de Receitas normalmente." },
    { q: "Como aplico uma tag em várias receitas de uma vez?", a: "Clique em 'Selecionar', marque as receitas (ou marque o checkbox de uma categoria inteira para selecionar todas dela de uma vez) e clique em 'Aplicar tag'." },
    { q: "Como gero um relatório com várias receitas de uma categoria?", a: "Clique no botão 'PDF' no topo da lista para gerar de todas as categorias, ou expanda uma categoria e use o ícone de relatório dentro do card para gerar só dela." },
    { q: "Como excluo ou duplico uma receita?", a: "Abra a receita e use os botões 'Duplicar receita' ou 'Excluir receita' no topo da ficha." },
    { q: "Como crio uma receita nova a partir de um texto que já tenho?", a: "Use 'Nova Receita' → 'Colar receita (IA estrutura)'. Cole o texto com ingredientes e modo de preparo — a IA organiza automaticamente na ficha. Textos que não parecem receita são recusados, para evitar criar receitas inventadas." },
    { q: "O que significa a tag 'A revisar'?", a: "Marca receitas com dados incompletos ou pendentes de conferência (ex.: ingrediente sem preço, peso não informado). Use o filtro 'Revisar' para encontrá-las rapidamente." },
    { q: "Como busco uma receita por um ingrediente específico?", a: "Digite o nome do ingrediente na busca da tela de Receitas — ela também encontra receitas que o contêm, não só pelo nome do prato." },
    { q: "Como gero a lista de compras de uma receita?", a: "Abra a receita e clique em 'Lista de Compras' — gera a quantidade de cada ingrediente a comprar, já considerando o fator de correção." },
    { q: "As categorias são fixas?", a: "Sim — as 17 categorias (Carnes, Aves, Peixes e Frutos do Mar, Ovos, Massas/Pastelão/Quiches, Arroz e Risoto, Sopas e Caldos, Leguminosas, Salgadinhos, Pães e Bolos, Sobremesas, Molhos, Acompanhamento, Prato Principal, Entradas, Petiscos, Lanche, Receitas Base) são as únicas disponíveis para manter a organização consistente." }
  ]
},
  "Receita": {
    context:
      "Esta é a ficha completa da receita, com todos os detalhes: ingredientes com quantidades e custos, sub-receitas, insumos e embalagens, modo de preparo, foto e informações nutricionais estimadas. Você pode editar qualquer campo, ajustar porções e ver o impacto no custo em tempo real.",
    faqs: [
      {
        q: "Como ajustar o número de porções?",
        a: "Use o controle deslizante de porções no topo da ficha. Os ingredientes estruturais escalam proporcionalmente; os 'a gosto' mantêm a quantidade fixa. O custo total é recalculado automaticamente.",
      },
      {
        q: "O que são ingredientes esquecidos?",
        a: "São ingredientes mencionados no modo de preparo mas que não foram listados na seção de ingredientes. O sistema detecta e sugere adicioná-los, calculando o custo adicional.",
      },
      {
        q: "Como adicionar uma sub-receita?",
        a: "Na lista de ingredientes, você pode adicionar itens do tipo 'subreceita'. Isso vincula outra receita do sistema como componente desta. O custo da sub-receita é incorporado ao custo total.",
      },
      {
        q: "Como exportar ou imprimir a receita?",
        a: "Use o botão Exportar/Imprimir no topo da ficha. Você pode gerar um PDF profissional com a ficha completa ou apenas a lista de ingredientes para compras.",
      },
      {
        q: "Como adicionar foto à receita?",
        a: "Na seção de foto, você pode fazer upload de uma imagem ou gerar uma foto com IA. A IA cria uma imagem realista do prato pronto baseada nos ingredientes e no modo de preparo.",
      },
    ],
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
    context:
      "Gerencie seu estoque de ingredientes com informações completas: categoria, unidade de compra, peso da embalagem, preço pago e preço por grama calculado automaticamente. O sistema monitora variações de preço e mantém histórico das últimas atualizações.",
    faqs: [
      {
        q: "Como cadastrar um novo ingrediente?",
        a: "Clique em Novo Ingrediente, preencha nome, categoria, unidade de compra, peso da embalagem e preço pago. O sistema calcula automaticamente o preço por grama, que é usado no custo das receitas.",
      },
      {
        q: "O que é fator de correção?",
        a: "É o fator que ajusta o peso bruto para o peso líquido aproveitável. Por exemplo, se 1 kg de cenoura rende 850 g após descascar, o fator é 1,18. O padrão é 1,0 (sem perda).",
      },
      {
        q: "Como funciona a atualização automática de preços?",
        a: "O sistema roda semanalmente (segunda-feira às 3h da manhã) uma atualização automática que busca preços de referência via IA. Ingredientes com variação superior a 5% são atualizados. Você recebe um relatório por email.",
      },
      {
        q: "Como atualizar preços manualmente?",
        a: "Use o botão 'Atualizar Preços' e escolha entre atualização manual (você informa os preços) ou via IA (o sistema busca preços de mercado automaticamente). Também é possível editar o preço diretamente na lista.",
      },
      {
        q: "O que significam as fontes de preço (Manual, IA web, CONAB, CEASA)?",
        a: "Indicam a origem da última atualização: Manual (você digitou), IA web (busca automatizada na internet), CONAB e CEASA (dados oficiais de centrais de abastecimento — em desenvolvimento).",
      },
    ],
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
    context:
      "Tabela de referência com quantidades per capita (gramas por pessoa) para centenas de preparações culinárias. Os dados vêm da POF IBGE 2017-2018 e de referências de UAN. Você pode filtrar por grupo, buscar por nome e personalizar valores para sua realidade.",
    faqs: [
      {
        q: "O que é per capita?",
        a: "Per capita é a quantidade média de alimento pronto para consumo por pessoa, expressa em gramas. Esses valores são usados automaticamente nos cardápios para calcular quantidades totais.",
      },
      {
        q: "Como personalizar um valor per capita?",
        a: "Clique no valor que deseja alterar e digite o novo valor em gramas. Itens personalizados aparecem com o selo 'Personalizado' em destaque. Você pode restaurar o valor original a qualquer momento.",
      },
      {
        q: "Como usar o filtro 'Personalizados por mim'?",
        a: "Selecione essa opção no dropdown de grupos para ver apenas os itens que você personalizou. Isso facilita revisar e gerenciar seus ajustes.",
      },
      {
        q: "Posso criar novos itens na tabela?",
        a: "Sim. Use o formulário no topo da tabela para adicionar preparações que não existem na lista padrão. Itens criados por você aparecem com o selo 'Personalizado'.",
      },
      {
        q: "Os valores são baseados em quê?",
        a: "A tabela padrão usa dados da POF (Pesquisa de Orçamentos Familiares) do IBGE 2017-2018, complementados por referências de UAN e literatura técnica em nutrição. As fontes estão listadas no final da página.",
      },
    ],
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