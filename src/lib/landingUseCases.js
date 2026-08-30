export const LANDING_IMAGES = {
  casa: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/2f82504a0_montagem_casa.png",
  venda: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/897b1f200_montagem_venda.png",
  festa: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/5e128a8d3_montagem_festa.png",
};

export const HERO_PORTALS = [
  { key: "casa", label: "Cozinha da casa", title: "Sua cozinheira chega e o cardápio da semana ainda não está definido?", text: "Chega de decidir todo dia o que vai ter, comprar no improviso e jogar comida fora.", button: "Montar o cardápio da minha semana", href: "#secao-casa" },
  { key: "venda", label: "Produção para vender", title: "Você sabe quanto custa cada marmita que sai da sua cozinha?", text: "Vender sem conhecer o custo real é trabalhar sem saber se sobra lucro.", button: "Calcular meu preço de venda", href: "#secao-venda" },
  { key: "festa", label: "Festas e eventos", title: "Quantos quilos de comida para 50 pessoas?", text: "Nem sobrar por medo de faltar, nem faltar por não saber calcular.", button: "Calcular a comida da minha festa", href: "#secao-festa" },
];

export const USE_CASES = [
  {
    key: "casa", label: "Cozinha da casa", title: "A semana inteira decidida de uma vez",
    quote: "Nunca sei definir o cardápio para a cozinheira preparar — fico mudando de ideia e a cozinha vira um caos.",
    text: "Você monta o cardápio da semana no domingo. A lista de compras sai pronta, na medida certa. Quem cozinha — você ou sua cozinheira — recebe o plano de cada dia e o freezer registra o que foi guardado.",
    bullets: ["Cardápio por dia e por refeição, com custo por pessoa calculado automaticamente.", "Lista de compras gerada do cardápio, com o campo “já tenho” que desconta o que está na despensa.", "Relatórios prontos para enviar: ficha de produção para a cozinha e lista de receitas para imprimir."],
    example: "A carne moída de segunda vira lasanha na quarta e escondidinho congelado no sábado — tudo planejado, comprado e registrado.",
  },
  {
    key: "venda", label: "Produção para vender", title: "Preço de venda com base em custo real, não em chute",
    quote: "Fiz um jantar e cobrei barato demais — trabalhei no prejuízo.",
    text: "O Laboratório de Custos soma ingredientes, embalagem, energia, mão de obra e as despesas fixas do seu negócio — e devolve o custo por porção, o preço mínimo e o preço sugerido com a margem que você definir.",
    bullets: ["Ficha de custo por receita, com histórico preservado por versão.", "Atualizou o preço de um ingrediente? Todas as receitas que o usam recalculam em cascata.", "Orçamento para o cliente sem expor custos e margem — e ficha interna completa para você."],
    example: "Custo do negócio por receita: R$ 12,06 · custo da porção: R$ 35,50. Decida sua margem sabendo onde está pisando.", reverse: true,
  },
  {
    key: "festa", label: "Festas e eventos", title: "O cálculo que os buffets usam, na sua cozinha",
    quote: "Fiz comida para 10 pessoas e sobrou para 30.",
    text: "Informe quantos homens, mulheres e crianças. O app aplica per capitas profissionais, soma a margem de segurança e distribui o total entre as receitas do cardápio — cada uma com sua quantidade em kg e em porções.",
    bullets: ["160 convidados = 92 kg de comida, distribuídos por entrada, prato principal e guarnições.", "Salgados, doces e bebidas calculados por tipo de evento.", "Cronograma de produção regressivo: o que fazer 30, 15, 7 dias antes e no dia."],
    example: "Terrine de salmão: 150 g por porção × 7,85 porções = 1,2 kg. Você compra exatamente isso.",
  },
];