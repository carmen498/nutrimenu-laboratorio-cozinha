// Tabela de Per Capita — dados compartilhados entre PerCapita e CardapioAberto
// Carmen S. Reinstein · Laboratório de Cozinha · Gastronomia Planejada · 2026

const percapitaDataRaw = [
  { tipo: "grupo", nome: "RECEITAS DO DIA-A-DIA" },
  { prep: "Arroz branco", g: 120, medida: "3 colheres de sopa cheia" },
  { prep: "Feijão com caldo", g: 120, medida: "1 concha média" },
  { prep: "Acompanhamento", g: 120, medida: "3 colheres de sopa cheia" },
  { prep: "Carne qualquer preparação", g: 200, medida: "1 unidade com molho" },
  { prep: "Feijoada completa", g: 400, medida: "3 conchas grandes" },
  { prep: "Lasanha", g: 400, medida: "1 pedaço grande" },
  { prep: "Macarrão com molho", g: 400, medida: "2 conchas grande cheia" },
  { prep: "Panqueca", g: 250, medida: "2 unidades com molho" },
  { prep: "Pastelão, Quiche", g: 200, medida: "1 fatia média" },
  { prep: "Sopa prato único", g: 400, medida: "2 conchas grande" },
  { prep: "Sopa como entrada", g: 150, medida: "1 concha pequena" },
  { prep: "Salada verde e vegetais", g: 120, medida: "1 prato cheio" },
  { prep: "Salada mix de verdes", g: 80, medida: "1 prato de sobremesa" },

  { tipo: "grupo", nome: "PRATOS PRINCIPAIS" },
  { prep: "Bife / Filé", g: 150, medida: "1 unidade média grelhada/frita" },
  { prep: "Carne assada / Rosbife", g: 150, medida: "2 a 3 fatias médias" },
  { prep: "Carne moída refogada", g: 150, medida: "3 colheres de mesa" },
  { prep: "Churrasco sem osso", g: 250, medida: "—" },
  { prep: "Churrasco com osso / misto", g: 500, medida: "—" },
  { prep: "Almôndega", g: 120, medida: "2 unidades por porção 60g" },
  { prep: "Costelinha / Pernil", g: 250, medida: "—" },
  { prep: "Lombinho / Bisteca", g: 150, medida: "1 unidade média" },
  { prep: "Frango assado — coxa+sobrecoxa", g: 200, medida: "1 peça média com osso" },
  { prep: "Frango desfiado", g: 120, medida: "1 xícara média" },
  { prep: "Frango empanado / filé", g: 120, medida: "1 unidade média frita/assada" },
  { prep: "Chester / Peru assado", g: 150, medida: "2 a 3 fatias médias" },
  { prep: "Filé de peixe grelhado", g: 150, medida: "1 filé médio" },
  { prep: "Bacalhau preparação pronta", g: 200, medida: "4 colheres de mesa" },
  { prep: "Camarão preparação pronta", g: 200, medida: "4 colheres de mesa" },
  { prep: "Omelete", g: 100, medida: "2 ovos = aprox. 120g preparado" },
  { prep: "Ovo frito / cozido", g: 50, medida: "2 unidades" },

  { tipo: "grupo", nome: "MASSAS E TORTAS" },
  { prep: "Lasanha", g: 250, medida: "1 fatia média" },
  { prep: "Espaguete / Macarrão com molho", g: 250, medida: "2 xícaras médias" },
  { prep: "Nhoque com molho", g: 250, medida: "3 xícaras médias" },
  { prep: "Canelone / Rondele com molho", g: 250, medida: "2 a 3 unidades" },
  { prep: "Panqueca recheada", g: 250, medida: "2 unidades médias" },
  { prep: "Crepe recheado", g: 250, medida: "2 unidades médias" },
  { prep: "Torta salgada", g: 200, medida: "1 fatia média" },
  { prep: "Quiche", g: 200, medida: "1 fatia média" },
  { prep: "Empadão / Pastelão", g: 200, medida: "1 fatia média" },
  { prep: "Escondidinho", g: 250, medida: "4 colheres de mesa" },
  { prep: "Risoto", g: 400, medida: "4 colheres de mesa cheia" },
  { prep: "Arroz de forno", g: 200, medida: "2 colheres de mesa" },
  { prep: "Arroz com frango / carreteiro", g: 400, medida: "4 colheres de mesa" },

  { tipo: "grupo", nome: "ACOMPANHAMENTOS" },
  { prep: "Legumes cozidos / refogados", g: 120, medida: "3 colheres de sopa cheia" },
  { prep: "Purê de batata", g: 120, medida: "3 colheres de sopa cheia" },
  { prep: "Batata frita / assada", g: 120, medida: "2 xícaras médias" },
  { prep: "Maionese de batata", g: 150, medida: "3 colheres de mesa cheia" },
  { prep: "Mandioca / Aipim cozido", g: 150, medida: "3 colheres de mesa cheia" },
  { prep: "Salada crua simples", g: 120, medida: "1 prato cheio" },
  { prep: "Salada composta / turbinada", g: 150, medida: "1 prato cheio" },
  { prep: "Salada Caesar", g: 150, medida: "1 prato cheio" },
  { prep: "Farofa", g: 50, medida: "2 colheres de sopa cheia" },
  { prep: "Pirão / Angu / Polenta", g: 150, medida: "3 colheres de mesa cheia" },
  { prep: "Cuscuz", g: 100, medida: "3 colheres de mesa cheia" },

  { tipo: "grupo", nome: "DOCES E SOBREMESAS" },
  { prep: "Sobremesas cremosas", g: 120, medida: "1 pote de sobremesa" },
  { prep: "Tortas recheadas", g: 120, medida: "1 fatia média" },
  { prep: "Bufê de sobremesa", g: 200, medida: "2 potes de sobremesa" },
  { prep: "Sorvete servido", g: 150, medida: "1 pote de sobremesa" },
  { prep: "Sorvete bufê", g: 200, medida: "2 potes de sobremesa" },

  { tipo: "grupo", nome: "SOBREMESAS E DOCES — referência Anexo V IN 75/2020" },
  { prep: "Bolo simples / caseiro", g: 80, medida: "1 fatia · Grupo I · Bolos: 60-80g" },
  { prep: "Bolo decorado / comemorativo", g: 120, medida: "1 fatia · Grupo I · Bolos: 80-120g" },
  { prep: "Bolo de rolo / bolo gelado", g: 80, medida: "1 fatia · Grupo I · Bolos: 60-80g" },
  { prep: "Brownie", g: 60, medida: "1 unidade · Grupo I · Biscoitos: 30-60g" },
  { prep: "Brigadeiro", g: 15, medida: "1 unidade · Grupo II · Doces: 15g" },
  { prep: "Beijinho / Cajuzinho", g: 15, medida: "1 unidade · Grupo II · Doces: 15g" },
  { prep: "Bombom / Trufa", g: 20, medida: "1 unidade · Grupo II · Chocolates: 20-25g" },
  { prep: "Olho de sogra / Bicho de pé", g: 15, medida: "1 unidade · Grupo II · Doces: 15g" },
  { prep: "Pudim de leite", g: 120, medida: "1 fatia · Grupo IV · Sobremesas lácteas: 100-130g" },
  { prep: "Mousse", g: 120, medida: "1 taça individual · Grupo IV: 100-120g" },
  { prep: "Cheesecake", g: 100, medida: "1 fatia · Grupo I+IV: 100g" },
  { prep: "Pavê / Torta gelada", g: 120, medida: "1 fatia · Grupo II · Sobremesas: 100-120g" },
  { prep: "Sorvete", g: 80, medida: "1 bola · Grupo IV · Sorvetes: 60-80g" },
  { prep: "Açaí", g: 200, medida: "1 tigela individual · Sem previsão no Anexo V" },
  { prep: "Salada de frutas", g: 120, medida: "1 taça · Grupo III · Frutas: 120g" },
  { prep: "Petit gâteau", g: 80, medida: "1 unidade · Sem previsão no Anexo V" },
  { prep: "Romeu e Julieta", g: 80, medida: "1 fatia queijo + goiabada · Grupo IV+II" },
  { prep: "Doce de leite", g: 30, medida: "1 colher de sopa · Grupo II · Doces: 30g" },

  { tipo: "grupo", nome: "CAFÉ DA MANHÃ E LANCHES — referência Anexo V IN 75/2020" },
  { prep: "Pão francês / de sal", g: 50, medida: "1 unidade · Grupo I · Pães: 50g" },
  { prep: "Pão de forma", g: 25, medida: "1 fatia · Grupo I · Pães: 25g" },
  { prep: "Croissant", g: 60, medida: "1 unidade · Grupo I · Pães especiais: 57-60g" },
  { prep: "Tapioca", g: 80, medida: "1 unidade · Sem previsão no Anexo V" },
  { prep: "Granola / Aveia com iogurte", g: 150, medida: "1 tigela · Grupo I · Cereais: 30-40g seco" },
  { prep: "Fruta inteira — banana, maçã", g: 100, medida: "1 unidade média · Grupo III: 100-120g" },
  { prep: "Café", g: 50, medida: "1 xícara (50ml) · Grupo VI" },
  { prep: "Leite", g: 200, medida: "1 copo (200ml) · Grupo IV" },
  { prep: "Suco natural", g: 200, medida: "1 copo (200ml) · Grupo VI" },
  { prep: "Refrigerante", g: 250, medida: "1 copo ou lata (200ml) · Grupo VI" },
  { prep: "Água", g: 300, medida: "1 copo (200ml) · referência geral" },

  { tipo: "grupo", nome: "SALGADOS, LANCHES E PETISCOS" },
  { prep: "Coxinha — festa", g: 35, medida: "1 unidade pequena" },
  { prep: "Coxinha — lanche", g: 80, medida: "1 unidade pequena comercial" },
  { prep: "Kibe assado — festa", g: 35, medida: "1 unidade pequena" },
  { prep: "Pão de queijo — festa", g: 25, medida: "1 unidade pequena" },
  { prep: "Pão de queijo — padrão", g: 50, medida: "1 unidade comercial" },
  { prep: "Coxinha frita — festa", g: 35, medida: "1 unidade pequena" },
  { prep: "Risole / Bolinho", g: 35, medida: "1 unidade pequena" },
  { prep: "Pastel — festa", g: 35, medida: "1 unidade pequena" },
  { prep: "Pastel — feira", g: 150, medida: "1 unidade comercial" },
  { prep: "Sanduíche / Lanche", g: 150, medida: "1 unidade comercial" },
  { prep: "Hambúrguer artesanal", g: 300, medida: "1 unidade comercial" },
  { prep: "Hot dog / Cachorro-quente", g: 300, medida: "1 unidade comercial" },
  { prep: "Canapé quente", g: 25, medida: "1 unidade pequena" },
  { prep: "Canapé frio", g: 25, medida: "1 unidade pequena" },
  { prep: "Amendoim / Petisco seco", g: 30, medida: "1 porção pequena" },

  { tipo: "grupo", nome: "INGREDIENTES CRUS — REFERÊNCIA PARA PLANEJAMENTO DA PRODUÇÃO" },
  { prep: "Arroz branco cru", g: 80, medida: "2/3 de xícara" },
  { prep: "Arroz para risoto cru", g: 80, medida: "2/3 de xícara" },
  { prep: "Feijão seco cru", g: 60, medida: "1/4 xícara" },
  { prep: "Macarrão seco cru", g: 100, medida: "1/5 do pacote" },
  { prep: "Carne bovina sem osso crua", g: 150, medida: "1 bife" },
  { prep: "Carne churrasco misto com osso crua", g: 500, medida: "1 porção pesada" },
  { prep: "Frango inteiro com osso cru", g: 200, medida: "1 unidade" },
  { prep: "Peixe filé cru", g: 120, medida: "1 filé médio" },
  { prep: "Batata para purê / maionese crua", g: 150, medida: "3 colheres de mesa" },
  { prep: "Polenta / fubá cru", g: 50, medida: "1/4 xícara" },

  { tipo: "grupo", nome: "CARDÁPIOS E EVENTOS — REFERÊNCIA PARA PLANEJAMENTO" },
  { prep: "Entrada fria — Empratado", g: 120, medida: "1 prato de entrada ou concha pequena" },
  { prep: "Entrada fria — Bufê", g: 20, medida: "2 colheres de sopa" },
  { prep: "Entrada quente", g: 120, medida: "1 concha pequena ou prato de entrada" },
  { prep: "Salada crua simples — Empratado", g: 80, medida: "1 prato raso pequeno" },
  { prep: "Salada crua simples — Bufê", g: 120, medida: "1 prato raso médio" },
  { prep: "Salada composta — Empratado", g: 120, medida: "1 prato raso médio" },
  { prep: "Salada composta — Bufê", g: 180, medida: "1 prato raso cheio" },
  { prep: "Carne — 1 tipo — Empratado", g: 200, medida: "1 peça ou filé" },
  { prep: "Carne — 1 tipo — Bufê", g: 300, medida: "1 a 2 peças" },
  { prep: "Carne — 2 tipos (cada) — Bufê", g: 150, medida: "1 peça média por tipo" },
  { prep: "Carne — 3 tipos (cada)", g: 100, medida: "1 peça pequena por tipo" },
  { prep: "Guarnição — 1 tipo — Empratado", g: 150, medida: "3 colheres de mesa" },
  { prep: "Guarnição — 2 tipos (cada)", g: 100, medida: "2 colheres de mesa por tipo" },
  { prep: "Guarnição — 3 tipos (cada)", g: 100, medida: "2 colheres de mesa por tipo" },
  { prep: "Arroz — Empratado", g: 150, medida: "4 colheres de sopa" },
  { prep: "Arroz — Bufê", g: 200, medida: "5 colheres de sopa" },
  { prep: "Batata palha", g: 30, medida: "2 colheres de sopa rasas" },
  { prep: "Molho para salada (por tipo)", g: 50, medida: "3 colheres de sopa" },
  { prep: "Sopa prato único — Empratado", g: 350, medida: "2 conchas médias cheias" },
  { prep: "Sopa — Bufê", g: 120, medida: "1 concha pequena" },
  { prep: "Sobremesa — Empratada", g: 120, medida: "1 taça ou prato de sobremesa" },
  { prep: "Sobremesa livre — Bufê", g: 200, medida: "1 prato de sobremesa cheio" },
  { prep: "Sorvete — Empratado", g: 120, medida: "1 a 2 bolas (60-80g cada)" },
  { prep: "Torta especial", g: 120, medida: "1 fatia média" },
  { prep: "Bolo da noiva / Comemorativo", g: 120, medida: "1 fatia padrão" },
  { prep: "Docinhos — Bufê", g: 15, medida: "5 a 8 unidades por pessoa" },

  { tipo: "grupo", nome: "BEBIDAS — ml/pessoa" },
  { prep: "Água", g: 300, medida: "1 e 1/2 copo americano (200ml)" },
  { prep: "Refrigerante", g: 300, medida: "1 e 1/2 copo americano (200ml)" },
  { prep: "Suco natural", g: 200, medida: "1 copo americano (200ml)" },
  { prep: "Café", g: 50, medida: "1 xícara de café (50ml)" },
  { prep: "Vinho tinto", g: 350, medida: "1 taça e meia (taça padrão 250ml)" },
  { prep: "Vinho branco", g: 350, medida: "1 taça e meia (taça padrão 250ml)" },
  { prep: "Espumante", g: 350, medida: "1 taça e meia (flûte 150ml)" },
  { prep: "Cerveja", g: 1200, medida: "2 garrafas long neck (600ml cada)" },
  { prep: "Drinks / coquetéis", g: 400, medida: "2 doses (200ml cada)" },
  { prep: "Whisky", g: 150, medida: "2 doses (75ml cada)" },
];

