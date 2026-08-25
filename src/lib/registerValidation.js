export function validarTelefoneBrasileiro(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (!/^\d{10,11}$/.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const ddd = Number(digits.slice(0, 2));
  return ddd >= 11 && ddd <= 99;
}

export function validarSenhaForte(value) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export function mensagemErroCadastro(error, fallback) {
  const raw = String(error?.response?.data?.error || error?.message || "").toLowerCase();
  if (raw.includes("already") || raw.includes("exist")) return "Este e-mail já possui uma conta.";
  if (raw.includes("expired")) return "O código expirou. Solicite um novo código.";
  if (raw.includes("otp") || raw.includes("code") || raw.includes("código")) return "Código inválido. Confira os seis dígitos e tente novamente.";
  if (raw.includes("rate") || raw.includes("too many")) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  return fallback;
}