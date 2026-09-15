export const MENSAGEM_ERRO_AUTENTICACAO_GENERICA =
  "Não foi possível concluir. Tente novamente em instantes.";

function textoErro(error) {
  return [
    error?.response?.data?.code,
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.code,
    error?.message,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function traduzirErroAutenticacao(error) {
  const raw = textoErro(error);
  const status = error?.response?.status ?? error?.status;

  if (/already|exist|registered|user_exists|email_exists/.test(raw)) {
    return { tipo: "email_ja_cadastrado", mensagem: "Este e-mail já possui uma conta." };
  }
  if (/expired/.test(raw) && /otp|code|verification|código/.test(raw)) {
    return { tipo: "codigo_expirado", mensagem: "O código expirou. Solicite um novo código." };
  }
  if (/invalid|incorrect|wrong/.test(raw) && /otp|code|verification|código/.test(raw)) {
    return { tipo: "codigo_invalido", mensagem: "Código inválido. Confira os seis dígitos e tente novamente." };
  }
  if (/weak|password.*short|password.*length|too short/.test(raw)) {
    return { tipo: "senha_fraca", mensagem: "Crie uma senha com pelo menos 8 caracteres, incluindo maiúscula, minúscula e número." };
  }
  if (/user not found|account not found|no user|invalid credentials|invalid email or password|wrong password/.test(raw)) {
    return { tipo: "credenciais_invalidas", mensagem: "E-mail ou senha incorretos." };
  }
  if (/invalid.*email|email.*invalid|malformed.*email/.test(raw)) {
    return { tipo: "email_invalido", mensagem: "Informe um endereço de e-mail válido." };
  }
  if (status === 429 || /too many|rate.?limit|attempts|temporarily blocked/.test(raw)) {
    return { tipo: "muitas_tentativas", mensagem: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }
  if (/token/.test(raw) && /invalid|expired|used/.test(raw)) {
    return { tipo: "link_invalido", mensagem: "Este link está inválido ou expirado. Solicite um novo." };
  }
  if (/network|fetch|timeout|timed out|offline/.test(raw)) {
    return { tipo: "conexao", mensagem: "Não foi possível conectar agora. Verifique sua internet e tente novamente." };
  }
  if (/unauthorized|forbidden|not authorized/.test(raw) || status === 401 || status === 403) {
    return { tipo: "nao_autorizado", mensagem: "Não foi possível validar seus dados de acesso." };
  }

  return { tipo: "desconhecido", mensagem: MENSAGEM_ERRO_AUTENTICACAO_GENERICA };
}
