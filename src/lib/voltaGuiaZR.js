// Whitelist fechada de origens permitidas para o parâmetro ?volta= da ponte
// /entrar-no-guia. A comparação é da ORIGEM COMPLETA (protocol + host + porta)
// — nunca "começa com" nem "contém" — para impedir que subdomínios falsos
// passem (ex.: zr.nutrimenu.com.br.site-falso.com).
const ORIGENS_PERMITIDAS = new Set([
  "https://zr.nutrimenu.com.br",
  // Prévia controlada do PR #126. Permanecem origens completas e explícitas;
  // nenhum curinga ou domínio arbitrário da Vercel é aceito.
  "https://nutrimenu-zr-git-feat-convite-lancamento-5-dias-carmen498.vercel.app",
  "https://nutrimenu-pgj8jrlgu-carmen498.vercel.app",
]);

const DESTINO_PADRAO = "https://zr.nutrimenu.com.br/entrar";

export function validarVolta(volta) {
  if (typeof volta !== "string" || !volta.startsWith("https://")) return DESTINO_PADRAO;
  try {
    const url = new URL(volta);
    if (url.protocol !== "https:") return DESTINO_PADRAO;
    // Compara a origem completa — nunca substring.
    const origin = `${url.protocol}//${url.host}`;
    if (!ORIGENS_PERMITIDAS.has(origin)) return DESTINO_PADRAO;
    // Descarta qualquer fragmento pré-existente antes de anexar o token.
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return DESTINO_PADRAO;
  }
}