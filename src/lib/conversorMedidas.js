// ── Conversor de Medidas Caseiras ──
// Fonte: Anexo VII IN 75/2020 ANVISA + complementos culinários brasileiros
// Regras: conversoes_por_ingrediente > utensilios_base
// Fallback líquidos: 1ml = 1g
// Fallback sólidos: alerta ⚠️

const DATA = {
  "utensilios_base": {
    "itens": [
      { "medida": "colher de cafezinho", "aliases": ["colher café", "colherinha"], "ml": 2 },
      { "medida": "colher de chá", "aliases": ["col. chá", "colher chá"], "ml": 5 },
      { "medida": "colher de sobremesa", "aliases": ["col. sobremesa"], "ml": 10 },
      { "medida": "colher de sopa", "aliases": ["col. sopa", "colher sopa", "c.s."], "ml": 15 },
      { "medida": "xícara de café", "aliases": ["xíc. café", "xícara café"], "ml": 50 },
      { "medida": "xícara de chá", "aliases": ["xíc. chá", "xícara chá", "xícara", "1 xíc."], "ml": 150 },
      { "medida": "copo americano", "aliases": ["copo", "copo americano"], "ml": 200 },
      { "medida": "copo duplo", "aliases": ["copo requeijão", "copo grande"], "ml": 250 },
      { "medida": "xícara grande", "aliases": ["xícara americana"], "ml": 240 },
      { "medida": "pitada", "aliases": ["uma pitada"], "ml": null, "g": 0.5 },
      { "medida": "gota", "aliases": ["gotas"], "ml": 0.05 }
    ]
  },
  "conversoes_por_ingrediente": {
    "itens": [
      { "ingrediente": "Farinha de trigo", "aliases": ["farinha", "farinha branca", "farinha de trigo especial"], "conversoes": [{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10},{"medida":"colher de chá","g":3},{"medida":"copo americano","g":160}] },
      { "ingrediente": "Farinha de rosca", "aliases": ["farinha de pão", "farinha de rosca"], "conversoes": [{"medida":"xícara de chá","g":100},{"medida":"colher de sopa","g":8}] },
      { "ingrediente": "Farinha de milho", "aliases": ["fubá", "farinha de milho fina", "farinha de milho média", "farinha de milho grossa"], "conversoes": [{"medida":"xícara de chá","g":130},{"medida":"colher de sopa","g":10}] },
      { "ingrediente": "Amido de milho", "aliases": ["maisena", "amido", "fécula de milho"], "conversoes": [{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10},{"medida":"colher de chá","g":3}] },
      { "ingrediente": "Aveia em flocos", "aliases": ["aveia", "flocos de aveia", "aveia em flocos finos", "aveia em flocos grossos"], "conversoes": [{"medida":"xícara de chá","g":80},{"medida":"colher de sopa","g":8}] },
      { "ingrediente": "Açúcar refinado", "aliases": ["açúcar", "açúcar branco", "açúcar comum"], "conversoes": [{"medida":"xícara de chá","g":180},{"medida":"colher de sopa","g":12},{"medida":"colher de chá","g":4},{"medida":"copo americano","g":240}] },
      { "ingrediente": "Açúcar de confeiteiro", "aliases": ["açúcar impalpável", "açúcar de glaçúcar", "açúcar fino"], "conversoes": [{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10}] },
      { "ingrediente": "Açúcar mascavo", "aliases": ["açúcar mascavo", "açúcar demerara"], "conversoes": [{"medida":"xícara de chá","g":200},{"medida":"colher de sopa","g":14}] },
      { "ingrediente": "Mel", "aliases": ["mel de abelha", "mel puro"], "conversoes": [{"medida":"colher de sopa","g":20},{"medida":"colher de chá","g":7},{"medida":"xícara de chá","g":300}] },
      { "ingrediente": "Chocolate em pó", "aliases": ["achocolatado em pó", "chocolate em pó 50%", "chocolate em pó solúvel"], "conversoes": [{"medida":"xícara de chá","g":100},{"medida":"colher de sopa","g":8},{"medida":"colher de chá","g":3}] },
      { "ingrediente": "Cacau em pó", "aliases": ["cacau", "cacau puro", "cacau 100%", "pó de cacau"], "conversoes": [{"medida":"xícara de chá","g":85},{"medida":"colher de sopa","g":7},{"medida":"colher de chá","g":2}] },
      { "ingrediente": "Manteiga", "aliases": ["manteiga sem sal", "manteiga com sal", "margarina"], "conversoes": [{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5},{"medida":"xícara de chá","g":220}] },
      { "ingrediente": "Óleo", "aliases": ["óleo de soja", "óleo vegetal", "óleo de girassol", "óleo de canola"], "conversoes": [{"medida":"colher de sopa","g":12},{"medida":"colher de chá","g":4},{"medida":"xícara de chá","g":200},{"medida":"copo americano","g":180}] },
      { "ingrediente": "Azeite de oliva", "aliases": ["azeite", "azeite extravirgem"], "conversoes": [{"medida":"colher de sopa","g":12},{"medida":"colher de chá","g":4},{"medida":"xícara de chá","g":200}] },
      { "ingrediente": "Creme de leite fresco", "aliases": ["nata", "creme de leite", "creme de leite fresco"], "conversoes": [{"medida":"colher de sopa","g":15},{"medida":"xícara de chá","g":240},{"medida":"copo americano","g":200}] },
      { "ingrediente": "Leite", "aliases": ["leite integral", "leite desnatado", "leite semidesnatado", "leite líquido"], "conversoes": [{"medida":"xícara de chá","g":240},{"medida":"copo americano","g":200},{"medida":"colher de sopa","g":15}] },
      { "ingrediente": "Leite em pó", "aliases": ["leite em pó integral", "leite em pó desnatado"], "conversoes": [{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10}] },
      { "ingrediente": "Iogurte", "aliases": ["iogurte natural", "iogurte grego"], "conversoes": [{"medida":"xícara de chá","g":240},{"medida":"colher de sopa","g":20}] },
      { "ingrediente": "Sal", "aliases": ["sal refinado", "sal grosso", "sal marinho"], "conversoes": [{"medida":"colher de chá","g":5},{"medida":"colher de sopa","g":15},{"medida":"pitada","g":0.5}] },
      { "ingrediente": "Fermento em pó", "aliases": ["fermento químico", "pó royal", "fermento para bolo"], "conversoes": [{"medida":"colher de chá","g":4},{"medida":"colher de sopa","g":12}] },
      { "ingrediente": "Fermento biológico seco", "aliases": ["fermento seco", "fermento instantâneo"], "conversoes": [{"medida":"colher de chá","g":3},{"medida":"colher de sopa","g":9}] },
      { "ingrediente": "Bicarbonato de sódio", "aliases": ["bicarbonato"], "conversoes": [{"medida":"colher de chá","g":5},{"medida":"colher de sopa","g":14}] },
      { "ingrediente": "Canela em pó", "aliases": ["canela"], "conversoes": [{"medida":"colher de chá","g":2.5},{"medida":"colher de sopa","g":7}] },
      { "ingrediente": "Orégano", "aliases": ["orégano seco", "orégano desidratado"], "conversoes": [{"medida":"colher de chá","g":1.5},{"medida":"colher de sopa","g":4}] },
      { "ingrediente": "Páprica", "aliases": ["páprica doce", "páprica defumada", "colorau"], "conversoes": [{"medida":"colher de chá","g":2.5},{"medida":"colher de sopa","g":7}] },
      { "ingrediente": "Pimenta-do-reino", "aliases": ["pimenta do reino", "pimenta moída", "pimenta em grão"], "conversoes": [{"medida":"colher de chá","g":2},{"medida":"colher de sopa","g":6}] },
      { "ingrediente": "Ervas finas", "aliases": ["fines herbes", "fines-herbes", "mix de ervas"], "conversoes": [{"medida":"colher de chá","g":1},{"medida":"colher de sopa","g":3}] },
      { "ingrediente": "Ovo", "aliases": ["ovo de galinha", "ovos"], "conversoes": [{"medida":"unidade P","g":40},{"medida":"unidade M","g":50},{"medida":"unidade G","g":60},{"medida":"unidade GG","g":70},{"medida":"unidade","g":50}] },
      { "ingrediente": "Gema de ovo", "aliases": ["gema", "gemas"], "conversoes": [{"medida":"unidade","g":18}] },
      { "ingrediente": "Clara de ovo", "aliases": ["clara", "claras"], "conversoes": [{"medida":"unidade","g":33}] },
      { "ingrediente": "Cebola", "aliases": ["cebola roxa", "cebola branca"], "conversoes": [{"medida":"unidade P","g":70},{"medida":"unidade M","g":100},{"medida":"unidade G","g":150},{"medida":"unidade","g":100}] },
      { "ingrediente": "Alho", "aliases": ["dente de alho", "alho picado"], "conversoes": [{"medida":"dente","g":5},{"medida":"unidade","g":5},{"medida":"colher de sopa","g":10},{"medida":"colher de chá","g":3}] },
      { "ingrediente": "Tomate", "aliases": ["tomate italiano", "tomate caqui", "tomate cereja"], "conversoes": [{"medida":"unidade P","g":80},{"medida":"unidade M","g":120},{"medida":"unidade G","g":160},{"medida":"unidade","g":120}] },
      { "ingrediente": "Limão", "aliases": ["limão taiti", "limão siciliano", "limão cravo"], "conversoes": [{"medida":"unidade P","g":60},{"medida":"unidade M","g":80},{"medida":"unidade G","g":100},{"medida":"unidade","g":80},{"medida":"suco de 1 unidade","g":30}] },
      { "ingrediente": "Cenoura", "aliases": ["cenoura crua"], "conversoes": [{"medida":"unidade P","g":60},{"medida":"unidade M","g":80},{"medida":"unidade G","g":120},{"medida":"unidade","g":80}] },
      { "ingrediente": "Batata", "aliases": ["batata inglesa", "batata comum"], "conversoes": [{"medida":"unidade P","g":100},{"medida":"unidade M","g":150},{"medida":"unidade G","g":200},{"medida":"unidade","g":150}] },
      { "ingrediente": "Banana", "aliases": ["banana prata", "banana nanica", "banana da terra"], "conversoes": [{"medida":"unidade P","g":80},{"medida":"unidade M","g":100},{"medida":"unidade G","g":130},{"medida":"unidade","g":100}] },
      { "ingrediente": "Maçã", "aliases": ["maçã fuji", "maçã gala"], "conversoes": [{"medida":"unidade M","g":150},{"medida":"unidade G","g":200},{"medida":"unidade","g":150}] },
      { "ingrediente": "Queijo parmesão", "aliases": ["parmesão ralado", "queijo parmesão ralado"], "conversoes": [{"medida":"colher de sopa","g":10},{"medida":"xícara de chá","g":100}] },
      { "ingrediente": "Extrato de tomate", "aliases": ["extrato de tomate concentrado"], "conversoes": [{"medida":"colher de sopa","g":18},{"medida":"colher de chá","g":6}] },
      { "ingrediente": "Molho de soja", "aliases": ["shoyu", "soja"], "conversoes": [{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5}] },
      { "ingrediente": "Água", "aliases": ["água fria", "água quente", "água morna"], "conversoes": [{"medida":"xícara de chá","g":240},{"medida":"copo americano","g":200},{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5}] },
      { "ingrediente": "Vinagre", "aliases": ["vinagre de vinho", "vinagre de maçã", "vinagre branco"], "conversoes": [{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5}] }
    ]
  },
  "fracoes": { "1/2":0.5,"1/3":0.333,"1/4":0.25,"3/4":0.75,"2/3":0.667,"1 e 1/2":1.5,"1 e 1/4":1.25,"1 e 3/4":1.75 }
};

