import { resolverPerCapitaReceita } from "@/lib/perCapitaReceita";
import { resolverRendimentoReceita } from "@/lib/rendimentoReceita";

const positivo = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function calcularMetricasReceita({
  receita,
  itens = [],
  perCapitaUsuario = 0,
  perCapitaAlvo = 0,
  permitirPerCapitaSugerido = false,
  pesoPosPreparoAlvo = 0,
  porcoesAlvo = 0,
  fator = 0,
} = {}) {
  const rendimento = resolverRendimentoReceita(receita, itens);
  const perCapita = resolverPerCapitaReceita(receita, perCapitaUsuario);
  const pc = positivo(perCapitaAlvo)
    || perCapita.valorCalculo
    || (permitirPerCapitaSugerido ? perCapita.valorExibicao : 0);
  const rendimentoBase = rendimento.pesoPosPreparoEfetivo || 0;
  const porcoesSolicitadas = positivo(porcoesAlvo);
  const pesoSolicitado = positivo(pesoPosPreparoAlvo);
  const fatorSolicitado = positivo(fator);

  const pesoPosPreparo = porcoesSolicitadas && pc
    ? porcoesSolicitadas * pc
    : pesoSolicitado || (fatorSolicitado && rendimentoBase ? rendimentoBase * fatorSolicitado : rendimentoBase);
  const porcoes = pc > 0 && pesoPosPreparo > 0 ? pesoPosPreparo / pc : 0;
  const fatorEscala = rendimentoBase > 0 && pesoPosPreparo > 0
    ? pesoPosPreparo / rendimentoBase
    : fatorSolicitado || 1;

  return {
    rendimento,
    perCapita,
    pc,
    rendimentoBase,
    pesoPosPreparo,
    porcoes,
    fator: fatorEscala,
  };
}