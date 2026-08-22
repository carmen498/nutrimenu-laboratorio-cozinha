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

async function sincronizarPrecoNoIngredienteUsuario({ ingredienteId, userId, precoPorGRs }) {
  const registros = await base44.entities.IngredienteUsuario.filter(
    { ingrediente_id: ingredienteId, user_id: userId },
    "-updated_date",
    5
  );
  const atual = registros?.[0];
  const preco = Number(precoPorGRs) || 0;

  // Quando a gravação veio do fluxo completo da Fase 3, o valor já estará igual.
  // Nesse caso não tocamos no histórico nem nos demais dados comerciais.
  if (atual && Number(atual.preco_por_g_rs || 0) === preco) return atual;

  const payload = {
    preco_por_g_rs: preco,
    preco_atualizado_em: new Date().toISOString(),
    fonte_preco: "Manual",
  };

  if (atual) {
    return base44.entities.IngredienteUsuario.update(atual.id, payload);
  }

  return base44.entities.IngredienteUsuario.create({
    ingrediente_id: ingredienteId,
    user_id: userId,
    favorito: false,
    ...payload,
  });
}

// Espelho temporário do preço pessoal. Além da entidade legada, sincroniza o
// preço na fonte principal (IngredienteUsuario), permitindo que telas antigas
// continuem funcionando durante a migração sem perder a arquitetura da Fase 3.
export async function salvarPrecoPersonalizado({ ingredienteId, userId, precoPorGRs }) {
  if (!ingredienteId) throw new Error("Ingrediente não identificado.");
  if (!userId) throw new Error("Usuário não identificado.");

  await sincronizarPrecoNoIngredienteUsuario({ ingredienteId, userId, precoPorGRs });

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
