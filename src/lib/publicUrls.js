export const PUBLIC_SITE_ORIGIN = "https://laboratoriodecozinha.com.br";
export const APP_SITE_ORIGIN = "https://app.laboratoriodecozinha.com.br";

export const APP_SITE_URLS = Object.freeze({
  root: `${APP_SITE_ORIGIN}/`,
  appHome: `${APP_SITE_ORIGIN}/app`,
  login: `${APP_SITE_ORIGIN}/login`,
  register: `${APP_SITE_ORIGIN}/register`,
  plans: `${APP_SITE_ORIGIN}/planos`,
  resetPassword: `${APP_SITE_ORIGIN}/reset-password`,
});

const LEGACY_APP_HOSTS = new Set(["laborat-rio-de-cozinha.base44.app"]);
const PUBLIC_SITE_PATHS = new Set(["/", "/landing", "/termos", "/privacidade", "/sobre", "/contato", "/produto"]);

export function isPublicSiteHost(hostname = window.location.hostname) {
  return hostname === "laboratoriodecozinha.com.br" || hostname === "www.laboratoriodecozinha.com.br";
}

export function currentInternalPath(location = window.location) {
  const path = `${location.pathname || "/"}${location.search || ""}${location.hash || ""}`;
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/app";
}

export function getCanonicalAppRedirectUrl(location = window.location) {
  const hostname = location.hostname;
  const pathname = location.pathname || "/";
  const veioDoHostAntigo = LEGACY_APP_HOSTS.has(hostname);
  const rotaDoAppNoSitePublico = isPublicSiteHost(hostname) && !PUBLIC_SITE_PATHS.has(pathname);

  if (!veioDoHostAntigo && !rotaDoAppNoSitePublico) return null;
  return `${APP_SITE_ORIGIN}${currentInternalPath(location)}`;
}

export function buildAppLoginUrl(returnTo) {
  if (!returnTo || returnTo === "/login") return APP_SITE_URLS.login;
  return `${APP_SITE_URLS.login}?returnTo=${encodeURIComponent(returnTo)}`;
}