import assert from "node:assert/strict";
import crypto from "node:crypto";

// E2E destrutivo e intencional de autenticação/recuperação de senha.
// Cria uma conta de teste descartável usando Mail.tm, recebe OTP e reset por e-mail,
// troca a senha e valida que o token não pode ser reutilizado. Não entra na suíte
// automática normal porque cria um User real no app de produção.
// Mail.tm API: https://docs.mail.tm/

if (process.env.ALLOW_TEMP_AUTH_E2E !== "1") {
  throw new Error("Defina ALLOW_TEMP_AUTH_E2E=1 para executar este teste destrutivo de autenticação.");
}

const ORIGIN = process.env.AUTH_E2E_ORIGIN || "https://laboratoriodecozinha.com.br";
const APP_ID = process.env.AUTH_E2E_APP_ID || "6a2b263c4c1cb1e47d54d8b7";
const MAIL_API = "https://api.mail.tm";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomSecret = () => crypto.randomBytes(18).toString("base64url") + "!Aa7";

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data, text };
}

async function appPost(path, body, token = null) {
  return jsonFetch(`${ORIGIN}/api/apps/${APP_ID}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function members(data) {
  return data?.["hydra:member"] || data?.member || data?.members || [];
}

async function waitForMail(mailToken, { excludeIds = new Set(), timeoutMs = 90000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { response, data } = await jsonFetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${mailToken}` },
    });
    assert.equal(response.status, 200, "Falha ao consultar caixa temporária");
    const found = members(data).find((m) => !excludeIds.has(m.id));
    if (found) {
      const detail = await jsonFetch(`${MAIL_API}/messages/${found.id}`, {
        headers: { Authorization: `Bearer ${mailToken}` },
      });
      assert.equal(detail.response.status, 200, "Falha ao ler e-mail temporário");
      return detail.data;
    }
    await sleep(2000);
  }
  throw new Error("E-mail não chegou à caixa temporária dentro da janela do teste");
}

function mailText(message) {
  const html = Array.isArray(message?.html) ? message.html.join("\n") : (message?.html || "");
  const text = Array.isArray(message?.text) ? message.text.join("\n") : (message?.text || "");
  return `${message?.subject || ""}\n${message?.intro || ""}\n${text}\n${html}`
    .replaceAll("&amp;", "&")
    .replaceAll("&#x3D;", "=")
    .replaceAll("&#61;", "=");
}

function extractOtp(message) {
  const content = mailText(message);
  const contextualPatterns = [
    /(?:c[oó]digo|code|verification|verifica[cç][aã]o|otp)[^0-9]{0,80}(\d{6})/i,
    /(\d{6})[^a-z0-9]{0,80}(?:c[oó]digo|code|verification|verifica[cç][aã]o|otp)/i,
  ];
  for (const pattern of contextualPatterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1];
  }
  const matches = [...content.matchAll(/(?:^|\D)(\d{6})(?:\D|$)/g)].map((m) => m[1]);
  assert.ok(matches.length > 0, "OTP de 6 dígitos não encontrado no e-mail");
  // Se houver mais de um número de 6 dígitos, prefira o último: timestamps/IDs
  // de template costumam aparecer antes do corpo principal do e-mail.
  return matches.at(-1);
}

function extractResetEntryLink(message) {
  const content = mailText(message);
  const rawLinks = content.match(/https?:\/\/[^\s"'<>\]]+/g) || [];
  const links = rawLinks.map((x) => x.replace(/[)>.,;]+$/, ""));

  // Preferir o link final sem tracking quando estiver disponível.
  const direct = links.find((link) => {
    try {
      const u = new URL(link);
      return u.pathname.includes("reset-password") && (u.searchParams.has("token") || u.searchParams.has("reset_token"));
    } catch { return false; }
  });
  if (direct) return direct;

  // Os e-mails transacionais da Base44 podem aplicar click tracking do SendGrid.
  // Nesse caso o usuário clica em /ls/click e é redirecionado ao reset real.
  const tracked = links.find((link) => {
    try {
      const u = new URL(link);
      return u.hostname.endsWith("ct.sendgrid.net") && u.pathname.includes("/ls/click");
    } catch { return false; }
  });
  assert.ok(tracked, "Link de redefinição não encontrado no e-mail");
  return tracked;
}

function extractResetToken(link) {
  const u = new URL(link);
  const token = u.searchParams.get("token") || u.searchParams.get("reset_token");
  assert.ok(token, "Token não encontrado na URL de redefinição");
  return token;
}

function decodeJwtExp(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return Number.isFinite(payload.exp) ? payload.exp : null;
  } catch { return null; }
}

let mailAccountId = null;
let mailToken = null;
const report = {
  mailbox_created: false,
  register_status: null,
  otp_received: false,
  otp_verify_status: null,
  initial_login_status: null,
  reset_request_status: null,
  reset_mail_received: false,
  reset_link_host: null,
  reset_link_path: null,
  reset_page_status: null,
  reset_status: null,
  old_password_login_status: null,
  new_password_login_status: null,
  token_reuse_status: null,
  token_reuse_rejected: false,
  token_has_exp_claim: false,
  token_ttl_seconds_at_receipt: null,
  mailbox_deleted: false,
};

