const CHAVE_ORIGEM = "base44_origem_cadastro";

// A ponte /entrar-no-guia é o único marcador confiável de origem Guia ZR.
// Parâmetros de URL se perdem em redirecionamentos; sessionStorage persiste
// até o pós-OTP, onde registrarAceiteTermos consome e grava no User.
export const ORIGEM_GUIA_ZR = "guia_zr";
export const ORIGEM_LABORATORIO = "laboratorio_cozinha";
export const ORIGEM_NAO_INFORMADO = "nao_informado";

export function marcarOrigemCadastro(origem) {
  try {
    sessionStorage.setItem(CHAVE_ORIGEM, origem);
  } catch {
    // sessionStorage indisponível (modo privado) — origem se perderá, mas
    // não bloqueia o fluxo de cadastro.
  }
}

export function consumirOrigemCadastro() {
  try {
    const valor = sessionStorage.getItem(CHAVE_ORIGEM);
    if (valor) sessionStorage.removeItem(CHAVE_ORIGEM);
    return valor;
  } catch {
    return null;
  }
}