// Normalize a measure name to its canonical form
const normalizarMedida = (txt) => {
  const lower = (txt || "").toLowerCase().trim();
  // Try utensilios_base aliases first
  for (const u of DATA.utensilios_base.itens) {
    for (const alias of u.aliases) {
      if (lower.includes(alias.toLowerCase())) return u.medida;
    }
    if (lower.includes(u.medida.toLowerCase())) return u.medida;
  }
  // Try conversion items' measure names
  for (const ing of DATA.conversoes_por_ingrediente.itens) {
    for (const conv of ing.conversoes) {
      if (lower.includes(conv.medida.toLowerCase())) return conv.medida;
    }
  }
  // Check for "unidade" with size
  if (/\bunidade\b/.test(lower)) return "unidade";
  if (/\bdente\b/.test(lower)) return "dente";
  return lower;
};

// Parse fraction text to number
const parseFracao = (txt) => {
  const lower = (txt || "").toLowerCase().trim();
  // Check known fractions
  for (const [k, v] of Object.entries(DATA.fracoes)) {
    if (lower.includes(k)) return v;
  }
  // Try "X e Y/Z" pattern
  const match = lower.match(/^(\d+)\s+e\s+(\d+)\/(\d+)$/);
  if (match) return parseInt(match[1]) + parseInt(match[2]) / parseInt(match[3]);
  // Try "X Y/Z" pattern
  const match2 = lower.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (match2) return parseInt(match2[1]) + parseInt(match2[2]) / parseInt(match2[3]);
  // Try simple fraction
  const frac = lower.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  // Plain number
  const num = parseFloat(txt);
  return isNaN(num) ? null : num;
};

