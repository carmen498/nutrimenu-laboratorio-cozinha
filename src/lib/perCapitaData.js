// Tabela de Per Capita — dados compartilhados entre PerCapita e CardapioAberto
// Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026

const percapitaDataRaw = [
  // ── GRUPO 1 ──────────────────────────────────────────
  { tipo: "grupo", nome: "BASE" },
  { n:1,   cat:"Arroz branco cozido",  prep:"Arroz branco cozido",           g:120, medida:"4 colheres de sopa cheia" },
  { n:2,   cat:"Arroz branco cozido",  prep:"Arroz para refeição servida",    g:150, medida:"4 colheres de mesa" },
  { n:3,   cat:"Feijão cozido",        prep:"Feijão cozido com caldo",        g:120, medida:"1 concha pequena" },
  { n:4,   cat:"Feijão cozido",        prep:"Feijão para refeição servida",   g:150, medida:"1 concha média" },
  { n:5,   cat:"Feijão cozido",        prep:"Feijoada",                       g:400, medida:"3 conchas grandes" },
  { n:6,   cat:"Carne bovina",         prep:"Carne bovina",                   g:150, medida:"1 unidade com molho" },
  { n:7,   cat:"Aves",                 prep:"Frango",                         g:150, medida:"1 peça ou filé" },
  { n:8,   cat:"Macarrão",             prep:"Macarrão com molho",             g:250, medida:"2 xícaras de chá" },
  { n:9,   cat:"Pão",                  prep:"Pão francês",                    g:50,  medida:"1 unidade" },
  { n:10,  cat:"Sopas e caldos",       prep:"Sopa / Caldo",                   g:350, medida:"2 conchas grandes" },

  // ── GRUPO 2 ──────────────────────────────────────────
  { tipo: "grupo", nome: "PRATOS PRINCIPAIS — PREPARAÇÕES BRASILEIRAS" },
  { n:11,  cat:"Carne bovina",  prep:"Bife / Filé",                        g:150, medida:"1 unidade média" },
  { n:12,  cat:"Carne bovina",  prep:"Carne assada / Rosbife",             g:150, medida:"2 a 3 fatias" },
  { n:13,  cat:"Carne bovina",  prep:"Carne moída refogada",               g:150, medida:"3 colheres de mesa" },
  { n:14,  cat:"Carne bovina",  prep:"Churrasco sem osso",                 g:250, medida:"—" },
  { n:15,  cat:"Carne bovina",  prep:"Churrasco com osso / misto",         g:500, medida:"—" },
  { n:16,  cat:"Carne bovina",  prep:"Almôndega",                          g:120, medida:"2 a 4 unidades" },
  { n:17,  cat:"Carne suína",   prep:"Costelinha / Pernil",                g:250, medida:"—" },
  { n:18,  cat:"Carne suína",   prep:"Lombinho / Bisteca",                 g:150, medida:"1 unidade" },
  { n:19,  cat:"Aves",          prep:"Frango assado — coxa+sobrecoxa",     g:200, medida:"1 peça com osso" },
  { n:20,  cat:"Aves",          prep:"Frango desfiado",                    g:120, medida:"1 xícara de chá" },
  { n:21,  cat:"Aves",          prep:"Frango empanado / filé",             g:120, medida:"1 unidade" },
  { n:22,  cat:"Aves",          prep:"Chester / Peru assado",             g:150, medida:"2 a 3 fatias" },
  { n:23,  cat:"Peixes",        prep:"Filé de peixe grelhado",             g:150, medida:"1 filé médio" },
  { n:24,  cat:"Peixes",        prep:"Bacalhau preparação pronta",         g:200, medida:"4 colheres de mesa" },
  { n:25,  cat:"Frutos do mar", prep:"Camarão preparação pronta",          g:200, medida:"4 colheres de mesa" },
  { n:26,  cat:"Ovos",          prep:"Omelete",                            g:100, medida:"2 ovos preparados" },
  { n:27,  cat:"Ovos",          prep:"Ovo frito / cozido",                 g:50,  medida:"1 unidade" },

  // ── GRUPO 3 ──────────────────────────────────────────
  { tipo: "grupo", nome: "MASSAS, TORTAS E PREPARAÇÕES ASSADAS" },
  { n:28,  cat:"Massas",  prep:"Lasanha",                        g:250, medida:"1 fatia" },
  { n:29,  cat:"Massas",  prep:"Espaguete / Macarrão com molho", g:250, medida:"2 xícaras de chá" },
  { n:30,  cat:"Massas",  prep:"Nhoque com molho",               g:250, medida:"3 xícaras de chá" },
  { n:31,  cat:"Massas",  prep:"Canelone / Rondele com molho",   g:250, medida:"2 a 3 unidades" },
  { n:32,  cat:"Massas",  prep:"Panqueca recheada",              g:250, medida:"2 unidades" },
  { n:33,  cat:"Massas",  prep:"Crepe recheado",                 g:250, medida:"2 unidades" },
  { n:34,  cat:"Tortas",  prep:"Torta salgada",                  g:200, medida:"1 fatia" },
  { n:35,  cat:"Tortas",  prep:"Quiche",                         g:200, medida:"1 fatia" },
  { n:36,  cat:"Tortas",  prep:"Empadão / Pastelão",             g:200, medida:"1 fatia" },
  { n:37,  cat:"Tortas",  prep:"Escondidinho",                   g:250, medida:"4 colheres de mesa" },
  { n:38,  cat:"Arroz",   prep:"Risoto",                         g:400, medida:"4 colheres de mesa cheias" },
  { n:39,  cat:"Arroz",   prep:"Arroz de forno",                 g:200, medida:"2 colheres de mesa" },
  { n:40,  cat:"Arroz",   prep:"Arroz com frango / carreteiro",  g:400, medida:"4 colheres de mesa" },

  // ── GRUPO 4 ──────────────────────────────────────────
  { tipo: "grupo", nome: "GUARNIÇÕES E ACOMPANHAMENTOS" },
  { n:41,  cat:"Legumes",    prep:"Legumes cozidos / refogados",   g:120, medida:"3 colheres de sopa" },
  { n:42,  cat:"Legumes",    prep:"Purê de batata",                g:120, medida:"3 colheres de sopa" },
  { n:43,  cat:"Legumes",    prep:"Batata frita / assada",         g:120, medida:"2 xícaras de chá" },
  { n:44,  cat:"Legumes",    prep:"Maionese de batata",            g:150, medida:"3 colheres de mesa" },
  { n:45,  cat:"Legumes",    prep:"Mandioca / Aipim cozido",       g:150, medida:"3 colheres de mesa" },
  { n:46,  cat:"Saladas",    prep:"Salada crua simples",           g:120, medida:"1 prato" },
  { n:47,  cat:"Saladas",    prep:"Salada composta / turbinada",   g:150, medida:"1 prato" },
  { n:48,  cat:"Saladas",    prep:"Salada Caesar",                 g:150, medida:"1 prato" },
  { n:49,  cat:"Farináceos", prep:"Farofa",                        g:50,  medida:"2 colheres de sopa" },
  { n:50,  cat:"Farináceos", prep:"Pirão / Angu / Polenta",        g:150, medida:"3 colheres de mesa" },
  { n:51,  cat:"Farináceos", prep:"Cuscuz",                        g:100, medida:"3 colheres de mesa" },

  // ── GRUPO 5 ──────────────────────────────────────────
  { tipo: "grupo", nome: "SALGADOS, LANCHES E PETISCOS" },
  { n:52,  cat:"Salgados assados", prep:"Coxinha — festa",          g:35,  medida:"1 unidade" },
  { n:53,  cat:"Salgados assados", prep:"Coxinha — lanche",         g:80,  medida:"1 unidade" },
  { n:54,  cat:"Salgados assados", prep:"Kibe assado — festa",      g:35,  medida:"1 unidade" },
  { n:55,  cat:"Salgados assados", prep:"Pão de queijo — festa",    g:25,  medida:"1 unidade mini" },
  { n:56,  cat:"Salgados assados", prep:"Pão de queijo — padrão",   g:50,  medida:"1 unidade" },
  { n:57,  cat:"Salgados fritos",  prep:"Coxinha frita — festa",    g:35,  medida:"1 unidade" },
  { n:58,  cat:"Salgados fritos",  prep:"Risole / Bolinho",         g:35,  medida:"1 unidade" },
  { n:59,  cat:"Salgados fritos",  prep:"Pastel — festa",           g:35,  medida:"1 unidade mini" },
  { n:60,  cat:"Salgados fritos",  prep:"Pastel — feira",           g:150, medida:"1 unidade grande" },
  { n:61,  cat:"Lanches",          prep:"Sanduíche / Lanche",       g:150, medida:"1 unidade" },
  { n:62,  cat:"Lanches",          prep:"Hambúrguer artesanal",     g:300, medida:"1 unidade" },
  { n:63,  cat:"Lanches",          prep:"Hot dog / Cachorro-quente",g:300, medida:"1 unidade" },
  { n:64,  cat:"Petiscos",         prep:"Canapé quente",            g:25,  medida:"1 unidade" },
  { n:65,  cat:"Petiscos",         prep:"Canapé frio",              g:25,  medida:"1 unidade" },
  { n:66,  cat:"Petiscos",         prep:"Amendoim / Petisco seco",  g:30,  medida:"1 porção pequena" },

  // ── GRUPO 6 ──────────────────────────────────────────
  { tipo: "grupo", nome: "SOPAS E CALDOS" },
  { n:67,  cat:"Sopas", prep:"Sopa de legumes",               g:350, medida:"2 conchas médias" },
  { n:68,  cat:"Sopas", prep:"Caldo de feijão / caldo verde", g:150, medida:"1 concha média" },
  { n:69,  cat:"Sopas", prep:"Creme de abóbora / cenoura",    g:350, medida:"2 conchas médias" },
  { n:70,  cat:"Sopas", prep:"Canja de galinha",              g:350, medida:"2 conchas médias" },
  { n:71,  cat:"Sopas", prep:"Sopa de capeletti / macarrão",  g:350, medida:"2 conchas médias" },

  // ── GRUPO 7 ──────────────────────────────────────────
  { tipo: "grupo", nome: "SOBREMESAS E DOCES — Medida caseira: referência Anexo V IN 75/2020" },
  { n:72,  cat:"Bolos",      prep:"Bolo simples / caseiro",      g:80,  medida:"1 fatia · Grupo I · Bolos: 60-80g" },
  { n:73,  cat:"Bolos",      prep:"Bolo decorado / comemorativo",g:120, medida:"1 fatia · Grupo I · Bolos: 80-120g" },
  { n:74,  cat:"Bolos",      prep:"Bolo de rolo / bolo gelado",  g:80,  medida:"1 fatia · Grupo I · Bolos: 60-80g" },
  { n:75,  cat:"Bolos",      prep:"Brownie",                     g:60,  medida:"1 unidade · Grupo I · Biscoitos: 30-60g" },
  { n:76,  cat:"Docinhos",   prep:"Brigadeiro",                  g:15,  medida:"1 unidade · Grupo II · Doces: 15g" },
  { n:77,  cat:"Docinhos",   prep:"Beijinho / Cajuzinho",        g:15,  medida:"1 unidade · Grupo II · Doces: 15g" },
  { n:78,  cat:"Docinhos",   prep:"Bombom / Trufa",              g:20,  medida:"1 unidade · Grupo II · Chocolates: 20-25g" },
  { n:79,  cat:"Docinhos",   prep:"Olho de sogra / Bicho de pé", g:15, medida:"1 unidade · Grupo II · Doces: 15g" },
  { n:80,  cat:"Sobremesas", prep:"Pudim de leite",              g:120, medida:"1 fatia · Grupo IV · Sobremesas lácteas: 100-130g" },
  { n:81,  cat:"Sobremesas", prep:"Mousse",                      g:120, medida:"1 taça individual · Grupo IV: 100-120g" },
  { n:82,  cat:"Sobremesas", prep:"Cheesecake",                  g:100, medida:"1 fatia · Grupo I+IV: 100g" },
  { n:83,  cat:"Sobremesas", prep:"Pavê / Torta gelada",         g:120, medida:"1 fatia · Grupo II · Sobremesas: 100-120g" },
  { n:84,  cat:"Sobremesas", prep:"Sorvete",                     g:80,  medida:"1 bola · Grupo IV · Sorvetes: 60-80g" },
  { n:85,  cat:"Sobremesas", prep:"Açaí",                        g:200, medida:"1 tigela individual · sem previsão no Anexo V" },
  { n:86,  cat:"Sobremesas", prep:"Salada de frutas",            g:120, medida:"1 taça · Grupo III · Frutas: 120g" },
  { n:87,  cat:"Sobremesas", prep:"Petit gâteau",                g:80,  medida:"1 unidade · sem previsão no Anexo V" },
  { n:88,  cat:"Sobremesas", prep:"Romeu e Julieta",             g:80,  medida:"1 fatia queijo + goiabada · Grupo IV+II" },
  { n:89,  cat:"Sobremesas", prep:"Doce de leite",               g:30,  medida:"1 colher de sopa · Grupo II · Doces: 30g" },

  // ── GRUPO 8 ──────────────────────────────────────────
  { tipo: "grupo", nome: "CAFÉ DA MANHÃ E LANCHES — Medida caseira: referência Anexo V IN 75/2020" },
  { n:90,  cat:"Pães",    prep:"Pão francês / de sal",         g:50,  medida:"1 unidade · Grupo I · Pães: 50g" },
  { n:91,  cat:"Pães",    prep:"Pão de forma",                 g:25,  medida:"1 fatia · Grupo I · Pães: 25g" },
  { n:92,  cat:"Pães",    prep:"Croissant",                    g:60,  medida:"1 unidade · Grupo I · Pães especiais: 57-60g" },
  { n:93,  cat:"Pães",    prep:"Tapioca",                      g:80,  medida:"1 unidade · sem previsão no Anexo V" },
  { n:94,  cat:"Cereais", prep:"Granola / Aveia com iogurte",  g:150, medida:"1 tigela · Grupo I · Cereais: 30-40g seco" },
  { n:95,  cat:"Frutas",  prep:"Fruta inteira — banana, maçã", g:100, medida:"1 unidade média · Grupo III: 100-120g" },
  { n:96,  cat:"Bebidas", prep:"Café",                         g:50,  medida:"1 xícara (50ml) · Grupo VI" },
  { n:97,  cat:"Bebidas", prep:"Leite",                        g:200, medida:"1 copo (200ml) · Grupo IV" },
  { n:98,  cat:"Bebidas", prep:"Suco natural",                 g:200, medida:"1 copo (200ml) · Grupo VI" },
  { n:99,  cat:"Bebidas", prep:"Refrigerante",                 g:250, medida:"1 copo ou lata (200ml) · Grupo VI" },
  { n:100, cat:"Bebidas", prep:"Água",                         g:300, medida:"1 copo (200ml) · referência geral" },

  // ── GRUPO 9 ──────────────────────────────────────────
  { tipo: "grupo", nome: "INGREDIENTES CRUS — REFERÊNCIA PARA PLANEJAMENTO DA PRODUÇÃO" },
  { n:101, cat:"Cereais",     prep:"Arroz branco cru",                   g:80,  medida:"2/3 de xícara de chá" },
  { n:102, cat:"Cereais",     prep:"Arroz para risoto cru",              g:80,  medida:"2/3 de xícara de chá" },
  { n:103, cat:"Leguminosas", prep:"Feijão seco cru",                    g:60,  medida:"1/4 de xícara" },
  { n:104, cat:"Cereais",     prep:"Macarrão seco cru",                  g:100, medida:"1/5 do pacote (500g)" },
  { n:105, cat:"Carnes",      prep:"Carne bovina sem osso crua",         g:150, medida:"1 bife" },
  { n:106, cat:"Carnes",      prep:"Carne churrasco misto com osso crua",g:500, medida:"1 porção pesada" },
  { n:107, cat:"Aves",        prep:"Frango inteiro com osso cru",        g:200, medida:"1 unidade" },
  { n:108, cat:"Peixes",      prep:"Peixe filé cru",                     g:120, medida:"1 filé médio" },
  { n:109, cat:"Legumes",     prep:"Batata para purê / maionese crua",   g:150, medida:"3 colheres de mesa" },
  { n:110, cat:"Farináceos",  prep:"Polenta / fubá cru",                 g:50,  medida:"1/4 de xícara" },

  // ── GRUPO 10 ──────────────────────────────────────────
  { tipo: "grupo", nome: "EVENTOS & CARDÁPIOS — REFERÊNCIA PARA PLANEJAMENTO DA PRODUÇÃO" },
  { n:111, cat:"Entradas",       prep:"Entrada fria — Empratado",                  g:120,      medida:"1 prato de entrada ou concha pequena" },
  { n:"",  cat:"Entradas",       prep:"Entrada fria — Bufê",                       g:20,       medida:"2 colheres de sopa" },
  { n:"",  cat:"Entradas",       prep:"Entrada quente",                            g:120,      medida:"1 concha pequena ou prato de entrada" },
  { n:"",  cat:"Entradas",       prep:"Salada crua simples — Empratado",           g:80,       medida:"1 prato raso pequeno" },
  { n:"",  cat:"Entradas",       prep:"Salada crua simples — Bufê",                g:120,      medida:"1 prato raso médio" },
  { n:"",  cat:"Entradas",       prep:"Salada composta — Empratado",               g:120,      medida:"1 prato raso médio" },
  { n:"",  cat:"Entradas",       prep:"Salada composta — Bufê",                    g:180,      medida:"1 prato raso cheio" },
  { n:"",  cat:"Prato principal", prep:"Carne — 1 tipo — Empratado",               g:200,      medida:"1 peça ou filé" },
  { n:"",  cat:"Prato principal", prep:"Carne — 1 tipo — Bufê",                    g:300,      medida:"1 a 2 peças" },
  { n:"",  cat:"Prato principal", prep:"Carne — 2 tipos (cada) — Bufê",            g:150,      medida:"1 peça média por tipo" },
  { n:"",  cat:"Prato principal", prep:"Carne — 3 tipos (cada)",                   g:100,      medida:"1 peça pequena por tipo" },
  { n:"",  cat:"Guarnição",      prep:"Guarnição — 1 tipo — Empratado",            g:150,      medida:"3 colheres de mesa" },
  { n:"",  cat:"Guarnição",      prep:"Guarnição — 2 tipos (cada)",                g:100,      medida:"2 colheres de mesa por tipo" },
  { n:"",  cat:"Guarnição",      prep:"Guarnição — 3 tipos (cada)",                g:100,      medida:"2 colheres de mesa por tipo" },
  { n:"",  cat:"Guarnição",      prep:"Arroz — Empratado",                         g:150,      medida:"4 colheres de sopa" },
  { n:"",  cat:"Guarnição",      prep:"Arroz — Bufê",                              g:200,      medida:"5 colheres de sopa" },
  { n:"",  cat:"Guarnição",      prep:"Batata palha",                              g:30,       medida:"2 colheres de sopa rasas" },
  { n:"",  cat:"Guarnição",      prep:"Molho para salada (por tipo)",              g:50,       medida:"3 colheres de sopa" },
  { n:"",  cat:"Sopas",          prep:"Sopa prato único — Empratado",              g:350,      medida:"2 conchas médias cheias" },
  { n:"",  cat:"Sopas",          prep:"Sopa — Bufê",                               g:120,      medida:"1 concha pequena" },
  { n:"",  cat:"Sobremesas",     prep:"Sobremesa — Empratada",                     g:120,      medida:"1 taça ou prato de sobremesa" },
  { n:"",  cat:"Sobremesas",     prep:"Sobremesa livre — Bufê",                    g:200,      medida:"1 prato de sobremesa cheio" },
  { n:"",  cat:"Sobremesas",     prep:"Sorvete — Empratado",                       g:120,      medida:"1 a 2 bolas (60-80g cada)" },
  { n:"",  cat:"Sobremesas",     prep:"Torta especial",                            g:120,      medida:"1 fatia média" },
  { n:"",  cat:"Sobremesas",     prep:"Bolo da noiva / Comemorativo",              g:120,      medida:"1 fatia padrão" },
  { n:"",  cat:"Sobremesas",     prep:"Docinhos — Bufê",                           g:15,       medida:"5 a 8 unidades por pessoa" },
  { n:"",  cat:"Coquetel",       prep:"Coquetel completo — garçom serve",          g:"10-15 unid.", medida:"3 a 5 passagens do garçom" },
  { n:"",  cat:"Coquetel",       prep:"Coquetel completo — Bufê",                  g:"15-20 unid.", medida:"Acesso livre à mesa de petiscos" },
  { n:"",  cat:"Coquetel",       prep:"Canapé quente",                             g:"3-5 unid.",   medida:"1 bandeja de 3 a 5 unidades" },
  { n:"",  cat:"Coquetel",       prep:"Canapé frio",                               g:"10-12 unid.", medida:"Acesso livre — 10 a 12 unidades" },
  { n:"",  cat:"Coquetel",       prep:"Pequenas porções por preparação",           g:80,       medida:"2 colheres de sopa por preparação" },
  { n:"",  cat:"Coquetel",       prep:"Petiscos / aperitivos antes de jantar",     g:"3-5 unid.", medida:"3 a 5 unidades antes do jantar" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Água",                                      g:300,      medida:"1 e 1/2 copo americano (200ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Refrigerante",                              g:300,      medida:"1 e 1/2 copo americano (200ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Suco natural",                              g:200,      medida:"1 copo americano (200ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Café",                                      g:50,       medida:"1 xícara de café (50ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Vinho tinto",                               g:350,      medida:"1 taça e meia (taça padrão 250ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Vinho branco",                              g:350,      medida:"1 taça e meia (taça padrão 250ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Espumante",                                 g:350,      medida:"1 taça e meia (flûte 150ml)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Cerveja",                                   g:1200,     medida:"2 garrafas long neck (600ml cada)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Drinks / coquetéis",                        g:400,      medida:"2 doses (200ml cada)" },
  { n:"",  cat:"Bebidas (ml)",   prep:"Whisky",                                    g:150,      medida:"2 doses (75ml cada)" },
];

export const notaTecnica = `NOTA TÉCNICA

Os per capitas apresentados nesta tabela representam médias de referência fundamentadas em mais de 40 anos de experiência prática na gastronomia e gestão de cardápios, desenvolvida por Carmen S. Reinstein — nutricionista e especialista em planejamento de produção e eventos gastronômicos.

IMPORTANTE: os valores são médias de partida para o planejamento — não são valores fixos. Todo planejador de cardápios deve considerar e ajustar os per capitas de acordo com os seguintes fatores:

1. PERFIL DOS COMENSAIS: faixa etária (crianças consomem menos; adultos jovens ativos consomem mais), sexo, condição de saúde, restrições alimentares e preferências culturais.

2. TIPO E DURAÇÃO DO EVENTO: eventos mais longos exigem maior quantidade. Happy hour de 2h difere de um jantar de 5h. Buffet livre tem consumo até 30% maior que serviço empratado.

3. CLIMA E ESTAÇÃO: em dias quentes aumenta o consumo de bebidas e saladas; em dias frios aumenta o consumo de sopas, caldos e pratos quentes.

4. HORÁRIO DO EVENTO: almoços têm consumo diferente de jantares; café da manhã difere do brunch.

5. TIPO DE SERVIÇO: empratado (porção controlada) vs bufê livre (consumo espontâneo, geralmente 20-30% maior) vs garçom circulando (consumo intermediário).

6. MARGEM DE SEGURANÇA: recomenda-se acrescentar de 10% a 15% sobre o total calculado para evitar falta de alimentos — especialmente em eventos com número de convidados incerto ou bufê livre.

7. BEBIDAS: o cálculo de bebidas é o mais variável de todos — depende do perfil do convidado, tipo de bebida oferecida, clima, duração e horário do evento. As quantidades desta tabela são médias gerais — ajuste sempre conforme o contexto específico do evento.

8. RECEITAS COMPOSTAS: quando um cardápio tem muitos pratos e variedade, o per capita individual de cada preparação tende a cair — o convidado experimenta mais itens em menor quantidade cada.

Esta tabela é um ESTUDO PIONEIRO — não existe no Brasil norma técnica oficial de per capita para preparações prontas para servir. O Anexo V da IN 75/2020 (ANVISA) trata exclusivamente de porções para rotulagem nutricional, não de planejamento de serviço. Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026.`;

export const referencias = [
  { n:"1", titulo:"POF IBGE 2017-2018", texto:"Pesquisa de Orçamentos Familiares 2017-2018: Análise do Consumo Alimentar Pessoal no Brasil. IBGE, Rio de Janeiro, 2020. ibge.gov.br/pof2017-2018" },
  { n:"2", titulo:"Calculadora Nutrimenu", texto:"Calculadora de Custos de Produção — Carmen S. Reinstein · Nutrimenu · 2025." },
  { n:"3", titulo:"IN 75/2020 ANVISA", texto:"Instrução Normativa nº 75, de 8 de outubro de 2020. Anexo V — Porções para rotulagem nutricional. NOTA: não equivale a per capita de serviço." },
  { n:"4", titulo:"Referências de UAN", texto:"Abreu ES, Spinelli MGN, Pinto AMS. Gestão de Unidades de Alimentação e Nutrição. 5ª ed. São Paulo: Metha, 2016." },
  { n:"5", titulo:"CFN Resolução 600/2018", texto:"Conselho Federal de Nutricionistas. Resolução CFN nº 600/2018. Define a Ficha Técnica de Preparo (FTP)." },
  { n:"6", titulo:"Experiência profissional", texto:"Carmen S. Reinstein — Nutricionista, empresária e especialista em planejamento de cardápios e eventos gastronômicos. Mais de 40 anos de atuação." },
  { n:"—", titulo:"NOTA IMPORTANTE", texto:"Esta tabela é um ESTUDO PIONEIRO. Os valores são referências médias a validar conforme tipo de evento, perfil dos comensais, região e contexto cultural. Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026." },
];

export const percapitaData = percapitaDataRaw;

// ── Flatten for CardapioAberto compatibility ──
let currentGroup = "";
export const todosItens = [];
export const grupos = [];
for (const item of percapitaDataRaw) {
  if (item.tipo === "grupo") {
    currentGroup = item.nome;
    grupos.push(item.nome);
  } else {
    todosItens.push({ ...item, grupo: currentGroup });
  }
}

/** Sugere per capita (g) com base no nome da receita e/ou categoria */
export function sugerirPerCapita(nome, categoria = "") {
  const busca = (nome || "").toLowerCase();
  const cat = (categoria || "").toLowerCase();

  // Busca exata por preparação
  const exata = todosItens.find(i =>
    typeof i.g === "number" && i.prep.toLowerCase() === busca
  );
  if (exata) return exata.g;

  // Busca por palavra-chave (apenas itens numéricos)
  const palavras = busca.replace(/[,\/\(\)]/g, " ").split(/\s+/).filter(p => p.length >= 3);
  for (const p of palavras) {
    const match = todosItens.find(i =>
      typeof i.g === "number" &&
      (i.prep.toLowerCase().includes(p) || i.cat.toLowerCase().includes(p))
    );
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