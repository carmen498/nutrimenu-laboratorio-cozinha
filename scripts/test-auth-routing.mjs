import assert from "node:assert/strict";
import fs from "node:fs";
import {
  RETURN_TO_MAX_AGE_MS,
  resolveRegisterReturnTo,
  safeReturnTo,
  serializeReturnTo,
} from "../src/lib/authReturnTo.js";
import { APP_SITE_URLS, buildAppLoginUrl, getCanonicalAppRedirectUrl } from "../src/lib/publicUrls.js";

const ORIGIN = "https://app.laboratoriodecozinha.com.br";

function storageMock(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function evaluate(search = "", stored = null, { savedAt = Date.now(), legacy = false } = {}) {
  const storedValue = legacy ? stored : serializeReturnTo(stored, savedAt);
  globalThis.sessionStorage = storageMock(stored ? { base44_pending_return_to: storedValue } : {});
  globalThis.window = {
    location: {
      search,
      origin: ORIGIN,
    },
  };
  return safeReturnTo();
}

assert.equal(evaluate(""), "/", "sem returnTo deve voltar para raiz");
assert.equal(evaluate("?returnTo=%2Freceitas%3Ffiltro%3Dminhas"), "/receitas?filtro=minhas", "returnTo same-origin deve ser preservado");
assert.equal(evaluate("?returnTo=https%3A%2F%2Fevil.example%2Froubo"), "/", "returnTo cross-origin deve ser rejeitado");
assert.equal(evaluate(`?returnTo=${encodeURIComponent(`${ORIGIN}/receitas`)}`), "/", "returnTo absoluto same-origin deve ser rejeitado");
assert.equal(evaluate("?returnTo=%2F%2Fevil.example%2Froubo"), "/", "returnTo protocol-relative deve ser rejeitado");
assert.equal(evaluate("?returnTo=%2F%5Cevil.example%2Froubo"), "/", "returnTo com backslash deve ser rejeitado");
assert.equal(evaluate("", "/cardapios?origem=email"), "/cardapios?origem=email", "returnTo salvo em sessionStorage deve ser aceito");
assert.equal(evaluate("", "/formato-antigo", { legacy: true }), "/", "returnTo legado em string pura deve ser tratado como ausente");
assert.equal(evaluate("?returnTo=%2Fcheckout-novo", "/destino-antigo"), "/checkout-novo", "returnTo novo da URL deve vencer o persistido");
assert.equal(
  evaluate("", "/destino-vencido", { savedAt: Date.now() - RETURN_TO_MAX_AGE_MS - 1 }),
  "/",
  "returnTo pendente com mais de 30 minutos deve ser descartado sem URL nova"
);

const tentativaEm = Date.now();
const primeiraMontagem = resolveRegisterReturnTo({
  hasNewDestination: true,
  newDestination: "/comprar-zr?plano=zr_tin",
  persistedRaw: serializeReturnTo("/destino-antigo", tentativaEm),
  fallback: "/app",
  now: tentativaEm,
});
assert.deepEqual(
  primeiraMontagem,
  { destination: "/comprar-zr?plano=zr_tin", action: "persist" },
  "destino novo deve sobrescrever o persistido"
);
const persistedDaTentativa = serializeReturnTo(primeiraMontagem.destination, tentativaEm);
assert.deepEqual(
  resolveRegisterReturnTo({
    hasNewDestination: false,
    newDestination: "/app",
    persistedRaw: persistedDaTentativa,
    fallback: "/app",
    now: tentativaEm + 60_000,
  }),
  { destination: "/comprar-zr?plano=zr_tin", action: "keep" },
  "remontagem no mesmo documento deve preservar o destino persistido fresco"
);
assert.deepEqual(
  resolveRegisterReturnTo({
    hasNewDestination: false,
    newDestination: "/app",
    persistedRaw: persistedDaTentativa,
    fallback: "/app",
    now: tentativaEm + RETURN_TO_MAX_AGE_MS + 1,
  }),
  { destination: "/app", action: "clear" },
  "destino do cadastro com mais de 30 minutos deve ser descartado sem URL nova"
);
assert.equal(
  evaluate("?returnTo=%2Freceitas%3Fapp_base_url%3Dhttps%253A%252F%252Fevil.example%26app_id%3Datacante%26x%3D1"),
  "/receitas?x=1",
  "parâmetros bootstrap sensíveis devem ser removidos do returnTo",
);

const indexHtml = fs.readFileSync("index.html", "utf8");
const resetPage = fs.readFileSync("src/pages/ResetPassword.jsx", "utf8");
const registerPage = fs.readFileSync("src/pages/Register.jsx", "utf8");
const comprarZR = fs.readFileSync("src/pages/ComprarZR.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const authContext = fs.readFileSync("src/lib/AuthContext.jsx", "utf8");
const topBar = fs.readFileSync("src/components/layout/TopBar.jsx", "utf8");
const sidebar = fs.readFileSync("src/components/layout/Sidebar.jsx", "utf8");
const landing = fs.readFileSync("src/pages/Landing.jsx", "utf8");

assert.ok(indexHtml.includes("laborat-rio-de-cozinha.base44.app"), "host padrão Base44 do reset não está explicitamente canonicalizado");
assert.ok(indexHtml.includes(APP_SITE_URLS.resetPassword.replace("/reset-password", "")), "domínio canônico do app não está no bootstrap");
assert.equal(buildAppLoginUrl("/receitas?filtro=minhas"), `${APP_SITE_URLS.login}?returnTo=%2Freceitas%3Ffiltro%3Dminhas`);
assert.equal(buildAppLoginUrl(), APP_SITE_URLS.login);
assert.equal(
  getCanonicalAppRedirectUrl({ hostname: "laborat-rio-de-cozinha.base44.app", pathname: "/receitas", search: "?filtro=minhas", hash: "" }),
  `${ORIGIN}/receitas?filtro=minhas`,
  "rota do host antigo deve migrar para o domínio canônico",
);
assert.equal(
  getCanonicalAppRedirectUrl({ hostname: "laboratoriodecozinha.com.br", pathname: "/login", search: "", hash: "" }),
  `${ORIGIN}/login`,
  "login aberto no site institucional deve migrar para o subdomínio do app",
);
assert.equal(
  getCanonicalAppRedirectUrl({ hostname: "laboratoriodecozinha.com.br", pathname: "/termos", search: "", hash: "" }),
  null,
  "conteúdo público deve permanecer no domínio institucional",
);
assert.ok(indexHtml.includes("window.location.replace("), "reset do host Base44 não redireciona ao domínio próprio");
assert.ok(indexHtml.includes("base44_pending_password_reset_token"), "token de reset não é capturado no bootstrap");
assert.ok(indexHtml.includes("JSON.stringify({ value: pendingReturn, savedAt: Date.now() })"), "returnTo pendente não recebe carimbo de hora");
assert.ok(registerPage.includes("resolveRegisterReturnTo"), "cadastro não usa a decisão testável de retorno");
assert.ok(!registerPage.includes("navigationType"), "cadastro não deve depender do tipo de navegação do documento");
assert.ok(comprarZR.includes("encodeURIComponent(`/ler/${faixa}`)"), "pagamento aprovado não aponta para o primeiro capítulo da faixa comprada");
assert.ok(indexHtml.includes("qp.delete('token')"), "token de reset não é removido da URL");
assert.ok(
  indexHtml.indexOf("window.location.replace(") < indexHtml.indexOf("base44_pending_password_reset_token"),
  "canonicalização do host deve ocorrer antes de armazenar/remover o token",
);

assert.ok(resetPage.includes('sessionStorage.getItem("base44_pending_password_reset_token")'), "ResetPassword não lê token protegido do sessionStorage");
assert.ok(resetPage.includes("newPassword.length < 8"), "ResetPassword não exige mínimo de 8 caracteres");
assert.ok(resetPage.includes("tokenResetInvalidoOuExpirado"), "ResetPassword não trata token inválido/expirado");
assert.ok(resetPage.includes('sessionStorage.removeItem("base44_pending_password_reset_token")'), "ResetPassword não limpa token depois do uso/erro");
for (const route of ["/login", "/register", "/forgot-password", "/reset-password"]) {
  assert.ok(app.includes(`path=\"${route}\"`), `rota de autenticação ausente: ${route}`);
}
assert.ok(authContext.includes("redirectTarget = APP_SITE_URLS.login"), "logout não usa o login canônico do app");
assert.ok(authContext.includes("buildAppLoginUrl(currentInternalPath())"), "rota protegida não preserva returnTo no login canônico");
assert.ok(topBar.includes("logout()") && sidebar.includes("logout()"), "algum controle de saída ainda sobrescreve o destino canônico");
assert.ok(landing.includes("APP_SITE_URLS.login"), "landing não usa a URL centralizada de login");

console.log("OK: roteamento de autenticação, returnTo e proteção do token de reset aprovados.");