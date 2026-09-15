const ROTAS_AUTENTICACAO = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

function destinoInterno(raw, fallback = "/app") {
  const value = String(raw || "");
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

// Única fábrica de navegação entre telas de autenticação.
// returnTo acompanha todas as transições; e-mail só é incluído quando a
// transição explicitamente o pede. Nunca transporta nome, telefone ou senha.
export function navegarAutenticacao(rota, { returnTo = "/app", email = "" } = {}) {
  if (!ROTAS_AUTENTICACAO.has(rota)) throw new Error("Rota de autenticação inválida.");
  const params = new URLSearchParams();
  params.set("returnTo", destinoInterno(returnTo));
  const emailLimpo = String(email || "").trim().toLowerCase();
  if (emailLimpo) params.set("email", emailLimpo);
  return `${rota}?${params.toString()}`;
}
