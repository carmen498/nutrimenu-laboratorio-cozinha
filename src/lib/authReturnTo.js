// Shared by the auth pages (Login, Register, and any page that resumes a flow
// after sign-in, e.g. the MCP OAuth consent page). Keep the redirect
// validation in one place — it is security-sensitive and easy to drift.

// Resolve ?returnTo= to a safe same-origin path, else "/".
//
// The same-origin check alone is not enough: a value like /.//evil.com or
// /\evil.com parses same-origin but normalizes to a protocol-relative
// //evil.com when assigned to location.href — an open redirect. So require the
// resolved path to be exactly one leading slash (no "//" prefix, no backslash).
export const RETURN_TO_MAX_AGE_MS = 30 * 60 * 1000;

export function serializeReturnTo(value, savedAt = Date.now()) {
  return JSON.stringify({ value, savedAt });
}

export function readFreshReturnTo(raw, now = Date.now()) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const age = now - Number(parsed?.savedAt);
    if (typeof parsed?.value !== "string" || !Number.isFinite(age) || age < 0 || age > RETURN_TO_MAX_AGE_MS) {
      return null;
    }
    return parsed.value;
  } catch {
    // Compatibilidade: o formato antigo era uma string pura. Ele é tratado
    // como ausente para não herdar uma intenção sem carimbo de hora.
    return null;
  }
}

export function resolveRegisterReturnTo({
  hasNewDestination,
  newDestination,
  persistedRaw,
  fallback,
  now = Date.now(),
}) {
  if (hasNewDestination) {
    return { destination: newDestination, action: "persist" };
  }

  const persisted = readFreshReturnTo(persistedRaw, now);
  if (persisted) {
    return { destination: persisted, action: "keep" };
  }

  return { destination: fallback, action: "clear" };
}

export function safeReturnTo() {
  const params = new URLSearchParams(window.location.search);
  // "returnTo" is this app's own param name; "from_url" is what the SDK's
  // redirectToLogin() appends automatically when it sends an unauthenticated
  // visitor to /login — support both so a plain email link back to the app
  // (which triggers that redirect) still returns the user to where they landed.
  // Falls back to sessionStorage: index.html strips the param from the address
  // bar as soon as the page loads (before React mounts) and stashes the raw
  // value there, so by the time this runs the URL itself may already be clean.
  const storedRaw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("base44_pending_return_to") : null;
  const stored = readFreshReturnTo(storedRaw);
  const raw = params.get("returnTo") || params.get("from_url") || stored;
  if (storedRaw) sessionStorage.removeItem("base44_pending_return_to");
  if (!raw) return "/";
  // Aceita somente caminho interno literal. URLs absolutas, inclusive da mesma
  // origem, não fazem parte do contrato e são rejeitadas antes do parse.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    // Strip app-bootstrap params: app-params.js persists these from the URL into
    // localStorage before the SDK initializes, so a crafted returnTo could
    // otherwise poison the freshly issued session — repointing the app at an
    // attacker's backend (app_base_url/app_id/functions_version) or overwriting
    // the token. Normal app-flow params (e.g. the OAuth consent ctx) are kept.
    // The full app-params.js bootstrap set (src/lib/app-params.js) — any of
    // these in a crafted returnTo would be persisted at next load.
    for (const p of ["access_token", "clear_access_token", "app_id", "app_base_url", "functions_version", "from_url"]) {
      url.searchParams.delete(p);
    }
    const path = url.pathname + url.search;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
    return path;
  } catch {
    return "/";
  }
}