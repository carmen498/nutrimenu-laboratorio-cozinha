// Laboratório de Custos — motor econômico puro.
//
// Esta camada NÃO recalcula ingredientes. O custo técnico da Receita deve vir
// do Motor de Custos Canônico do Laboratório de Cozinha (custoReceita.js).
// Aqui entram somente rateio, mão de obra, custos adicionais e formação do preço.

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const naoNegativo = (valor) => Math.max(0, numero(valor));

export function somarDespesasAtivas(despesas = [], gruposIncluidos = null) {
  const grupos = Array.isArray(gruposIncluidos)
    ? new Set(gruposIncluidos)
    : null;

  return (despesas || []).reduce((total, despesa) => {
    if (!despesa || despesa.ativo === false) return total;
    if (grupos && !grupos.has(despesa.grupo)) return total;
    return total + naoNegativo(despesa.valor_mensal);
  }, 0);
}

export function calcularRateioMensal({ despesas = [], totalDespesasMensais = null, volumeMensal = 0, quantidadeProducao = 0, gruposIncluidos = null } = {}) {
  const totalMensal = totalDespesasMensais == null
    ? somarDespesasAtivas(despesas, gruposIncluidos)
    : naoNegativo(totalDespesasMensais);
  const volume = naoNegativo(volumeMensal);
  const quantidade = naoNegativo(quantidadeProducao);
  const custoPorUnidade = volume > 0 ? totalMensal / volume : 0;
  const custoDaProducao = custoPorUnidade * quantidade;

  return {
    totalMensal,
    volumeMensal: volume,
    quantidadeProducao: quantidade,
    custoPorUnidade,
    custoDaProducao,
    valido: volume > 0 || totalMensal === 0,
    diagnostico: totalMensal > 0 && volume <= 0 ? "volume_mensal_ausente" : null,
  };
}

export function calcularMaoDeObra({ horas = 0, valorHora = 0, valorDireto = null } = {}) {
  const h = naoNegativo(horas);
  const vh = naoNegativo(valorHora);
  const total = valorDireto == null ? h * vh : naoNegativo(valorDireto);
  return { horas: h, valorHora: vh, total, origem: valorDireto == null ? "horas_x_valor_hora" : "valor_direto" };
}

export function calcularMargemSobreVenda({ custoUnitario = 0, precoVendaUnitario = 0 } = {}) {
  const custo = naoNegativo(custoUnitario);
  const preco = naoNegativo(precoVendaUnitario);
  if (preco <= 0) return 0;
  return ((preco - custo) / preco) * 100;
}

export function calcularMarkupMultiplicador({ custoUnitario = 0, precoVendaUnitario = 0 } = {}) {
  const custo = naoNegativo(custoUnitario);
  const preco = naoNegativo(precoVendaUnitario);
  return custo > 0 ? preco / custo : 0;
}

export function calcularPrecoPorMarkup({ custoUnitario = 0, markup = 0 } = {}) {
  return naoNegativo(custoUnitario) * naoNegativo(markup);
}

export function calcularPrecoPorMargem({ custoUnitario = 0, margemDesejadaPct = 0, taxasVariaveisPct = 0, custoFixoAdicionalUnitario = 0 } = {}) {
  const custo = naoNegativo(custoUnitario) + naoNegativo(custoFixoAdicionalUnitario);
  const margem = naoNegativo(margemDesejadaPct);
  const taxas = naoNegativo(taxasVariaveisPct);
  const percentualTotal = margem + taxas;

  if (percentualTotal >= 100) {
    return { preco: 0, valido: false, diagnostico: "margem_e_taxas_maiores_ou_iguais_100" };
  }

  return {
    preco: custo / (1 - percentualTotal / 100),
    valido: true,
    diagnostico: null,
  };
}

