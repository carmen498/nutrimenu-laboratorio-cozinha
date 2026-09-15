const CHAVE_ORIGEM = "base44_origem_cadastro";

// Espelho server-side do marcador de origem. O frontend grava no sessionStorage
// e envia como parâmetro em registrarAceiteTermos; o backend valida contra a
// lista fixa de valores permitidos.
export const ORIGEM_GUIA_ZR = "guia_zr";
export const ORIGEM_LABORATORIO = "laboratorio_cozinha";
export const ORIGEM_NAO_INFORMADO = "nao_informado";

export const ORIGENS_CADASTRO_VALIDAS = [ORIGEM_GUIA_ZR, ORIGEM_LABORATORIO];

export function normalizarOrigemCadastro(valor) {
  return ORIGENS_CADASTRO_VALIDAS.includes(valor) ? valor : null;
}