import { base44 } from "@/api/base44Client";

// LEGADO DE COMPATIBILIDADE — Fase 3
// A fonte principal dos dados comerciais pessoais passou a ser IngredienteUsuario.
// Esta entidade continua sendo lida/escrita temporariamente para não quebrar módulos
// de custo que ainda dependem exclusivamente de PrecoIngredienteCliente.

export async function buscarPrecosPersonalizados(userId) {
  if (!userId) return {};

  const pageSize = 500;
  let skip = 0;
  let registros = [];
  while (true) {
    const pagina = await base44.entities.PrecoIngredienteCliente.filter(
      { user_id: userId },
      "-updated_at",
      pageSize,
      skip
    );
    registros = registros.concat(pagina || []);
    if (!pagina || pagina.length < pageSize) break;
    skip += pageSize;
  }

  const map = {};
  registros.forEach((r) => {
    if (!r?.ingrediente_id || map[r.ingrediente_id]) return;
    map[r.ingrediente_id] = r;
  });
  return map;
}

// Fallback legado: sobrescreve somente preço. Depois desta etapa,
// aplicarPreferenciasIngredientes pode sobrescrever todos os dados comerciais
// com os valores mais novos vindos de IngredienteUsuario.
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

// Espelho temporário do preço pessoal. Novas funcionalidades devem usar
// salvarDadosComerciaisIngrediente em preferenciaIngredienteUsuario.js.
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
