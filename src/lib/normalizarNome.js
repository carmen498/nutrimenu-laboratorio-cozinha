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