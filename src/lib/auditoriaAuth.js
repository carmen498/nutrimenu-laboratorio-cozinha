import { base44 } from "@/api/base44Client";

function extrairErroOriginal(error) {
  return [
    error?.response?.data?.code,
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.code,
    error?.message,
  ].filter(Boolean).join(" | ").slice(0, 1000);
}

// Dispare e esqueça: nunca aguarda, nunca propaga falha e nunca interfere
// no fluxo de autenticação. O servidor sanitiza novamente antes de gravar.
export function auditarErroDesconhecido({ traduzido, error, tela, email }) {
  if (traduzido?.tipo !== "desconhecido") return;
  const erro = extrairErroOriginal(error);
  if (!erro) return;
  void base44.functions.invoke("auditarErroAutenticacao", {
    tela,
    email: String(email || "").trim().toLowerCase(),
    erro,
  }).catch(() => {});
}