/**
 * Consolida a camada econômica de uma produção.
 *
 * custoTecnicoProducao: valor já calculado pelo Laboratório de Cozinha na
 * escala solicitada (ingredientes + insumos técnicos + esquecidos, conforme
 * o motor canônico). Embalagem adicional aqui significa somente custo que
 * ainda NÃO esteja incluído na Receita, evitando dupla contagem.
 */
export function calcularCustoProducao({
  custoTecnicoProducao = 0,
  custoEmbalagemAdicional = 0,
  custoMaoObraDireta = 0,
  custoRateadoProducao = 0,
  outrosCustos = 0,
  quantidadeProduzida = 0,
  totalPorcoes = 0,
  precoVendaUnitario = 0,
} = {}) {
  const tecnico = naoNegativo(custoTecnicoProducao);
  const embalagem = naoNegativo(custoEmbalagemAdicional);
  const maoObra = naoNegativo(custoMaoObraDireta);
  const rateio = naoNegativo(custoRateadoProducao);
  const outros = naoNegativo(outrosCustos);
  const quantidade = naoNegativo(quantidadeProduzida);
  const porcoes = naoNegativo(totalPorcoes);
  const preco = naoNegativo(precoVendaUnitario);

  const custoTotal = tecnico + embalagem + maoObra + rateio + outros;
  const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0;
  const custoPorPorcao = porcoes > 0 ? custoTotal / porcoes : 0;
  const receitaVendaTotal = preco * quantidade;
  const lucroEstimadoTotal = receitaVendaTotal - custoTotal;
  const margemEstimada = calcularMargemSobreVenda({ custoUnitario, precoVendaUnitario: preco });
  const markupMultiplicador = calcularMarkupMultiplicador({ custoUnitario, precoVendaUnitario: preco });

  return {
    composicao: {
      custoTecnicoProducao: tecnico,
      custoEmbalagemAdicional: embalagem,
      custoMaoObraDireta: maoObra,
      custoRateadoProducao: rateio,
      outrosCustos: outros,
    },
    quantidadeProduzida: quantidade,
    totalPorcoes: porcoes,
    custoTotal,
    custoUnitario,
    custoPorPorcao,
    precoVendaUnitario: preco,
    receitaVendaTotal,
    lucroEstimadoTotal,
    margemEstimada,
    markupMultiplicador,
    valido: quantidade > 0,
    diagnosticos: quantidade > 0 ? [] : ["quantidade_produzida_ausente"],
  };
}

export function calcularLaboratorioCustos({
  custoTecnicoProducao = 0,
  despesas = [],
  totalDespesasMensais = null,
  volumeMensal = 0,
  quantidadeProduzida = 0,
  gruposRateio = null,
  horasMaoDeObra = 0,
  valorHora = 0,
  valorMaoDeObraDireto = null,
  custoEmbalagemAdicional = 0,
  outrosCustos = 0,
  totalPorcoes = 0,
  precoVendaUnitario = 0,
} = {}) {
  const rateio = calcularRateioMensal({
    despesas,
    totalDespesasMensais,
    volumeMensal,
    quantidadeProducao: quantidadeProduzida,
    gruposIncluidos: gruposRateio,
  });
  const maoDeObra = calcularMaoDeObra({
    horas: horasMaoDeObra,
    valorHora,
    valorDireto: valorMaoDeObraDireto,
  });
  const producao = calcularCustoProducao({
    custoTecnicoProducao,
    custoEmbalagemAdicional,
    custoMaoObraDireta: maoDeObra.total,
    custoRateadoProducao: rateio.custoDaProducao,
    outrosCustos,
    quantidadeProduzida,
    totalPorcoes,
    precoVendaUnitario,
  });

  const diagnosticos = [...producao.diagnosticos];
  if (rateio.diagnostico) diagnosticos.push(rateio.diagnostico);

  return {
    ...producao,
    rateio,
    maoDeObra,
    valido: producao.valido && rateio.valido,
    diagnosticos,
  };
}
