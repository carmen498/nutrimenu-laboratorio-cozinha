import assert from "node:assert/strict";

const ORIGIN = process.env.AUTH_PROD_ORIGIN || "https://laboratoriodecozinha.com.br";
const APP_ID = process.env.AUTH_PROD_APP_ID || "6a2b263c4c1cb1e47d54d8b7";

async function post(path, body) {
  const response = await fetch(`${ORIGIN}/api/apps/${APP_ID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data, text };
}

for (const path of ["/login", "/register", "/forgot-password", "/reset-password", "/reset-password?token=phase9-invalid-token"]) {
  const response = await fetch(`${ORIGIN}${path}`, { redirect: "manual" });
  assert.equal(response.status, 200, `${path} não responde 200 em produção`);
}

const unknownEmail = `fase9-naoexiste-${Date.now()}@example.invalid`;
const resetUnknown = await post("/auth/reset-password-request", { email: unknownEmail });
assert.equal(resetUnknown.response.status, 200, "reset-password-request não preserva resposta neutra para conta inexistente");
assert.match(String(resetUnknown.data?.message || ""), /if an account exists/i, "mensagem de reset não é neutra");

const invalidReset = await post("/auth/reset-password", {
  reset_token: "phase9-invalid-token",
  new_password: "temporary-test-value",
});
assert.ok(invalidReset.response.status >= 400, "token inválido de reset foi aceito");
assert.match(String(invalidReset.data?.message || invalidReset.data?.detail || ""), /invalid|expired/i, "token inválido não retorna erro apropriado");

const badLogin = await post("/auth/login", {
  email: unknownEmail,
  password: "known-wrong-value",
});
assert.ok(badLogin.response.status >= 400, "login de conta inexistente foi aceito");
assert.match(String(badLogin.data?.message || badLogin.data?.detail || ""), /invalid email or password/i, "login inválido revela detalhe inesperado");

const oauthStart = await fetch(
  `${ORIGIN}/api/apps/auth/login?app_id=${APP_ID}&from_url=${encodeURIComponent(`${ORIGIN}/app`)}`,
  { redirect: "manual" },
);
assert.ok([302, 303, 307, 308].includes(oauthStart.status), `início OAuth respondeu ${oauthStart.status}`);
const firstLocation = oauthStart.headers.get("location");
assert.ok(firstLocation, "início OAuth não retornou Location");
const firstUrl = new URL(firstLocation);
assert.equal(firstUrl.host, "app.base44.com", "primeiro hop OAuth não foi para Base44 auth");

const oauthProvider = await fetch(firstLocation, { redirect: "manual" });
assert.ok([302, 303, 307, 308].includes(oauthProvider.status), `hop Base44→Google respondeu ${oauthProvider.status}`);
const providerLocation = oauthProvider.headers.get("location");
assert.ok(providerLocation, "OAuth não retornou Location do provedor");
const providerUrl = new URL(providerLocation);
assert.equal(providerUrl.host, "accounts.google.com", "OAuth não chegou ao Google");
assert.equal(providerUrl.searchParams.get("redirect_uri"), "https://app.base44.com/api/apps/auth/callback", "callback técnico Google/Base44 inesperado");
assert.ok(providerUrl.searchParams.get("state"), "OAuth Google sem state");

console.log("OK: smoke de autenticação em produção aprovado — rotas, reset neutro, token inválido e cadeia OAuth.");