/**
 * Find ingredient-specific conversion
 * @param {string} ingNome - ingredient name (from text)
 * @param {string} medidaNome - canonical measure name
 * @returns {{ g: number, ingrediente: string } | null}
 */
const buscarConversaoIngrediente = (ingNome, medidaNome) => {
  if (!ingNome || !medidaNome) return null;
  const lower = ingNome.toLowerCase().trim();
  
  for (const item of DATA.conversoes_por_ingrediente.itens) {
    // Check all aliases
    const allNames = [item.ingrediente, ...item.aliases];
    const matched = allNames.some(a => lower.includes(a.toLowerCase()));
    if (!matched) continue;
    
    // Find the matching measure
    for (const conv of item.conversoes) {
      if (conv.medida === medidaNome) {
        return { g: conv.g, ingrediente: item.ingrediente };
      }
    }
    // If exact measure not found, try partial match
    for (const conv of item.conversoes) {
      if (medidaNome.includes(conv.medida) || conv.medida.includes(medidaNome)) {
        return { g: conv.g, ingrediente: item.ingrediente };
      }
    }
  }
  return null;
};

/**
 * Get utensil base volume in ml (1ml ≈ 1g for liquids)
 * @param {string} medidaNome
 * @returns {number | null}
 */
const buscarUtensilioBase = (medidaNome) => {
  if (!medidaNome) return null;
  // Special: pitada
  if (medidaNome === "pitada") return 0.5;
  if (medidaNome === "gota") return 0.05;
  
  for (const u of DATA.utensilios_base.itens) {
    if (u.medida === medidaNome) return u.ml;
    for (const alias of u.aliases) {
      if (alias.toLowerCase() === medidaNome.toLowerCase()) return u.ml;
    }
  }
  return null;
};

