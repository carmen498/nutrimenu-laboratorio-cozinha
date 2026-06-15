// Tabela de Per Capita — dados compartilhados entre PerCapita e CardapioAberto
// Base: POF IBGE 2017-2018 + Calculadora Nutrimenu + Referências de UAN

export const grupos = [
  {
    grupo: "BASE",
    itens: [
      { n:1,  cat:"Arroz branco cozido", prep:"Arroz branco cozido",          g:120, medida:"4 colheres de sopa cheia" },
      { n:2,  cat:"Arroz branco cozido", prep:"Arroz para refeição servida",   g:150, medida:"4 colheres de mesa" },
      { n:3,  cat:"Feijão cozido",       prep:"Feijão cozido com caldo",       g:120, medida:"1 concha pequena" },
      { n:4,  cat:"Feijão cozido",       prep:"Feijão para refeição servida",  g:150, medida:"1 concha média" },
      { n:5,  cat:"Feijão cozido",       prep:"Feijoada",                      g:400, medida:"3 conchas grandes" },
      { n:6,  cat:"Carne bovina",        prep:"Carne bovina",                  g:150, medida:"1 unidade com molho" },
      { n:7,  cat:"Aves",                prep:"Frango",                        g:150, medida:"1 peça ou filé" },
      { n:8,  cat:"Macarrão",            prep:"Macarrão com molho",            g:250, medida:"2 xícaras de chá" },
      { n:9,  cat:"Pão",                 prep:"Pão francês",                   g:50,  medida:"1 unidade" },
      { n:10, cat:"Sopas e caldos",      prep:"Sopa / Caldo",                  g:350, medida:"2 conchas médias" },
    ]
  },
  {
    grupo: "PRATOS PRINCIPAIS — PREPARAÇÕES BRASILEIRAS",
    itens: [
      { n:11, cat:"Carne bovina",  prep:"Bife / Filé",                       g:150, medida:"1 unidade média" },
      { n:12, cat:"Carne bovina",  prep:"Carne assada / Rosbife",            g:150, medida:"2 a 3 fatias" },
      { n:13, cat:"Carne bovina",  prep:"Carne moída refogada",              g:150, medida:"3 colheres de mesa" },
      { n:14, cat:"Carne bovina",  prep:"Churrasco sem osso",                g:250, medida:"—" },
      { n:15, cat:"Carne bovina",  prep:"Churrasco com osso / misto",        g:500, medida:"—" },
      { n:16, cat:"Carne bovina",  prep:"Almôndega",                         g:120, medida:"2 a 4 unidades" },
      { n:17, cat:"Carne suína",   prep:"Costelinha / Pernil",               g:250, medida:"—" },
      { n:18, cat:"Carne suína",   prep:"Lombinho / Bisteca",                g:150, medida:"1 unidade" },
      { n:19, cat:"Aves",          prep:"Frango assado — coxa+sobrecoxa",    g:200, medida:"1 peça com osso" },
      { n:20, cat:"Aves",          prep:"Frango desfiado",                   g:120, medida:"1 xícara de chá" },
      { n:21, cat:"Aves",          prep:"Frango empanado / filé",            g:120, medida:"1 unidade" },
      { n:22, cat:"Aves",          prep:"Chester / Peru assado",             g:150, medida:"2 a 3 fatias" },
      { n:23, cat:"Peixes",        prep:"Filé de peixe grelhado",            g:150, medida:"1 filé médio" },
      { n:24, cat:"Peixes",        prep:"Bacalhau preparação pronta",        g:200, medida:"4 colheres de mesa" },
      { n:25, cat:"Frutos do mar", prep:"Camarão preparação pronta",         g:200, medida:"4 colheres de mesa" },
      { n:26, cat:"Ovos",          prep:"Omelete",                           g:100, medida:"2 ovos preparados" },
      { n:27, cat:"Ovos",          prep:"Ovo frito / cozido",                g:50,  medida:"1 unidade" },
    ]
  },
  {
    grupo: "MASSAS, TORTAS E PREPARAÇÕES ASSADAS",
    itens: [
      { n:28, cat:"Massas",  prep:"Lasanha",                      g:250, medida:"1 fatia" },
      { n:29, cat:"Massas",  prep:"Espaguete / Macarrão com molho",g:250, medida:"2 xícaras de chá" },
      { n:30, cat:"Massas",  prep:"Nhoque com molho",             g:250, medida:"3 xícaras de chá" },
      { n:31, cat:"Massas",  prep:"Canelone / Rondele com molho", g:250, medida:"2 a 3 unidades" },
      { n:32, cat:"Massas",  prep:"Panqueca recheada",            g:250, medida:"2 unidades" },
      { n:33, cat:"Massas",  prep:"Crepe recheado",               g:250, medida:"2 unidades" },
      { n:34, cat:"Tortas",  prep:"Torta salgada",                g:200, medida:"1 fatia" },
      { n:35, cat:"Tortas",  prep:"Quiche",                       g:200, medida:"1 fatia" },
      { n:36, cat:"Tortas",  prep:"Empadão / Pastelão",           g:200, medida:"1 fatia" },
      { n:37, cat:"Tortas",  prep:"Escondidinho",                 g:250, medida:"4 colheres de mesa" },
      { n:38, cat:"Arroz",   prep:"Risoto",                       g:400, medida:"4 colheres de mesa cheias" },
      { n:39, cat:"Arroz",   prep:"Arroz de forno",               g:200, medida:"2 colheres de mesa" },
      { n:40, cat:"Arroz",   prep:"Arroz com frango / carreteiro", g:400, medida:"4 colheres de mesa" },
    ]
  },
  {
    grupo: "GUARNIÇÕES E ACOMPANHAMENTOS",
    itens: [
      { n:41, cat:"Legumes",     prep:"Legumes cozidos / refogados",  g:120, medida:"3 colheres de sopa" },
      { n:42, cat:"Legumes",     prep:"Purê de batata",               g:120, medida:"3 colheres de sopa" },
      { n:43, cat:"Legumes",     prep:"Batata frita / assada",        g:120, medida:"2 xícaras de chá" },
      { n:44, cat:"Legumes",     prep:"Maionese de batata",           g:150, medida:"3 colheres de mesa" },
      { n:45, cat:"Legumes",     prep:"Mandioca / Aipim cozido",      g:150, medida:"3 colheres de mesa" },
      { n:46, cat:"Saladas",     prep:"Salada crua simples",          g:120, medida:"1 prato" },
      { n:47, cat:"Saladas",     prep:"Salada composta / turbinada",  g:150, medida:"1 prato" },
      { n:48, cat:"Saladas",     prep:"Salada Caesar",                g:150, medida:"1 prato" },
      { n:49, cat:"Farináceos",  prep:"Farofa",                       g:50,  medida:"2 colheres de sopa" },
      { n:50, cat:"Farináceos",  prep:"Pirão / Angu / Polenta",       g:150, medida:"3 colheres de mesa" },
      { n:51, cat:"Farináceos",  prep:"Cuscuz",                       g:100, medida:"3 colheres de mesa" },
    ]
  },
  {
    grupo: "SALGADOS, LANCHES E PETISCOS",
    itens: [
      { n:52, cat:"Salgados assados", prep:"Coxinha — festa",          g:35,  medida:"1 unidade" },
      { n:53, cat:"Salgados assados", prep:"Coxinha — lanche",         g:80,  medida:"1 unidade" },
      { n:54, cat:"Salgados assados", prep:"Kibe assado — festa",      g:35,  medida:"1 unidade" },
      { n:55, cat:"Salgados assados", prep:"Pão de queijo — festa",    g:25,  medida:"1 unidade mini" },
      { n:56, cat:"Salgados assados", prep:"Pão de queijo — padrão",   g:50,  medida:"1 unidade" },
      { n:57, cat:"Salgados fritos",  prep:"Coxinha frita — festa",    g:35,  medida:"1 unidade" },
      { n:58, cat:"Salgados fritos",  prep:"Risole / Bolinho",         g:35,  medida:"1 unidade" },
      { n:59, cat:"Salgados fritos",  prep:"Pastel — festa",           g:35,  medida:"1 unidade mini" },
      { n:60, cat:"Salgados fritos",  prep:"Pastel — feira",           g:150, medida:"1 unidade grande" },
      { n:61, cat:"Lanches",          prep:"Sanduíche / Lanche",       g:150, medida:"1 unidade" },
      { n:62, cat:"Lanches",          prep:"Hambúrguer artesanal",     g:300, medida:"1 unidade" },
      { n:63, cat:"Lanches",          prep:"Hot dog / Cachorro-quente",g:300, medida:"1 unidade" },
      { n:64, cat:"Petiscos",         prep:"Canapé quente",            g:25,  medida:"1 unidade" },
      { n:65, cat:"Petiscos",         prep:"Canapé frio",              g:25,  medida:"1 unidade" },
      { n:66, cat:"Petiscos",         prep:"Amendoim / Petisco seco",  g:30,  medida:"1 porção pequena" },
    ]
  },
  {
    grupo: "SOPAS E CALDOS",
    itens: [
      { n:67, cat:"Sopas", prep:"Sopa de legumes",              g:350, medida:"2 conchas médias" },
      { n:68, cat:"Sopas", prep:"Caldo de feijão / caldo verde",g:150, medida:"1 concha média" },
      { n:69, cat:"Sopas", prep:"Creme de abóbora / cenoura",   g:350, medida:"2 conchas médias" },
      { n:70, cat:"Sopas", prep:"Canja de galinha",             g:350, medida:"2 conchas médias" },
      { n:71, cat:"Sopas", prep:"Sopa de capeletti / macarrão", g:350, medida:"2 conchas médias" },
    ]
  },
  {
    grupo: "SOBREMESAS E DOCES",
    itens: [
      { n:72, cat:"Bolos",      prep:"Bolo simples / caseiro",     g:80,  medida:"1 fatia" },
      { n:73, cat:"Bolos",      prep:"Bolo decorado / comemorativo",g:120, medida:"1 fatia" },
      { n:74, cat:"Bolos",      prep:"Bolo de rolo / bolo gelado", g:80,  medida:"1 fatia" },
      { n:75, cat:"Bolos",      prep:"Brownie",                    g:60,  medida:"1 unidade" },
      { n:76, cat:"Docinhos",   prep:"Brigadeiro",                 g:15,  medida:"1 unidade" },
      { n:77, cat:"Docinhos",   prep:"Beijinho / Cajuzinho",       g:15,  medida:"1 unidade" },
      { n:78, cat:"Docinhos",   prep:"Bombom / Trufa",             g:20,  medida:"1 unidade" },
      { n:79, cat:"Docinhos",   prep:"Olho de sogra / Bicho de pé",g:15,  medida:"1 unidade" },
      { n:80, cat:"Sobremesas", prep:"Pudim de leite",             g:120, medida:"1 fatia" },
      { n:81, cat:"Sobremesas", prep:"Mousse",                     g:120, medida:"1 taça" },
      { n:82, cat:"Sobremesas", prep:"Cheesecake",                 g:100, medida:"1 fatia" },
      { n:83, cat:"Sobremesas", prep:"Pavê / Torta gelada",        g:120, medida:"1 fatia" },
      { n:84, cat:"Sobremesas", prep:"Sorvete",                    g:80,  medida:"1 bola" },
      { n:85, cat:"Sobremesas", prep:"Açaí",                       g:200, medida:"1 tigela" },
      { n:86, cat:"Sobremesas", prep:"Salada de frutas",           g:120, medida:"1 taça" },
      { n:87, cat:"Sobremesas", prep:"Petit gâteau",               g:80,  medida:"1 unidade" },
      { n:88, cat:"Sobremesas", prep:"Romeu e Julieta",            g:80,  medida:"1 fatia" },
      { n:89, cat:"Sobremesas", prep:"Doce de leite",              g:30,  medida:"1 colher" },
    ]
  },
  {
    grupo: "CAFÉ DA MANHÃ E LANCHES",
    itens: [
      { n:90,  cat:"Pães",    prep:"Pão francês / de sal",          g:50,  medida:"1 unidade" },
      { n:91,  cat:"Pães",    prep:"Pão de forma",                  g:25,  medida:"1 fatia" },
      { n:92,  cat:"Pães",    prep:"Croissant",                     g:60,  medida:"1 unidade" },
      { n:93,  cat:"Pães",    prep:"Tapioca",                       g:80,  medida:"1 unidade" },
      { n:94,  cat:"Cereais", prep:"Granola / Aveia com iogurte",   g:150, medida:"1 tigela" },
      { n:95,  cat:"Frutas",  prep:"Fruta inteira — banana, maçã",  g:100, medida:"1 unidade média" },
      { n:96,  cat:"Bebidas", prep:"Café",                          g:50,  medida:"1 xícara (50ml)" },
      { n:97,  cat:"Bebidas", prep:"Leite",                         g:200, medida:"1 copo (200ml)" },
      { n:98,  cat:"Bebidas", prep:"Suco natural",                  g:200, medida:"1 copo (200ml)" },
      { n:99,  cat:"Bebidas", prep:"Refrigerante",                  g:250, medida:"1 copo ou lata (200ml)" },
      { n:100, cat:"Bebidas", prep:"Água",                          g:300, medida:"1 copo (200ml)" },
    ]
  },
  {
    grupo: "INGREDIENTES CRUS — REFERÊNCIA PARA PLANEJAMENTO DA PRODUÇÃO",
    itens: [
      { n:101, cat:"Cereais",      prep:"Arroz branco cru",                    g:80,  medida:"2/3 de xícara de chá" },
      { n:102, cat:"Cereais",      prep:"Arroz para risoto cru",               g:80,  medida:"2/3 de xícara de chá" },
      { n:103, cat:"Leguminosas",  prep:"Feijão seco cru",                     g:60,  medida:"1/4 de xícara" },
      { n:104, cat:"Cereais",      prep:"Macarrão seco cru",                   g:100, medida:"1/5 do pacote (500g)" },
      { n:105, cat:"Carnes",       prep:"Carne bovina sem osso crua",          g:150, medida:"1 bife" },
      { n:106, cat:"Carnes",       prep:"Carne churrasco misto com osso crua", g:500, medida:"1 porção pesada" },
      { n:107, cat:"Aves",         prep:"Frango inteiro com osso cru",         g:200, medida:"1 unidade" },
      { n:108, cat:"Peixes",       prep:"Peixe filé cru",                      g:120, medida:"1 filé médio" },
      { n:109, cat:"Legumes",      prep:"Batata para purê / maionese crua",    g:150, medida:"3 colheres de mesa" },
      { n:110, cat:"Farináceos",   prep:"Polenta / fubá cru",                  g:50,  medida:"1/4 de xícara" },
    ]
  },
];

