import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import {
  buscarPrecosPersonalizados,
  aplicarPrecosPersonalizados,
} from "@/lib/precoIngredienteCliente";
import {
  buscarPreferenciasIngredientes,
  aplicarPreferenciasIngredientes,
} from "@/lib/preferenciaIngredienteUsuario";

/**
 * Fase 10 — contexto comercial canônico para custos.
 *
 * Precedência:
 * Ingrediente mestre
 *   ↓
 * PrecoIngredienteCliente (legado/fallback)
 *   ↓
 * IngredienteUsuario (canônico, sempre prevalece)
 *
 * O retorno existe apenas em memória. Preços pessoais NUNCA são gravados em
 * Receita.custo_* porque esses campos são cache global de referência.
 */
export async function carregarIngredientesEfetivosCusto({ userId, isAdmin = false } = {}) {
  const ingredientesMestre = await fetchAllPages(base44.entities.Ingrediente, "-nome");
  if (isAdmin || !userId) return ingredientesMestre || [];

  const [precosLegados, preferencias] = await Promise.all([
    buscarPrecosPersonalizados(userId),
    buscarPreferenciasIngredientes(userId),
  ]);

  const comFallbackLegado = aplicarPrecosPersonalizados(ingredientesMestre || [], precosLegados || {});
  return aplicarPreferenciasIngredientes(comFallbackLegado, preferencias || {});
}

export function mapearIngredientesPorId(ingredientes = []) {
  const map = {};
  for (const ingrediente of ingredientes || []) {
    if (ingrediente?.id) map[ingrediente.id] = ingrediente;
  }
  return map;
}
