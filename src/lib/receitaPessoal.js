export function isReceitaPessoalDoUsuario(receita, userId) {
  if (!receita || !userId || receita.is_base === true) return false;
  return receita.usuario_dono_id === userId
    || (!receita.usuario_dono_id && receita.created_by_id === userId);
}

export function deduplicarReceitas(receitas = []) {
  return Array.from(new Map(receitas.map((receita) => [receita.id, receita])).values());
}
