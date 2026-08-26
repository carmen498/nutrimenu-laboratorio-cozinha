// Fase 10 — Motor de Custos Canônico.
//
// Fonte de verdade: composição da receita + FC efetivo + preço efetivo do
// ingrediente no contexto do usuário. Receita.custo_* permanece apenas como
// cache global de referência/compatibilidade e nunca representa preço pessoal.
import { resolverRendimentoReceita } from "@/lib/rendimentoReceita";
import { calcularItemIngredienteReceita } from "@/lib/ingredienteReceitaCalc";
import { criarEscalaReceitaCanonica, calcularInsumosReceitaEscalados } from "@/lib/escalonamentoCustos";

export const CUSTO_RECEITA_MODELO_VERSAO = 2;

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const normalizarNomeReferencia = (valor) => String(valor || "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

export function rendimentoEfetivo(receita, ingredientesReceita = []) {
  return resolverRendimentoReceita(receita, ingredientesReceita).pesoPosPreparoEfetivo || 0;
}

function calcularCustoEsquecido(esquecido, ingredienteMap, fator) {
  const temIngredienteId = !!esquecido?.ingrediente_id;
  const ingrediente = temIngredienteId ? ingredienteMap?.[esquecido.ingrediente_id] : null;
  const quantidade = numero(esquecido?.quantidade_g) * fator;

  // `nome` em IngredienteEsquecidoReceita é uma descrição de uso
  // (ex.: "Manteiga para untar", "Chocolate ralado para decorar"), e não
  // uma identidade canônica. Portanto, não deve ser comparado ao nome do
  // Ingrediente mestre. A integridade é garantida exclusivamente pelo ID.
  if (ingrediente && quantidade > 0) {
    const calculado = calcularItemIngredienteReceita({
      item: { fator_correcao_override: 0 },
      ingrediente,
      quantidadeLiquida: quantidade,
    });
    return { custo: calculado.custo, origem: "ingrediente_atual", semPreco: calculado.precoPorG <= 0 };
  }

  const cache = numero(esquecido?.custo_total);
  if (temIngredienteId && !ingrediente) {
    return {
      custo: cache > 0 ? cache * fator : quantidade * numero(esquecido?.custo_unitario),
      origem: "referencia_ausente",
      semPreco: cache <= 0 && numero(esquecido?.custo_unitario) <= 0,
      referenciaInvalida: true,
    };
  }

  if (cache > 0) return { custo: cache * fator, origem: "cache_legado", semPreco: false };

  const unitario = numero(esquecido?.custo_unitario);
  return { custo: quantidade * unitario, origem: unitario > 0 ? "unitario_legado" : "sem_preco", semPreco: unitario <= 0 };
}

/**
 * Calcula o custo da receita diretamente da composição.
 *
 * fator = escala em relação ao lote/rendimento cadastrado.
 * Ingredientes e ingredientes esquecidos escalam proporcionalmente.
 * InsumoReceita continua com a semântica histórica "por lote" e, por segurança,
 * não é multiplicado pelo fator até existir um campo explícito de proporcionalidade.
 */
export function calcularCustoReceitaCanonico(/** @type {any} */ {
  receita,
  ingredientesReceita = [],
  ingredienteMap = {},
  insumosReceita = [],
  esquecidos = [],
  fator = 1,
  unidadesFinais = 0,
  numeroLotes = 1,
} = {}) {
  const fatorSeguro = numero(fator) > 0 ? numero(fator) : 1;
  const porcoesBase = numero(receita?.porcoes_base) > 0 ? numero(receita.porcoes_base) : 1;
  const problemas = [];
  let custoIngredientes = 0;
  let itensSemPreco = 0;
  let referenciasAusentes = 0;

  for (const item of ingredientesReceita || []) {
    if (!item || item.tipo === "grupo" || item.tipo === "subreceita") continue;
    if (!item.ingrediente_id) {
      referenciasAusentes++;
      problemas.push({ item_id: item.id || "", tipo: "ingrediente_sem_id" });
      continue;
    }

    const ingrediente = ingredienteMap?.[item.ingrediente_id];
    if (!ingrediente) {
      referenciasAusentes++;
      problemas.push({ item_id: item.id || "", ingrediente_id: item.ingrediente_id, tipo: "ingrediente_nao_encontrado" });
      continue;
    }

    if (
      item.ingrediente_nome &&
      normalizarNomeReferencia(item.ingrediente_nome) !== normalizarNomeReferencia(ingrediente.nome)
    ) {
      referenciasAusentes++;
      problemas.push({
        item_id: item.id || "",
        ingrediente_id: item.ingrediente_id,
        ingrediente_nome_cache: item.ingrediente_nome,
        ingrediente_nome_mestre: ingrediente.nome,
        tipo: "ingrediente_nome_id_divergente",
      });
      continue;
    }

    const quantidadeLiquida = numero(item.quantidade_por_porcao) * porcoesBase * fatorSeguro;
    const calculado = calcularItemIngredienteReceita({ item, ingrediente, quantidadeLiquida });
    custoIngredientes += calculado.custo;
    if (!calculado.custoIgnorado && calculado.precoPorG <= 0 && calculado.pesoBruto > 0) {
      itensSemPreco++;
      problemas.push({
        item_id: item.id || "",
        ingrediente_id: item.ingrediente_id,
        tipo: "sem_preco",
      });
    }
  }

  const rendimentoBase = rendimentoEfetivo(receita, ingredientesReceita);
  const rendimento = rendimentoBase * fatorSeguro;
  const perCapita = numero(receita?.per_capita_g);
  const porcoesEfetivas = numero(unidadesFinais) > 0
    ? numero(unidadesFinais)
    : (perCapita > 0 && rendimento > 0
      ? rendimento / perCapita
      : porcoesBase * fatorSeguro);
  const escala = criarEscalaReceitaCanonica({
    fator: fatorSeguro,
    rendimentoBase,
    porcoesBase,
    perCapita,
    unidadesFinais: porcoesEfetivas,
    numeroLotes,
  });
  const insumosCalculados = calcularInsumosReceitaEscalados(insumosReceita, escala);
  const custoInsumos = insumosCalculados.custoTotal;
  const insumosSemPreco = insumosCalculados.itensSemPreco;
  if (insumosSemPreco > 0) {
    problemas.push({ tipo: "insumo_sem_preco", quantidade: insumosSemPreco });
  }

  let custoEsquecidos = 0;
  let esquecidosCacheLegado = 0;
  for (const esquecido of esquecidos || []) {
    const calculado = calcularCustoEsquecido(esquecido, ingredienteMap, fatorSeguro);
    custoEsquecidos += calculado.custo;
    if (calculado.origem === "cache_legado" || calculado.origem === "unitario_legado") esquecidosCacheLegado++;
    if (calculado.referenciaInvalida) {
      referenciasAusentes++;
      problemas.push({
        item_id: esquecido?.id || "",
        ingrediente_id: esquecido?.ingrediente_id || "",
        tipo: "esquecido_nome_id_divergente",
      });
    }
    if (calculado.semPreco && numero(esquecido?.quantidade_g) > 0) {
      itensSemPreco++;
      problemas.push({ item_id: esquecido?.id || "", tipo: "esquecido_sem_preco" });
    }
  }

  const custoTotal = custoIngredientes + custoInsumos + custoEsquecidos;
  const custoPorPorcao = porcoesEfetivas > 0 ? custoTotal / porcoesEfetivas : 0;

  return {
    modeloVersao: CUSTO_RECEITA_MODELO_VERSAO,
    fator: fatorSeguro,
    rendimento,
    porcoesEfetivas,
    custoIngredientes,
    custoInsumos,
    custoEsquecidos,
    custoTotal,
    custoPorPorcao,
    escala,
    insumosEscalados: insumosCalculados.itens,
    itensSemPreco,
    insumosSemPreco,
    referenciasAusentes,
    esquecidosCacheLegado,
    problemas,
    completo: itensSemPreco === 0 && insumosSemPreco === 0 && referenciasAusentes === 0 && esquecidosCacheLegado === 0,
  };
}

/**
 * Compatibilidade: quando não há contexto de ingredientes, usa o cache global
 * Receita.custo_total. Novos fluxos devem sempre fornecer ingredienteMap.
 */
export function custoPorGrama(receita, ingredientesReceita = [], contexto = null) {
  const rend = rendimentoEfetivo(receita, ingredientesReceita);
  if (rend <= 0) return 0;

  if (contexto?.ingredienteMap) {
    const calculado = calcularCustoReceitaCanonico({
      receita,
      ingredientesReceita,
      ingredienteMap: contexto.ingredienteMap,
      insumosReceita: contexto.insumosReceita || [],
      esquecidos: contexto.esquecidos || [],
      fator: 1,
      unidadesFinais: contexto.unidadesFinais || 0,
      numeroLotes: contexto.numeroLotes || 1,
    });
    return calculado.custoTotal / rend;
  }

  const custoTotalCache = numero(receita?.custo_total);
  return custoTotalCache > 0 ? custoTotalCache / rend : 0;
}

export function custoPorKgPronto(receita, ingredientesReceita = [], contexto = null) {
  return custoPorGrama(receita, ingredientesReceita, contexto) * 1000;
}

/**
 * Com contexto canônico, recalcula o lote na escala solicitada. Sem contexto,
 * mantém o fallback linear pelo cache global para consumidores ainda legados.
 */
export function custoEscalado(receita, ingredientesReceita = [], quantidadeGramas = 0, contexto = null) {
  const quantidade = numero(quantidadeGramas);
  if (quantidade <= 0) return 0;

  const rend = rendimentoEfetivo(receita, ingredientesReceita);
  if (rend <= 0) return 0;

  if (contexto?.ingredienteMap) {
    return calcularCustoReceitaCanonico({
      receita,
      ingredientesReceita,
      ingredienteMap: contexto.ingredienteMap,
      insumosReceita: contexto.insumosReceita || [],
      esquecidos: contexto.esquecidos || [],
      fator: quantidade / rend,
      unidadesFinais: contexto.unidadesFinais || 0,
      numeroLotes: contexto.numeroLotes || 1,
    }).custoTotal;
  }

  return custoPorGrama(receita, ingredientesReceita) * quantidade;
}
