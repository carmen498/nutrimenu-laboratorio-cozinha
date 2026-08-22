// Motor canônico de rendimento técnico — Fases 5 e 8.
//
// Conceitos separados:
// - Peso Bruto (PB): compra/custo; considera FC e NÃO entra no fator de cocção.
// - Peso pré-preparo: soma líquida dos componentes que entram no preparo.
// - Peso pós-preparo (PDP): rendimento final medido da receita.
// - Fator de rendimento/cocção = PDP ÷ peso pré-preparo.
// - Fase 8: filhos de sub-receita com subreceita_cache=true servem a custo/compra,
//   mas NÃO substituem o peso da sub-receita pronta na entrada técnica da receita-pai.

const positivo = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const quaseIgual = (a, b, toleranciaRelativa = 0.005) => {
  const aa = positivo(a);
  const bb = positivo(b);
  if (!aa || !bb) return false;
  return Math.abs(aa - bb) / Math.max(aa, bb) <= toleranciaRelativa;
};

/**
 * Soma o peso/volume líquido que efetivamente entra no preparo.
 *
 * Fase 8:
 * - cache novo (subreceita_cache=true): conta o marcador/sub-receita pronta e
 *   ignora os ingredientes internos derivados;
 * - snapshot legado: preserva o comportamento histórico (conta filhos e ignora
 *   o marcador) até a sincronização/migração daquele vínculo.
 */
export function calcularPesoPrePreparo(receita, itens = []) {
  const porcoesBase = positivo(receita?.porcoes_base) || 1;
  const parentsComFilhos = new Set();
  const parentsComCacheNovo = new Set();

  (itens || []).forEach((item) => {
    if (!item?.subreceita_parent_id) return;
    parentsComFilhos.add(item.subreceita_parent_id);
    if (item.subreceita_cache === true && Number(item.subreceita_cache_versao) >= 2) {
      parentsComCacheNovo.add(item.subreceita_parent_id);
    }
  });

  return (itens || []).reduce((sum, item) => {
    if (!item || item.tipo === "grupo") return sum;

    if (item.subreceita_parent_id) {
      // Havendo cache Fase 8 para o marcador, TODOS os filhos daquele marcador
      // são derivados e ficam fora do pré-preparo da receita-pai. Isto também
      // protege contra dupla contagem em eventual sincronização parcial.
      if (parentsComCacheNovo.has(item.subreceita_parent_id)) return sum;
      return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
    }

    if (item.tipo === "subreceita") {
      if (parentsComCacheNovo.has(item.id)) {
        return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
      }
      if (parentsComFilhos.has(item.id)) return sum; // snapshot legado
    }

    return sum + positivo(item.quantidade_por_porcao) * porcoesBase;
  }, 0);
}

/**
 * Resolve o rendimento sem perder compatibilidade com rendimento_total.
 * O valor canônico é peso_pos_preparo_total. rendimento_total é fallback legado.
 * Quando nenhum PDP existe, o peso pré-preparo pode ser usado apenas como estimativa
 * operacional (custos/escala), nunca como medição confirmada.
 */
export function resolverRendimentoReceita(receita, itens = []) {
  const pesoPreAtual = calcularPesoPrePreparo(receita, itens);
  const pesoPreSnapshot = positivo(receita?.peso_pre_preparo_total);
  const pdpCanonico = positivo(receita?.peso_pos_preparo_total);
  const pdpLegado = positivo(receita?.rendimento_total);
  const pdpInformado = pdpCanonico || pdpLegado;

  let origem = receita?.rendimento_origem || null;
  let statusPersistido = receita?.rendimento_status || null;

  if (!origem) {
    origem = pdpCanonico ? "medido" : (pdpLegado ? "legado" : "estimado");
  }

  if (!statusPersistido) {
    statusPersistido = pdpCanonico
      ? "confirmado"
      : (pdpLegado ? "a_validar" : "pendente");
  }

  let status = statusPersistido;
  if (
    pdpInformado > 0 &&
    statusPersistido === "confirmado" &&
    pesoPreSnapshot > 0 &&
    pesoPreAtual > 0 &&
    !quaseIgual(pesoPreSnapshot, pesoPreAtual)
  ) {
    status = "a_validar";
  }

  const pdpEfetivo = pdpInformado || pesoPreAtual;
  const fatorRendimento = pesoPreAtual > 0 && pdpEfetivo > 0
    ? pdpEfetivo / pesoPreAtual
    : null;
  const variacaoPercentual = fatorRendimento == null
    ? null
    : (fatorRendimento - 1) * 100;

  let tipoVariacao = null;
  if (variacaoPercentual != null) {
    if (Math.abs(variacaoPercentual) < 0.05) tipoVariacao = "estavel";
    else tipoVariacao = variacaoPercentual > 0 ? "ganho" : "perda";
  }

  return {
    pesoPrePreparo: pesoPreAtual,
    pesoPrePreparoSnapshot: pesoPreSnapshot,
    pesoPosPreparoInformado: pdpInformado,
    pesoPosPreparoEfetivo: pdpEfetivo,
    rendimentoOrigem: origem,
    rendimentoStatusPersistido: statusPersistido,
    rendimentoStatus: status,
    rendimentoEstimado: pdpInformado <= 0,
    fatorRendimento,
    variacaoPercentual,
    tipoVariacao,
  };
}

/**
 * Payload para uma medição real de PDP.
 * Mantém rendimento_total sincronizado durante a transição.
 */
export function camposRendimentoMedido({ pesoPosPreparo, pesoPrePreparo, dataMedicao = new Date().toISOString() }) {
  const pdp = positivo(pesoPosPreparo);
  const pre = positivo(pesoPrePreparo);
  if (!pdp) return null;

  return {
    peso_pre_preparo_total: pre || 0,
    peso_pos_preparo_total: pdp,
    rendimento_total: pdp,
    rendimento_origem: "medido",
    rendimento_status: "confirmado",
    rendimento_medido_em: dataMedicao,
  };
}

/**
 * Payload para manter um valor existente/importado sem classificá-lo como medido.
 */
export function camposRendimentoAValidar({ pesoPosPreparo, pesoPrePreparo, origem = "legado" }) {
  const pdp = positivo(pesoPosPreparo);
  const pre = positivo(pesoPrePreparo);
  return {
    peso_pre_preparo_total: pre || 0,
    peso_pos_preparo_total: pdp || 0,
    rendimento_total: pdp || 0,
    rendimento_origem: origem,
    rendimento_status: pdp > 0 ? "a_validar" : "pendente",
  };
}

export function formatarStatusRendimento(status) {
  const labels = {
    confirmado: "Confirmado",
    estimado: "Estimado",
    a_validar: "A validar",
    pendente: "Pendente",
  };
  return labels[status] || "Pendente";
}
