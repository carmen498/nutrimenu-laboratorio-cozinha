export const MAX_PARCELAS_PADRAO = 12;
export const MAX_PARCELAS_RENOVACAO = 6;

export function maxParcelasPlano(plano) {
  return plano === "renovacao" ? MAX_PARCELAS_RENOVACAO : MAX_PARCELAS_PADRAO;
}
