import { base44 } from "@/api/base44Client";

// Preferências pessoais do ingrediente. O cadastro mestre de Ingrediente nunca
// deve ser alterado para armazenar estado específico de um usuário.
export async function buscarPreferenciasIngredientes(userId) {
  if (!userId) return {};

  const registros = await base44.entities.IngredienteUsuario.filter(
    { user_id: userId },
    "-updated_date",
    500
  );

  const map = {};
  for (const registro of registros || []) {
    if (!registro?.ingrediente_id || map[registro.ingrediente_id]) continue;
    map[registro.ingrediente_id] = registro;
  }
  return map;
}

export function aplicarPreferenciasIngredientes(
  ingredientes,
  preferencias = {},
  { usarFavoritoLegado = false } = {}
) {
  return (ingredientes || []).map((ingrediente) => {
    const preferencia = preferencias?.[ingrediente.id];
    const favorito = preferencia
      ? !!preferencia.favorito
      : (usarFavoritoLegado ? !!ingrediente.favorito : false);

    return {
      ...ingrediente,
      favorito,
      _preferencia_ingrediente_id: preferencia?.id || null,
    };
  });
}

export async function salvarFavoritoIngrediente({ ingredienteId, userId, favorito }) {
  if (!ingredienteId) throw new Error("Ingrediente não identificado.");
  if (!userId) throw new Error("Usuário não identificado.");

  const existentes = await base44.entities.IngredienteUsuario.filter(
    { ingrediente_id: ingredienteId, user_id: userId },
    "-updated_date",
    5
  );

  const atual = existentes?.[0];
  if (atual) {
    return base44.entities.IngredienteUsuario.update(atual.id, { favorito: !!favorito });
  }

  return base44.entities.IngredienteUsuario.create({
    ingrediente_id: ingredienteId,
    user_id: userId,
    favorito: !!favorito,
  });
}
