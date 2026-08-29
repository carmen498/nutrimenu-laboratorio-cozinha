export const MAX_PARCELAS_PADRAO = 12;
export const MAX_PARCELAS_RENOVACAO = 6;

export function maxParcelasPlano(plano: string): number {
  if (plano === "custos_mensal") return 1;
  if (plano === "custos_anual") return 6;
  return plano === "renovacao" ? MAX_PARCELAS_RENOVACAO : MAX_PARCELAS_PADRAO;
}

export function validarParcelamentoPlano(plano: string, parcelas: unknown) {
  const numero = Number(parcelas);
  const maximo = maxParcelasPlano(plano);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= maximo;
  return { valido, parcelas: numero, maximo };
}
