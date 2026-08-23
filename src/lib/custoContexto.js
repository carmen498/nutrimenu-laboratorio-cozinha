import { base44 } from "@/api/base44Client";
import { fetchAllFilteredPages, fetchAllPages } from "@/lib/fetchAllPages";
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
export async function carregarIngredientesEfetivosCusto(/** @type {any} */ { userId, isAdmin = false } = {}) {
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

/**
 * Fase 11.1 — carrega, de uma só vez, todo o contexto necessário para o
 * escalonamento canônico das receitas de um cardápio/relatório.
 *
 * Evita que telas diferentes chamem o mesmo motor com subconjuntos distintos
 * de dados (ex.: sem InsumoReceita ou sem preço pessoal) e produzam custos
 * divergentes para a mesma produção.
 */
export async function carregarContextoCustosReceitas(/** @type {any} */ { receitaIds = [], userId, isAdmin = false } = {}) {
  const ids = [...new Set((receitaIds || []).filter(Boolean))];
  const [ingredientesEfetivos, composicoes, insumos, esquecidos] = await Promise.all([
    carregarIngredientesEfetivosCusto({ userId, isAdmin }),
    Promise.all(ids.map((receitaId) => fetchAllFilteredPages(
      base44.entities.IngredienteReceita,
      { receita_id: receitaId },
      "ordem",
      500
    ))),
    Promise.all(ids.map((receitaId) => fetchAllFilteredPages(
      base44.entities.InsumoReceita,
      { receita_id: receitaId },
      "created_date",
      500
    ))),
    Promise.all(ids.map((receitaId) => fetchAllFilteredPages(
      base44.entities.IngredienteEsquecidoReceita,
      { receita_id: receitaId },
      "created_date",
      500
    ))),
  ]);

  const ingredientesPorReceita = {};
  const insumosPorReceita = {};
  const esquecidosPorReceita = {};
  ids.forEach((receitaId, index) => {
    ingredientesPorReceita[receitaId] = composicoes[index] || [];
    insumosPorReceita[receitaId] = insumos[index] || [];
    esquecidosPorReceita[receitaId] = esquecidos[index] || [];
  });

  return {
    ingredientesEfetivos: ingredientesEfetivos || [],
    ingredienteMap: mapearIngredientesPorId(ingredientesEfetivos || []),
    ingredientesPorReceita,
    insumosPorReceita,
    esquecidosPorReceita,
  };
}
