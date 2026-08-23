import { base44 } from "@/api/base44Client";
import { consoleErrorSeguro } from "@/lib/securityHardening";

const uniq = (values = []) => [...new Set((values || []).filter(Boolean).map(String))];

/**
 * Fase 10.3 — ponto único do frontend para invalidar caches persistidos.
 *
 * A função backend faz a propagação reversa pelas sub-receitas e preserva o
 * significado de `incompleto`/`legado`. Preços pessoais não devem chamar este
 * helper, pois nunca alteram o cache global da Receita.
 */
export async function invalidarCustosDependentes({
  receitaIds = [],
  ingredienteIds = [],
  motivo = "alteracao_dependencia_custo",
  origem = "aplicacao",
} = {}) {
  const receitas = uniq(receitaIds);
  const ingredientes = uniq(ingredienteIds);
  if (!receitas.length && !ingredientes.length) return null;

  const response = await base44.functions.invoke("invalidarCustosDependentes", {
    receita_ids: receitas,
    ingrediente_ids: ingredientes,
    motivo,
    origem,
  });
  return response?.data || null;
}

/**
 * Variante defensiva para fluxos em que a gravação principal já ocorreu.
 * Evita transformar uma falha de invalidação em falsa impressão de que a
 * alteração de dados não foi salva. A falha fica registrada no console seguro.
 */
export async function invalidarCustosDependentesSeguro(args = {}) {
  try {
    return await invalidarCustosDependentes(args);
  } catch (error) {
    consoleErrorSeguro("Falha ao invalidar cache de custos", error);
    return null;
  }
}
