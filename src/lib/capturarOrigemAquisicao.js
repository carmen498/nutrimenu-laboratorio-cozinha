import { base44 } from "@/api/base44Client";

// Primeiro toque: a origem de aquisição é capturada na PRIMEIRA página que o
// visitante abre e guardada no localStorage do navegador. Uma vez gravada, não
// é mais tocada — nem navegação interna, nem novo cadastro, nem login a
// sobrescreve. NUNCA grava endereço IP: usa apenas parâmetros UTM e
// document.referrer (ignorando referrer do próprio domínio).

const CHAVE_PRIMEIRO_TOQUE = "base44_origem_primeiro_toque";
const CHAVE_PERSISTIDA = "base44_origem_aquisicao_persistida";

function ehDominioProprio(referrer) {
  if (!referrer) return true;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    const atual = window.location.hostname.replace(/^www\./, "");
    return host === atual;
  } catch {
    return false;
  }
}

function hostnameSeguro(referrer) {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer || "";
  }
}

function classificarOrigem(utmSource, referrer) {
  const src = (utmSource || "").toLowerCase().trim();
  if (src) {
    if (src.includes("insta")) return "Instagram";
    if (src.includes("google")) return "Google";
    if (src.includes("face")) return "Facebook";
    if (src.includes("indic") || src.includes("ref") || src.includes("amig")) return "Indicação";
    return src.charAt(0).toUpperCase() + src.slice(1);
  }
  if (referrer && !ehDominioProprio(referrer)) {
    const host = hostnameSeguro(referrer);
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("google")) return "Google";
    if (host.includes("facebook")) return "Facebook";
    if (host) return host;
  }
  return "Direto";
}

// Captura a origem do primeiro toque a partir da URL atual e do referrer.
function capturarPrimeiroToque() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const referrer = document.referrer;
    const label = classificarOrigem(utmSource, referrer);
    let raw;
    if (utmSource) raw = utmSource;
    else if (referrer && !ehDominioProprio(referrer)) raw = hostnameSeguro(referrer);
    else raw = "direto";
    return { raw, label, capturado_em: new Date().toISOString() };
  } catch {
    return { raw: "direto", label: "Direto", capturado_em: new Date().toISOString() };
  }
}

// Chamado na PRIMEIRA página que qualquer visitante abre (entry point do app).
// Se já existe origem guardada no localStorage, não toca — é o primeiro toque,
// e ele não se repete. Se não existe, guarda agora (utm_source | referrer
// externo | "direto") junto da data.
export function garantirPrimeiroToque() {
  try {
    if (localStorage.getItem(CHAVE_PRIMEIRO_TOQUE)) return;
    localStorage.setItem(CHAVE_PRIMEIRO_TOQUE, JSON.stringify(capturarPrimeiroToque()));
  } catch {
    // localStorage indisponível (modo privado) — origem se perderá, mas não
    // bloqueia a navegação nem o cadastro.
  }
}

// Lê a origem do primeiro toque guardada no localStorage. Retorna null se não
// houver nada guardado.
export function lerOrigemAquisicao() {
  try {
    const v = localStorage.getItem(CHAVE_PRIMEIRO_TOQUE);
    if (v) return JSON.parse(v);
  } catch {}
  return null;
}

// Persiste a origem de aquisição no usuário, uma única vez, no momento do
// cadastro. Lê o primeiro toque do localStorage e grava em
// origem_aquisicao_raw/origem_aquisicao. Se não houver nada guardado, grava
// "direto". No-op se já foi persistida (flag no localStorage). Best-effort:
// falhas nunca impedem a entrada no app.
export function registrarOrigemAquisicaoSePendente() {
  try {
    if (localStorage.getItem(CHAVE_PERSISTIDA)) return Promise.resolve();
  } catch {
    return Promise.resolve();
  }
  const o = lerOrigemAquisicao();
  const raw = o?.raw || "direto";
  const label = o?.label || "Direto";
  return base44.auth
    .updateMe({ origem_aquisicao_raw: raw, origem_aquisicao: label })
    .then(() => {
      try {
        localStorage.setItem(CHAVE_PERSISTIDA, "1");
      } catch {}
    })
    .catch(() => {});
}