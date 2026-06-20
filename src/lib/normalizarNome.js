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

export function buscarFuzzy(nome, receitasExistentes) {
  const norm = normalizarNome(nome);
  if (!norm || norm.length < 4) return null;
  const wordsA = norm.split(" ").filter(w => w.length > 2);

  for (const r of receitasExistentes) {
    const normR = normalizarNome(r.nome);
    if (!normR) continue;

    // Exata
    if (norm === normR) return { receita: r, motivo: "idêntico" };

    // Contida
    if (norm.includes(normR) || normR.includes(norm)) {
      return { receita: r, motivo: "nome contido" };
    }

    // Sobreposição de palavras
    const wordsB = normR.split(" ").filter(w => w.length > 2);
    if (wordsA.length === 0 || wordsB.length === 0) continue;
    const overlap = wordsA.filter(wa => wordsB.some(wb => wb === wa || wb.includes(wa) || wa.includes(wb)));
    const ratioA = overlap.length / wordsA.length;
    const ratioB = overlap.length / wordsB.length;
    if (ratioA > 0.6 || ratioB > 0.6) {
      return { receita: r, motivo: "similar" };
    }
  }
  return null;
}