export const notaTecnica = `NOTA TÉCNICA

Os per capitas são médias de referência. Ajustar conforme: perfil dos comensais · tipo e duração do evento · clima · horário · tipo de serviço (empratado vs bufê) · margem de segurança 10-15%. Não existe norma técnica brasileira de per capita para preparações prontas para servir. Carmen S. Reinstein · Laboratório de Cozinha · 2026.`;

export const referencias = [
  { n:"1", titulo:"POF IBGE 2017-2018", texto:"Pesquisa de Orçamentos Familiares 2017-2018: Análise do Consumo Alimentar Pessoal no Brasil. IBGE, Rio de Janeiro, 2020." },
  { n:"2", titulo:"Calculadora Nutrimenu", texto:"Calculadora de Custos de Produção — Carmen S. Reinstein · Nutrimenu · 2025." },
  { n:"3", titulo:"IN 75/2020 ANVISA", texto:"Instrução Normativa nº 75, de 8 de outubro de 2020. Anexo V — Porções para rotulagem nutricional. NOTA: não equivale a per capita de serviço." },
  { n:"4", titulo:"Referências de UAN", texto:"Abreu ES, Spinelli MGN, Pinto AMS. Gestão de Unidades de Alimentação e Nutrição. 5ª ed. São Paulo: Metha, 2016." },
  { n:"5", titulo:"CFN Resolução 600/2018", texto:"Conselho Federal de Nutricionistas. Resolução CFN nº 600/2018. Define a Ficha Técnica de Preparo (FTP)." },
  { n:"6", titulo:"Experiência profissional", texto:"Carmen S. Reinstein — Nutricionista, empresária e especialista em planejamento de cardápios e eventos gastronômicos. Mais de 40 anos de atuação." },
  { n:"—", titulo:"NOTA IMPORTANTE", texto:"Esta tabela é um ESTUDO PIONEIRO. Os valores são referências médias a validar conforme tipo de evento, perfil dos comensais, região e contexto cultural. Carmen S. Reinstein · Laboratório de Cozinha · 2026." },
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

// ── Mapa de vínculo categoria → per capita ──
// Referência: Tabela Nutrimenu · Carmen S. Reinstein · Laboratório de Cozinha · 2026
export const PERCAPITA_POR_CATEGORIA = {
  "Acompanhamentos, Arroz e Risotos":      { g: 150, medida: "4 colheres de sopa" },
  "Acompanhamentos, Legumes e Hortaliças": { g: 120, medida: "3 colheres de sopa cheia" },
  "Acompanhamentos, Grãos e Leguminosas":  { g: 120, medida: "1 concha média" },
  "Acompanhamentos, Complementos":         { g: 50,  medida: "2 colheres de sopa" },
  "Acompanhamentos, Molhos":               { g: 50,  medida: "3 colheres de sopa" },
  "Carnes, Aves":                          { g: 150, medida: "1 peça ou filé" },
  "Carnes, Bacalhau":                      { g: 200, medida: "4 colheres de mesa" },
  "Carnes, Bovina":                        { g: 150, medida: "1 unidade média" },
  "Carnes, Frutos do mar":                 { g: 200, medida: "4 colheres de mesa" },
  "Carnes, Peixes":                        { g: 150, medida: "1 filé médio" },
  "Carnes, Suína":                         { g: 150, medida: "1 unidade média" },
  "Massas, Macarrão":                      { g: 250, medida: "2 xícaras médias" },
  "Massas, Panquecas e Crepes":            { g: 250, medida: "2 unidades médias" },
  "Massas, Pastelão e Quiches":            { g: 200, medida: "1 fatia média" },
  "Entradas, Mousses, Terrines e Patês":   { g: 120, medida: "1 prato de entrada" },
  "Entradas, Quentes":                     { g: 120, medida: "1 concha pequena" },
  "Entradas, Saladas":                     { g: 120, medida: "1 prato cheio" },
  "Entradas, Sopas, Cremes e Caldos":      { g: 150, medida: "1 concha pequena" },
  "Entradas, Aperitivos e Petiscos":       { g: 25,  medida: "3 a 5 unidades" },
  "Lanches, Sanduíches":                   { g: 150, medida: "1 unidade comercial" },
  "Lanches, Pizza":                        { g: 200, medida: "2 fatias" },
  "Lanches, Pastel":                       { g: 35,  medida: "1 unidade" },
  "Lanches, Lanche":                       { g: 150, medida: "1 unidade" },
  "Panificação, Bolos e Cakes":            { g: 80,  medida: "1 fatia" },
  "Panificação, Pães e Panificação":       { g: 50,  medida: "1 unidade" },
  "Panificação, Salgados e Salgadinhos":   { g: 35,  medida: "1 unidade" },
  "Confeitaria, Chocolates e Trufas":      { g: 20,  medida: "1 unidade" },
  "Confeitaria, Doces e Docinhos":         { g: 15,  medida: "1 unidade" },
  "Confeitaria, Geléias, Conservas e Compotas": { g: 30, medida: "1 colher de sopa" },
  "Confeitaria, Sobremesas":               { g: 120, medida: "1 taça ou prato" },
  "Confeitaria, Tortas":                   { g: 120, medida: "1 fatia média" },
  "Especialidades, Funcionais":            { g: 150, medida: "1 porção" },
  "Especialidades, Integrais":             { g: 150, medida: "1 porção" },
  "Especialidades, Low Carb":              { g: 200, medida: "1 porção" },
  "Especialidades, Proteicas":             { g: 200, medida: "1 porção" },
  "Especialidades, Vegetarianas":          { g: 150, medida: "1 porção" },
  "Especialidades, Fitness":              { g: 150, medida: "1 porção" },
  "Especialidades, Internacionais":        { g: 200, medida: "1 porção" },
  "Especialidades, Pastosa":              { g: 150, medida: "1 porção" },
  "Especialidades, Regionais":             { g: 200, medida: "1 porção" },
  "Especialidades, Veganas":              { g: 150, medida: "1 porção" },
  "Sorvetes e Gelados":                    { g: 150, medida: "1 pote de sobremesa" },
  "Bebidas, Sucos e Drinks":              { g: 200, medida: "1 copo (200ml)" },
  "Receitas Básicas":                      { g: 150, medida: "conforme receita" },
  "A Revisar":                             { g: 150, medida: "a revisar" },
};

/** Sugere per capita (g) com base na categoria exata ou nome da receita */
export function sugerirPerCapita(nome, categoria = "") {
  // 1) Match exato por categoria
  if (categoria && PERCAPITA_POR_CATEGORIA[categoria]) {
    return PERCAPITA_POR_CATEGORIA[categoria].g;
  }

  // 2) Match parcial — categoria contém uma chave do mapa
  if (categoria) {
    for (const [chave, valor] of Object.entries(PERCAPITA_POR_CATEGORIA)) {
      if (categoria.includes(chave) || chave.includes(categoria)) {
        return valor.g;
      }
    }
  }
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
      (i.prep.toLowerCase().includes(p))
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

/** Retorna { g, medida } da tabela por categoria, ou null */
export function getPerCapitaInfo(categoria) {
  if (!categoria) return null;
  // Match exato
  if (PERCAPITA_POR_CATEGORIA[categoria]) return PERCAPITA_POR_CATEGORIA[categoria];
  // Match parcial
  for (const [chave, valor] of Object.entries(PERCAPITA_POR_CATEGORIA)) {
    if (categoria.includes(chave) || chave.includes(categoria)) return valor;
  }
  return null;
}