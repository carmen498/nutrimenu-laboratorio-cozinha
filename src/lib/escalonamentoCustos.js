// Fase 11.1 — Escalonamento canônico de custos.
//
// Fonte única das regras de escala para insumos/embalagens. A quantidade
// persistida continua sendo a referência/base; a quantidade/custo de produção
// é sempre derivada em tempo de cálculo.

export const ESCALONAMENTO_CUSTO_MODELO_VERSAO = 2;

export const COMPORTAMENTOS_CUSTO = Object.freeze({
  POR_LOTE: "por_lote",
  PROPORCIONAL: "proporcional",
  POR_UNIDADE: "por_unidade",
});

export const COMPORTAMENTO_CUSTO_LABELS = Object.freeze({
  por_lote: "Por lote",
  proporcional: "Proporcional",
  por_unidade: "Por unidade",
});

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const positivoOu = (valor, fallback) => numero(valor) > 0 ? numero(valor) : fallback;

export function normalizarComportamentoCusto(valor) {
  return Object.values(COMPORTAMENTOS_CUSTO).includes(valor)
    ? valor
    : COMPORTAMENTOS_CUSTO.POR_LOTE;
}

/**
 * Constrói a escala operacional de uma receita.
 * `unidadesFinais` é a quantidade de porções/unidades finais quando conhecida.
 * Quando ausente, deriva de rendimento/per capita; como último fallback usa
 * porções-base × fator.
 */
export function criarEscalaReceitaCanonica({
  fator = 1,
  rendimentoBase = 0,
  porcoesBase = 1,
  perCapita = 0,
  unidadesFinais = 0,
  numeroLotes = 1,
} = {}) {
  const fatorSeguro = positivoOu(fator, 1);
  const rendimentoBaseSeguro = Math.max(0, numero(rendimentoBase));
  const porcoesBaseSeguro = positivoOu(porcoesBase, 1);
  const rendimentoAlvo = rendimentoBaseSeguro * fatorSeguro;
  const unidadesInformadas = numero(unidadesFinais);
  const perCapitaSeguro = numero(perCapita);
  const unidadesCalculadas = unidadesInformadas > 0
    ? unidadesInformadas
    : (perCapitaSeguro > 0 && rendimentoAlvo > 0
      ? rendimentoAlvo / perCapitaSeguro
      : porcoesBaseSeguro * fatorSeguro);

  return {
    fator: fatorSeguro,
    rendimentoBase: rendimentoBaseSeguro,
    rendimentoAlvo,
    porcoesBase: porcoesBaseSeguro,
    unidadesFinais: unidadesCalculadas,
    numeroLotes: positivoOu(numeroLotes, 1),
  };
}

/**
 * Regra de InsumoReceita:
 * - por_lote: quantidade fixa por execução/lote (não acompanha o fator);
 * - proporcional: quantidade da receita-base × fator;
 * - por_unidade: quantidade cadastrada por unidade final × unidades finais.
 */
export function escalarInsumoReceita(insumo, escala = {}) {
  const comportamento = normalizarComportamentoCusto(insumo?.comportamento_custo);
  const quantidadeBase = Math.max(0, numero(insumo?.quantidade));
  const custoUnitario = Math.max(0, numero(insumo?.custo_unitario));
  const fator = positivoOu(escala?.fator, 1);
  const unidadesFinais = Math.max(0, numero(escala?.unidadesFinais));
  const numeroLotes = positivoOu(escala?.numeroLotes, 1);

  let quantidadeEscalada = quantidadeBase;
  if (comportamento === COMPORTAMENTOS_CUSTO.PROPORCIONAL) {
    quantidadeEscalada = quantidadeBase * fator;
  } else if (comportamento === COMPORTAMENTOS_CUSTO.POR_UNIDADE) {
    quantidadeEscalada = quantidadeBase * unidadesFinais;
  } else {
    quantidadeEscalada = quantidadeBase * numeroLotes;
  }

  return {
    comportamento,
    quantidadeBase,
    quantidadeEscalada,
    custoUnitario,
    custoEscalado: quantidadeEscalada * custoUnitario,
    semPreco: quantidadeEscalada > 0 && custoUnitario <= 0,
  };
}

export function calcularInsumosReceitaEscalados(insumos = [], escala = {}) {
  const itens = (insumos || []).map((insumo) => ({
    ...insumo,
    ...escalarInsumoReceita(insumo, escala),
  }));
  return {
    itens,
    custoTotal: itens.reduce((s, item) => s + item.custoEscalado, 0),
    itensSemPreco: itens.filter((item) => item.semPreco).length,
  };
}

/**
 * Regra dos insumos diretamente ligados ao cardápio:
 * - por_lote: quantidade/custo fixos do cardápio;
 * - proporcional: varia com unidadesFinais / escala_base_unidades;
 * - por_unidade: quantidade cadastrada por unidade final × unidadesFinais.
 */
export function escalarInsumoCardapio(insumo, { unidadesFinais = 1 } = {}) {
  const comportamento = normalizarComportamentoCusto(insumo?.comportamento_custo);
  const quantidadeBase = Math.max(0, numero(insumo?.quantidade));
  const custoUnitario = Math.max(0, numero(insumo?.custo_unitario));
  const unidades = positivoOu(unidadesFinais, 1);
  const escalaBaseUnidades = positivoOu(insumo?.escala_base_unidades, unidades);

  let quantidadeEscalada = quantidadeBase;
  if (comportamento === COMPORTAMENTOS_CUSTO.PROPORCIONAL) {
    quantidadeEscalada = quantidadeBase * (unidades / escalaBaseUnidades);
  } else if (comportamento === COMPORTAMENTOS_CUSTO.POR_UNIDADE) {
    quantidadeEscalada = quantidadeBase * unidades;
  }

  return {
    comportamento,
    quantidadeBase,
    quantidadeEscalada,
    custoUnitario,
    custoEscalado: quantidadeEscalada * custoUnitario,
    escalaBaseUnidades,
    semPreco: quantidadeEscalada > 0 && custoUnitario <= 0,
  };
}

export function calcularInsumosCardapioEscalados(insumos = [], unidadesFinais = 1) {
  const itens = (insumos || []).map((insumo) => ({
    ...insumo,
    ...escalarInsumoCardapio(insumo, { unidadesFinais }),
  }));
  return {
    itens,
    custoTotal: itens.reduce((s, item) => s + item.custoEscalado, 0),
    itensSemPreco: itens.filter((item) => item.semPreco).length,
  };
}

/**
 * Converte uma quantidade exibida na escala atual de volta para a quantidade
 * canônica armazenada em InsumoReceita.
 */
export function quantidadeBaseInsumoReceita(insumo, quantidadeEscalada, escala = {}) {
  const comportamento = normalizarComportamentoCusto(insumo?.comportamento_custo);
  const atual = Math.max(0, numero(quantidadeEscalada));
  if (comportamento === COMPORTAMENTOS_CUSTO.PROPORCIONAL) {
    const fator = positivoOu(escala?.fator, 1);
    return atual / fator;
  }
  if (comportamento === COMPORTAMENTOS_CUSTO.POR_UNIDADE) {
    const unidades = positivoOu(escala?.unidadesFinais, 1);
    return atual / unidades;
  }
  const lotes = positivoOu(escala?.numeroLotes, 1);
  return atual / lotes;
}
