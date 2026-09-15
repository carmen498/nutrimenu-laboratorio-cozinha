import assert from "node:assert/strict";
import fs from "node:fs";
import {
  RETURN_TO_MAX_AGE_MS,
  resolveRegisterReturnTo,
  safeReturnTo,
  serializeReturnTo,
  validarReturnToInterno,
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
assert.equal(evaluate("?returnTo=%2F%5Cevil.example%2Froubo"), "/", "returnTo iniciado por /\\ deve ser rejeitado");
assert.equal(evaluate("?returnTo=http%3A%2F%2Fevil.example"), "/", "esquema http deve ser rejeitado");
assert.equal(evaluate("?returnTo=https%3A%2F%2Fevil.example"), "/", "esquema https deve ser rejeitado");
assert.equal(evaluate("?returnTo=%2Fjavascript%3Aalert(1)"), "/", "esquema javascript deve ser rejeitado mesmo após /");
assert.equal(evaluate("?returnTo=%2Fdata%3Atext%2Fhtml%2Cteste"), "/", "esquema data deve ser rejeitado mesmo após /");
assert.equal(evaluate(`?returnTo=${encodeURIComponent(`${ORIGIN}/conta`)}`), "/", "URL absoluta da própria origem deve ser rejeitada");
assert.equal(validarReturnToInterno("/conta-zr?aba=planos"), "/conta-zr?aba=planos", "caminho interno deve ser aceito");
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



const { navegarAutenticacao } = await import("../src/lib/authNavigation.js");
const { traduzirErroAutenticacao, MENSAGEM_ERRO_AUTENTICACAO_GENERICA } = await import("../src/lib/authErrors.js");

assert.equal(
  navegarAutenticacao("/login", { returnTo: "/comprar-zr?plano=zr_tin", email: " Pessoa@Email.com " }),
  "/login?returnTo=%2Fcomprar-zr%3Fplano%3Dzr_tin&email=pessoa%40email.com",
  "navegação deve preservar somente returnTo e e-mail normalizado",
);
assert.equal(
  navegarAutenticacao("/forgot-password", { returnTo: "/conta-zr" }),
  "/forgot-password?returnTo=%2Fconta-zr",
  "toda transição de autenticação deve carregar returnTo",
);
assert.throws(() => navegarAutenticacao("/admin", { returnTo: "/app" }), /Rota de autenticação inválida/);
for (const inseguro of [
  "//evil.example",
  "/\\evil.example",
  "http://evil.example",
  "https://evil.example",
  "javascript:alert(1)",
  "data:text/html,teste",
  `${ORIGIN}/receitas`,
]) {
  assert.equal(
    navegarAutenticacao("/login", { returnTo: inseguro }),
    "/login?returnTo=%2Fapp",
    `fábrica de navegação deve ignorar returnTo inseguro: ${inseguro}`,
  );
}

const casosErro = [
  ["User already exists", "Este e-mail já possui uma conta."],
  ["Invalid verification code", "Código inválido. Confira os seis dígitos e tente novamente."],
  ["OTP expired", "O código expirou. Solicite um novo código."],
  ["Password is too short", "Crie uma senha com pelo menos 8 caracteres, incluindo maiúscula, minúscula e número."],
  ["Invalid email address", "Informe um endereço de e-mail válido."],
  ["Too many attempts", "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  ["Invalid email or password", "E-mail ou senha incorretos."],
  ["Reset token expired", "Este link está inválido ou expirado. Solicite um novo."],
  ["Network request failed", "Não foi possível conectar agora. Verifique sua internet e tente novamente."],
  ["Forbidden", "Não foi possível validar seus dados de acesso."],
];
for (const [sdkMessage, esperado] of casosErro) {
  assert.equal(traduzirErroAutenticacao(new Error(sdkMessage)).mensagem, esperado, `erro não traduzido: ${sdkMessage}`);
}
assert.equal(
  traduzirErroAutenticacao(new Error("opaque sdk internals")).mensagem,
  MENSAGEM_ERRO_AUTENTICACAO_GENERICA,
  "erro desconhecido nunca deve chegar cru à tela",
);

const loginPage = fs.readFileSync("src/pages/Login.jsx", "utf8");
const forgotPage = fs.readFileSync("src/pages/ForgotPassword.jsx", "utf8");
assert.ok(loginPage.includes('navegarAutenticacao("/register", { returnTo })'), "Login→Cadastro não usa navegação central");
assert.ok(loginPage.includes('navegarAutenticacao("/forgot-password", { returnTo, email })'), "Login→Esqueci não preserva retorno");
assert.ok(registerPage.includes('navegarAutenticacao("/login", { returnTo, email })'), "Cadastro→Login não preserva retorno e e-mail");
assert.ok(forgotPage.includes('navegarAutenticacao("/login", { returnTo, email })'), "Esqueci→Login não preserva retorno");
assert.ok(resetPage.includes('navegarAutenticacao("/login", { returnTo, email })'), "Redefinir→Login não preserva retorno");
assert.ok(resetPage.includes('navegarAutenticacao("/forgot-password", { returnTo, email })'), "Redefinir→Esqueci não preserva retorno");
assert.ok(registerPage.includes("O assunto chega em inglês, em nome de Nutrimenu."), "aviso do e-mail OTP ausente");
assert.ok(!loginPage.includes('setError(err.message'), "Login ainda expõe mensagem crua do SDK");
assert.ok(!registerPage.includes('setError(err.message'), "Cadastro ainda expõe mensagem crua do SDK");
assert.ok(!resetPage.includes('setError(err.message'), "Redefinição ainda expõe mensagem crua do SDK");

const auditClient = fs.readFileSync("src/lib/auditoriaAuth.js", "utf8");
const auditFunction = fs.readFileSync("base44/functions/auditarErroAutenticacao/entry.ts", "utf8");
const auditEntity = fs.readFileSync("base44/entities/LogErroAutenticacao.jsonc", "utf8");
assert.ok(auditClient.includes('traduzido?.tipo !== "desconhecido"'), "auditoria deve registrar somente erro não mapeado");
assert.ok(auditClient.includes("void base44.functions.invoke") && auditClient.includes(".catch(() => {})"), "auditoria do cliente não é dispare e esqueça");
assert.ok(auditFunction.includes("MAX_IP_MINUTO = 5"), "function de auditoria não limita chamadas por IP");
assert.ok(auditFunction.includes("MAX_GLOBAL_MINUTO = 30"), "function de auditoria não limita gravações globais por minuto");
for (const proibido of ["otp", "password", "senha", "token", "session", "credential", "secret"]) {
  assert.ok(auditFunction.includes(proibido), `sanitização não cobre dado sensível: ${proibido}`);
}
for (const permitido of ["ocorreu_em", "tela_origem", "codigo_mensagem_original", "email_digitado"]) {
  assert.ok(auditEntity.includes(`"${permitido}"`), `campo permitido ausente no log: ${permitido}`);
}
assert.ok(loginPage.includes('tela: "google"'), "retorno do Google não está coberto pela auditoria segura");
assert.ok(loginPage.includes("safeReturnTo()") && registerPage.includes("safeReturnTo()"), "Google deve receber returnTo já validado");

console.log("OK: autenticação, returnTo estrito, mensagens seguras e auditoria limitada aprovados.");