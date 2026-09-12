export const MAX_PARCELAS_PADRAO = 12;
export const MAX_PARCELAS_RENOVACAO = 6;

// Espelho de base44/shared/guiaTecnicoZR.ts — o servidor revalida o parcelamento.
const MAX_PARCELAS_ZR = {
  zr_tin: 3,
  zr_tin_renovacao: 3,
  zr_full: 6,
  zr_full_renovacao: 6,
  zr_arquitetura: 2,
  zr_arquitetura_renovacao: 2,
};

export function maxParcelasPlano(plano) {
  if (MAX_PARCELAS_ZR[plano]) return MAX_PARCELAS_ZR[plano];
  if (plano === "custos_mensal") return 1;
  if (plano === "custos_anual") return 6;
  return plano === "renovacao" ? MAX_PARCELAS_RENOVACAO : MAX_PARCELAS_PADRAO;
}