try {
  const domainsRes = await jsonFetch(`${MAIL_API}/domains`);
  assert.equal(domainsRes.response.status, 200, "Mail.tm /domains indisponível");
  const domain = members(domainsRes.data).find((d) => d.isActive !== false)?.domain;
  assert.ok(domain, "Nenhum domínio temporário ativo disponível");

  const local = `fase9-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `${local}@${domain}`;
  const mailboxPassword = randomSecret();
  const initialPassword = randomSecret();
  const newPassword = randomSecret();
  const thirdPassword = randomSecret();

  const createMail = await jsonFetch(`${MAIL_API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password: mailboxPassword }),
  });
  assert.ok([200, 201].includes(createMail.response.status), `Falha ao criar caixa temporária: HTTP ${createMail.response.status}`);
  mailAccountId = createMail.data?.id;
  report.mailbox_created = true;

  const tokenMail = await jsonFetch(`${MAIL_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password: mailboxPassword }),
  });
  assert.equal(tokenMail.response.status, 200, "Falha ao autenticar caixa temporária");
  mailToken = tokenMail.data?.token;
  assert.ok(mailToken, "Mail.tm não retornou bearer token");

  const register = await appPost("/auth/register", { email, password: initialPassword });
  report.register_status = register.response.status;
  assert.ok([200, 201].includes(register.response.status), `Cadastro Base44 falhou: HTTP ${register.response.status} ${register.text.slice(0, 300)}`);

  const otpMail = await waitForMail(mailToken);
  report.otp_received = true;
  const otp = extractOtp(otpMail);
  const otpId = otpMail.id;

  const verify = await appPost("/auth/verify-otp", { email, otp_code: otp });
  report.otp_verify_status = verify.response.status;
  assert.equal(verify.response.status, 200, `OTP não foi aceito: HTTP ${verify.response.status} ${verify.text.slice(0, 300)}`);
  const accessToken = verify.data?.access_token;
  assert.ok(accessToken, "verify-otp não retornou access_token");

  // Marca o registro para fácil identificação administrativa. Não altera role/plano.
  await jsonFetch(`${ORIGIN}/api/apps/${APP_ID}/entities/User/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ nome_completo: "FASE9 E2E TEMP", empresa: "TESTE E2E - PODE REMOVER" }),
  });

  const initialLogin = await appPost("/auth/login", { email, password: initialPassword });
  report.initial_login_status = initialLogin.response.status;
  assert.equal(initialLogin.response.status, 200, "Login inicial da conta de teste falhou");

  const resetRequest = await appPost("/auth/reset-password-request", { email });
  report.reset_request_status = resetRequest.response.status;
  assert.equal(resetRequest.response.status, 200, "Pedido de recuperação falhou");

  const resetMail = await waitForMail(mailToken, { excludeIds: new Set([otpId]) });
  report.reset_mail_received = true;
  const resetEntryLink = extractResetEntryLink(resetMail);

  // Segue exatamente a cadeia que um clique humano seguiria (inclusive tracking).
  const resetPage = await fetch(resetEntryLink, { redirect: "follow" });
  report.reset_page_status = resetPage.status;
  assert.equal(resetPage.status, 200, `Link real de reset não abre a SPA: HTTP ${resetPage.status}`);
  const resetLink = resetPage.url;
  const resetUrl = new URL(resetLink);
  report.reset_link_host = resetUrl.host;
  report.reset_link_path = resetUrl.pathname;
  const resetToken = extractResetToken(resetLink);

  const exp = decodeJwtExp(resetToken);
  if (exp) {
    report.token_has_exp_claim = true;
    report.token_ttl_seconds_at_receipt = Math.max(0, exp - Math.floor(Date.now() / 1000));
  }

  const reset = await appPost("/auth/reset-password", { reset_token: resetToken, new_password: newPassword });
  report.reset_status = reset.response.status;
  assert.equal(reset.response.status, 200, `Troca de senha falhou: HTTP ${reset.response.status} ${reset.text.slice(0, 300)}`);

  const oldLogin = await appPost("/auth/login", { email, password: initialPassword });
  report.old_password_login_status = oldLogin.response.status;
  assert.notEqual(oldLogin.response.status, 200, "Senha antiga continuou válida após reset");

  const newLogin = await appPost("/auth/login", { email, password: newPassword });
  report.new_password_login_status = newLogin.response.status;
  assert.equal(newLogin.response.status, 200, "Senha nova não autentica após reset");

  const reuse = await appPost("/auth/reset-password", { reset_token: resetToken, new_password: thirdPassword });
  report.token_reuse_status = reuse.response.status;
  report.token_reuse_rejected = reuse.response.status >= 400;
  assert.ok(report.token_reuse_rejected, "Token de reset pôde ser reutilizado");

  console.log("OK: E2E real de recuperação de senha concluído com caixa temporária descartável.");
} finally {
  if (mailToken && mailAccountId) {
    try {
      const del = await fetch(`${MAIL_API}/accounts/${mailAccountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mailToken}` },
      });
      report.mailbox_deleted = del.status === 204;
      if (!report.mailbox_deleted) console.error(`WARN: caixa temporária não foi removida (HTTP ${del.status})`);
      else console.log("OK: caixa temporária Mail.tm removida.");
    } catch (error) {
      console.error("WARN: falha ao remover caixa temporária:", error?.message || String(error));
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
