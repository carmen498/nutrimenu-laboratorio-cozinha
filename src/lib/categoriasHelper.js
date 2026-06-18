/**
 * Helper para transição de categoria (string) → categorias (array).
 * Lê o novo campo `categorias` primeiro; se vazio, cai no antigo `categoria`.
 */
export function getCategorias(receita) {
  if (!receita) return [];
  if (Array.isArray(receita.categorias) && receita.categorias.length > 0) {
    return receita.categorias;
  }
  // Fallback: campo antigo como string única
  if (receita.categoria && typeof receita.categoria === 'string' && receita.categoria.trim()) {
    return [receita.categoria.trim()];
  }
  return [];
}

/**
 * Verifica se uma receita tem uma determinada categoria
 */
export function hasCategoria(receita, cat) {
  return getCategorias(receita).includes(cat);
}