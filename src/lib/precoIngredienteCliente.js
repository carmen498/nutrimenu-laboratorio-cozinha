import { base44 } from "@/api/base44Client";

// Preços personalizados por cliente (não-admin) — sobrescrevem, só para quem os
// criou, o preco_por_g_rs do cadastro compartilhado de Ingrediente. O cadastro
// original NUNCA é alterado por um não-admin; a "edição" vira um registro pessoal
// aqui, de forma transparente (sem erro de permissão visível).

export async function buscarPrecosPersonalizados(userId) {
  if (!userId) return {};
  const registros = await base44.entities.PrecoIngredienteCliente.filter({ user_id: userId });
  const map = {};
  registros.forEach((r) => { map[r.ingrediente_id] = r; });
  return map;
}

// Retorna uma NOVA lista de ingredientes com preco_por_g_rs (e preco_embalagem_rs
// derivado) sobrescritos onde houver preço personalizado — nunca muta o original.
export function aplicarPrecosPersonalizados(ingredientes, precosMap) {
  if (!precosMap || Object.keys(precosMap).length === 0) return ingredientes;
  return ingredientes.map((ing) => {
    const override = precosMap[ing.id];
    if (!override) return ing;
    const precoPorG = override.preco_por_g_rs || 0;
    return {
      ...ing,
      preco_por_g_rs: precoPorG,
      preco_embalagem_rs: parseFloat((precoPorG * (ing.peso_embalagem_g || 0)).toFixed(4)),
      _preco_personalizado: true,
    };
  });
}

// Cria ou atualiza o preço personalizado do usuário para um ingrediente.
export async function salvarPrecoPersonalizado({ ingredienteId, userId, precoPorGRs }) {
  const existentes = await base44.entities.PrecoIngredienteCliente.filter({
    ingrediente_id: ingredienteId,
    user_id: userId,
  });
  const payload = {
    ingrediente_id: ingredienteId,
    user_id: userId,
    preco_por_g_rs: precoPorGRs,
    updated_at: new Date().toISOString(),
  };
  if (existentes[0]) {
    return base44.entities.PrecoIngredienteCliente.update(existentes[0].id, payload);
  }
  return base44.entities.PrecoIngredienteCliente.create(payload);
}