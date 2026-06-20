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