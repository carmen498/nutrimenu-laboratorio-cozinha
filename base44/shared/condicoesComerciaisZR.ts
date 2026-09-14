export const CHAVE_DESCONTO_PIX_ZR = "guia_zr_desconto_pix_pct";
export const CHAVE_PARCELAS_SEM_JUROS_ZR = "guia_zr_parcelas_sem_juros";

function lerNumero(registros: any[], chave: string): number {
  const registro = (registros || []).find((item: any) => item.chave === chave);
  const valor = Number(registro?.valor);
  if (!Number.isFinite(valor)) throw new Error(`Configuração ausente ou inválida: ${chave}`);
  return valor;
}

export async function lerCondicoesComerciaisZR(base44: any) {
  const registros = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({
    chave: { $in: [CHAVE_DESCONTO_PIX_ZR, CHAVE_PARCELAS_SEM_JUROS_ZR] },
  });
  const descontoPix = lerNumero(registros, CHAVE_DESCONTO_PIX_ZR);
  const parcelasSemJuros = lerNumero(registros, CHAVE_PARCELAS_SEM_JUROS_ZR);
  if (descontoPix < 0 || descontoPix >= 100) throw new Error("Desconto PIX do Guia ZR inválido");
  if (!Number.isInteger(parcelasSemJuros) || parcelasSemJuros < 1 || parcelasSemJuros > 12) {
    throw new Error("Parcelamento sem juros do Guia ZR inválido");
  }
  return { descontoPix, parcelasSemJuros };
}

export function aplicarDescontoPixParaBaixo(valor: number, percentual: number): number {
  const centavos = Math.round(Number(valor) * 100);
  const percentualCentésimos = Math.round(Number(percentual) * 100);
  return Math.floor((centavos * (10000 - percentualCentésimos)) / 10000) / 100;
}