/**
 * Main conversion function
 * @param {string} texto - full measure text (e.g. "2 xícaras de chá de farinha de trigo")
 * @param {string} ingNome - ingredient name (separate, for matching)
 * @returns {{ gPorUnidade: number, isExact: boolean, displayText: string, alerta: boolean }}
 */
export const converterMedida = (texto, ingNome) => {
  if (!texto) return { gPorUnidade: null, isExact: false, displayText: null, alerta: false };
  
  const txt = texto.toLowerCase().trim();
  
  // 1. Parse quantity (number before the measure)
  let quantidade = 1;
  const qMatch = txt.match(/^([\d/,.\s]+(?:e\s+)?[\d/]*)\s/);
  if (qMatch) {
    const qStr = qMatch[1].trim();
    const parsed = parseFracao(qStr);
    if (parsed !== null) quantidade = parsed;
  }
  
  // 2. Normalize measure name
  const medidaCanonica = normalizarMedida(txt);
  
  // 3. Try ingredient-specific conversion
  const ingConv = buscarConversaoIngrediente(ingNome || "", medidaCanonica);
  if (ingConv) {
    const gTotal = quantidade * ingConv.g;
    return {
      gPorUnidade: ingConv.g,
      gTotal,
      isExact: true,
      displayText: `${quantidade} ${medidaCanonica} de ${ingConv.ingrediente} → ${gTotal.toFixed(1)}g`,
      alerta: false,
    };
  }
  
  // 4. Fallback: utensílio base (ml ≈ g for liquids, but used as estimate for solids)
  const mlBase = buscarUtensilioBase(medidaCanonica);
  if (mlBase !== null) {
    const gTotal = quantidade * mlBase;
    return {
      gPorUnidade: mlBase,
      gTotal,
      isExact: false, // estimated — not ingredient-specific
      displayText: `${quantidade} ${medidaCanonica} → ~${gTotal.toFixed(1)}g ⚠️`,
      alerta: true,
    };
  }
  
  // 5. Completely unknown — return null
  return { gPorUnidade: null, isExact: false, displayText: `${texto} → ? ⚠️`, alerta: true };
};

/**
 * Generate the conversion table text for the LLM prompt
 */
export const gerarTabelaPrompt = () => {
  const linhas = [];
  
  // Ingredient-specific conversions
  linhas.push("CONVERSÕES POR INGREDIENTE (prioridade máxima):");
  for (const item of DATA.conversoes_por_ingrediente.itens) {
    for (const conv of item.conversoes) {
      linhas.push(`  - 1 ${conv.medida} de ${item.ingrediente.toLowerCase()} = ${conv.g}g`);
    }
  }
  
  // Utensil base (fallback)
  linhas.push("\nMEDIDAS PADRÃO (fallback quando ingrediente não está na tabela):");
  for (const u of DATA.utensilios_base.itens) {
    if (u.ml !== null) {
      linhas.push(`  - 1 ${u.medida} = ${u.ml}ml ≈ ${u.ml}g (líquidos) / ~${u.ml}g (sólidos — marcar ⚠️)`);
    } else if (u.g !== null) {
      linhas.push(`  - 1 ${u.medida} = ${u.g}g`);
    }
  }
  
  // Fractions
  linhas.push("\nFRAÇÕES:");
  for (const [k, v] of Object.entries(DATA.fracoes)) {
    linhas.push(`  - ${k} = ${v}`);
  }
  
  return linhas.join("\n");
};

export default converterMedida;