export const todosItens = grupos.flatMap(g => g.itens.map(i => ({ ...i, grupo: g.grupo })));

/** Sugere per capita (g) com base no nome da receita e/ou categoria */
export function sugerirPerCapita(nome, categoria = "") {
  const busca = (nome || "").toLowerCase();
  const cat = (categoria || "").toLowerCase();

  // Busca exata
  const exata = todosItens.find(i => i.prep.toLowerCase() === busca);
  if (exata) return exata.g;

  // Busca por palavra-chave
  const palavras = busca.replace(/[,\/\(\)]/g, " ").split(/\s+/).filter(p => p.length >= 3);
  for (const p of palavras) {
    const match = todosItens.find(i => i.prep.toLowerCase().includes(p) || i.cat.toLowerCase().includes(p));
    if (match) return match.g;
  }

  // Fallback por categoria
  if (cat.includes("arroz") || cat.includes("risoto")) return 150;
  if (cat.includes("carne") || cat.includes("bovina") || cat.includes("frango") || cat.includes("peixe")) return 150;
  if (cat.includes("salada") || cat.includes("legume")) return 120;
  if (cat.includes("sobremesa") || cat.includes("doce")) return 100;
  if (cat.includes("sopa") || cat.includes("creme")) return 300;
  if (cat.includes("massa") || cat.includes("lasanha")) return 250;
  if (cat.includes("torta")) return 200;
  if (cat.includes("pão")) return 50;
  if (cat.includes("salgado") || cat.includes("petisco")) return 35;
  if (cat.includes("bebida") || cat.includes("suco")) return 200;

  return 200; // default genérico
}