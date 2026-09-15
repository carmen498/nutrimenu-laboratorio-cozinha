export function limparSensivel(valor) {
  let texto = String(valor || "").slice(0, 2000);
  texto = texto
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REMOVIDO]")
    .replace(/\b(otp|one[_ -]?time[_ -]?code|password|senha|passphrase|token|access[_ -]?token|refresh[_ -]?token|session|sessao|cookie|authorization|credential|credencial|secret|api[_ -]?key)\b["']?(?:\s*[:=]\s*["']?|\s+)[^\s,;}\]"']+/gi, "$1=[REMOVIDO]")
    .replace(/\b\d{4,8}\b/g, "[CÓDIGO REMOVIDO]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b/g, "[TOKEN REMOVIDO]")
    .replace(/[A-Fa-f0-9]{32,}/g, "[CREDENCIAL REMOVIDA]")
    .replace(/[A-Za-z0-9_-]{48,}/g, "[CREDENCIAL REMOVIDA]");
  return texto.replace(/\s+/g, " ").trim().slice(0, 500);
}
