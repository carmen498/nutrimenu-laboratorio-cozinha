/**
 * Normaliza um nome para comparação de similaridade:
 * - lowercase
 * - remove acentos
 * - substitui separadores (– — / - |) por espaço
 * - remove pontuação extra
 * - colapsa espaços múltiplos
 */
export function normalizarNome(nome) {
  if (!nome) return "";
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")           // remove acentos
    .replace(/[–—\/\-|]/g, " ")                // separadores → espaço
    .replace(/[^a-z0-9\s]/g, "")               // remove pontuação
    .replace(/\s+/g, " ")                       // colapsa espaços
    .trim();
}

/**
 * Busca receita com nome similar. Retorna a receita existente ou null.
 */
export function buscarSimilar(nome, receitasExistentes) {
  const norm = normalizarNome(nome);
  if (!norm) return null;
  return receitasExistentes.find(r => normalizarNome(r.nome) === norm) || null;
}

/**
 * Busca fuzzy — detecta nomes similares (não apenas idênticos).
 * Critérios:
 * 1. Uma string está contida na outra
 * 2. Alta sobreposição de palavras (> 60%)
 * Retorna { receita, motivo } ou null.
 */
/**
 * Busca ingredientes com ranqueamento inteligente:
 * 1. Match exato (case-insensitive)
 * 2. Match exato normalizado (sem acentos, pontuação)
 * 3. Começa com o termo de busca
 * 4. Contém como palavra inteira
 * 5. Contém como substring
 * Retorna array ordenado por relevância (melhores primeiro).
 */
export function buscarIngredientesRanqueado(termo, ingredientes, limite = 20) {
  if (!termo?.trim()) return ingredientes.slice(0, limite);
  const busca = termo.toLowerCase().trim();
  const buscaNorm = normalizarNome(busca);

  const pontuados = ingredientes.map(ing => {
    const nome = (ing.nome || "").toLowerCase();
    const nomeNorm = normalizarNome(nome);
    let score = 0;

    // 1. Exata (case-insensitive) — peso máximo
    if (nome === busca) score = 1000;
    // 2. Exata normalizada
    else if (nomeNorm === buscaNorm) score = 900;
    // 3. Começa com o termo
    else if (nome.startsWith(busca)) score = 800;
    else if (nomeNorm.startsWith(buscaNorm)) score = 700;
    // 4. Palavra inteira
    else if (new RegExp(`\\b${busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(nome)) score = 600;
    else if (new RegExp(`\\b${buscaNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(nomeNorm)) score = 500;
    // 5. Contém
    else if (nome.includes(busca)) score = 400;
    else if (nomeNorm.includes(buscaNorm)) score = 300;

    return { ing, score };
  });

  return pontuados
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(p => p.ing);
}

/**
 * Marcas comerciais comuns em receitas brasileiras.
 * Removidas automaticamente do nome do ingrediente.
 */
const MARCAS_COMERCIAIS = [
  // Laticínios
  "piracanjuba", "itambé", "itambe", "parmalat", "batavo", "vigor", "elegê", "elege",
  "mococa", "nestlé", "nestle", "ita", "qualitá", "qualita", "taeq", "tirol",
  "porto alegre", "bom gosto", "canto da serra",
  // Carnes / Frios
  "sadia", "perdigão", "perdigao", "seara", "aurora", "copacol", "frimesa", "pif paf",
  // Massas / Farinhas / Pães
  "piraquê", "piraque", "bauducco", "wickbold", "pullman", "panco", "seven boys",
  "adria", "renata", "dona benta", "sol", "noodle", "barilla",
  // Temperos / Molhos / Condimentos
  "yoki", "kitano", "maggi", "knorr", "ajinomoto", "hemmer", "fugini", "elefante",
  "pomarola", "salsaretti", "hellmann's", "hellmanns", "liza", "cocinero", "galo",
  "arisco", "caldo bom", "cepera",
  // Doces / Confeitaria
  "mococa", "italac", "frimesa", "nestlé", "nestle", "garoto", "lacta", "arcor",
  // Outros
  "heinz", "predilecta", "predileta", "quetá", "queta", "maizena",
  "ipê", "ipe", "camil", "urbano", "prato fino", "tio joão", "tio joao",
  "namorado", "broto legal", "vilma",
];

/**
 * Remove marcas comerciais do final do nome do ingrediente.
 * "Manteiga com Sal Piracanjuba" → "Manteiga com sal"
 * "Creme de Leite Itambé" → "Creme de leite"
 * Retorna o nome limpo, sem a marca.
 */
export function removerMarca(nome) {
  if (!nome) return nome;
  const words = nome.trim().split(/\s+/);
  if (words.length < 2) return nome;

  // Testa as últimas 1-3 palavras como possível marca
  for (let n = Math.min(3, words.length - 1); n >= 1; n--) {
    const tail = words.slice(-n).join(" ").toLowerCase();
    const tailSemPontuacao = tail.replace(/[^a-z0-9\s]/g, "").trim();
    if (MARCAS_COMERCIAIS.includes(tailSemPontuacao)) {
      return words.slice(0, -n).join(" ").trim();
    }
    // Also check without accents (e.g., "Itambé" vs "itambe")
    const tailSemAcento = tailSemPontuacao.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (tailSemAcento !== tailSemPontuacao && MARCAS_COMERCIAIS.includes(tailSemAcento)) {
      return words.slice(0, -n).join(" ").trim();
    }
  }

  return nome;
}

/**
 * Busca tolerante em receitas: divide o termo em palavras e retorna
 * itens que contenham TODAS as palavras em qualquer posição.
 * "molho 4" → "MOLHO DE 4 QUEIJOS"
 * "arroz bra" → "ARROZ BRANCO"
 * excludeId: ID da receita sendo editada (para não aparecer como sub-receita dela mesma).
 */
export function buscarReceitasMultiPalavra(termo, receitas, excludeId = null, limite = 20) {
  if (!termo?.trim()) return [];
  const palavras = normalizarNome(termo).split(" ").filter(w => w.length > 0);
  if (palavras.length === 0) return [];
  return receitas
    .filter(r => {
      if (excludeId && r.id === excludeId) return false;
      if (!r.nome) return false;
      const normR = normalizarNome(r.nome);
      return palavras.every(p => normR.includes(p));
    })
    .slice(0, limite);
}

export function buscarFuzzy(nome, receitasExistentes) {
  const norm = normalizarNome(nome);
  if (!norm || norm.length < 4) return null;

  for (const r of receitasExistentes) {
    const normR = normalizarNome(r.nome);
    if (!normR) continue;

    // 1. Idêntico (após normalização: lowercase, sem acentos, sem pontuação)
    if (norm === normR) return { receita: r, motivo: "idêntico" };

    // 2. Quase idêntico — mesma sequência de palavras, mas com palavras extras curtas
    //    removidas (artigos, preposições) para tolerar "Bolo de Cenoura" vs "Bolo Cenoura"
    const stripShort = (s) => normalizarNome(s).split(" ").filter(w => w.length > 2).join(" ");
    const normAStripped = stripShort(nome);
    const normRStripped = stripShort(r.nome);
    if (normAStripped && normAStripped === normRStripped) {
      return { receita: r, motivo: "idêntico" };
    }
  }
  return null;
}