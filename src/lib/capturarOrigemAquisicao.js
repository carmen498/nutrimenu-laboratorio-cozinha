import { base44 } from "@/api/base44Client";

const CHAVE = "base44_origem_aquisicao";

// NUNCA grava endereço IP. Usa apenas parâmetros UTM e document.referrer.
function classificarOrigem(utmSource, referrer) {
  const src = (utmSource || "").toLowerCase().trim();
  if (src) {
    if (src.includes("insta")) return "Instagram";
    if (src.includes("google")) return "Google";
    if (src.includes("face")) return "Facebook";
    if (src.includes("indic") || src.includes("ref") || src.includes("amig")) return "Indicação";
    return src.charAt(0).toUpperCase() + src.slice(1);
  }
  if (referrer) {
    let host = "";
    try { host = new URL(referrer).hostname.replace(/^www\./, ""); } catch { host = referrer; }
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("google")) return "Google";
    if (host.includes("facebook")) return "Facebook";
    if (host) return host;
  }
  return "Direto";
}

function hostnameSeguro(referrer) {
  try { return new URL(referrer).hostname.replace(/^www\./, ""); } catch { return referrer || ""; }
}

// Captura a origem de aquisição a partir da URL atual e do referrer.
// Retorna { raw, label }. raw = utm_source | hostname do referrer | "direto".
export function capturarOrigemAquisicao() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    const referrer = document.referrer;
    const label = classificarOrigem(utm, referrer);
    const raw = (utm || (referrer ? hostnameSeguro(referrer) : "") || "direto");
    return { raw, label };
  } catch {
    return { raw: "direto", label: "Direto" };
  }
}

// Marca a origem no sessionStorage antes do fluxo de cadastro (e-mail ou Google).
// Sobrevive ao redirecionamento do OAuth até a sessão ser estabelecida.
export function marcarOrigemAquisicao() {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(capturarOrigemAquisicao()));
  } catch {
    // sessionStorage indisponível (modo privado) — origem se perderá, mas
    // não bloqueia o fluxo de cadastro.
  }
}

// Consome e remove a origem marcada. Retorna null se não houver.
export function consumirOrigemAquisicao() {
  try {
    const v = sessionStorage.getItem(CHAVE);
    if (v) { sessionStorage.removeItem(CHAVE); return JSON.parse(v); }
  } catch {}
  return null;
}

// Persiste a origem de aquisição no usuário, uma única vez, no momento do
// cadastro. No-op em logins subsequentes (o marcador sessionStorage já foi
// consumido). Best-effort: falhas nunca impedem a entrada no app.
export function registrarOrigemAquisicaoSePendente() {
  const o = consumirOrigemAquisicao();
  if (!o) return Promise.resolve();
  return base44.auth.updateMe({
    origem_aquisicao_raw: o.raw,
    origem_aquisicao: o.label,
  }).catch(() => {});
}