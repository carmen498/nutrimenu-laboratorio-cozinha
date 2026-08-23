import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createClient } from "@base44/sdk";

// Fase 10 — homologação destrutiva controlada de isolamento A × B.
// Cria dois usuários reais com OTP em caixas Mail.tm descartáveis, abre duas sessões
// independentes e executa CRUD cruzado nas entidades privadas principais e filhas.
// Não entra na suíte normal porque cria dois Users reais no app de produção.

if (process.env.ALLOW_TENANT_E2E !== "1") {
  throw new Error("Defina ALLOW_TENANT_E2E=1 para executar a homologação real A × B.");
}

const ORIGIN = process.env.TENANT_E2E_ORIGIN || "https://laboratoriodecozinha.com.br";
const APP_ID = process.env.TENANT_E2E_APP_ID || "6a2b263c4c1cb1e47d54d8b7";
const MAIL_API = "https://api.mail.tm";
const INGREDIENTE_ID = "6a849fc230dc9cad11db46f0";
const TAG_ID = "6a53e8d1dd35b828d82c6922";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomSecret = () => crypto.randomBytes(18).toString("base64url") + "!Aa7";
const runId = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

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

async function waitForMail(mailToken, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { response, data } = await jsonFetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${mailToken}` },
    });
    assert.equal(response.status, 200, "Falha ao consultar caixa temporária");
    const found = members(data)[0];
    if (found) {
      const detail = await jsonFetch(`${MAIL_API}/messages/${found.id}`, {
        headers: { Authorization: `Bearer ${mailToken}` },
      });
      assert.equal(detail.response.status, 200, "Falha ao ler e-mail temporário");
      return detail.data;
    }
    await sleep(1500);
  }
  throw new Error("OTP não chegou à caixa temporária dentro da janela do teste");
}

function mailText(message) {
  const html = Array.isArray(message?.html) ? message.html.join("\n") : (message?.html || "");
  const text = Array.isArray(message?.text) ? message.text.join("\n") : (message?.text || "");
  return `${message?.subject || ""}\n${message?.intro || ""}\n${text}\n${html}`;
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
  assert.ok(matches.length > 0, "OTP de 6 dígitos não encontrado");
  return matches.at(-1);
}

async function createMailAccount(label, domain) {
  const address = `fase10-${label}-${runId}@${domain}`;
  const password = randomSecret();
  const created = await jsonFetch(`${MAIL_API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  assert.ok([200, 201].includes(created.response.status), `Falha ao criar caixa ${label}`);
  const auth = await jsonFetch(`${MAIL_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  assert.equal(auth.response.status, 200, `Falha ao autenticar caixa ${label}`);
  return { address, password, id: created.data.id, token: auth.data.token };
}

async function createAppUser(label, mailbox) {
  const password = randomSecret();
  const register = await appPost("/auth/register", { email: mailbox.address, password });
  assert.ok([200, 201].includes(register.response.status), `Cadastro ${label} falhou: HTTP ${register.response.status}`);
  const otpMail = await waitForMail(mailbox.token);
  const otp = extractOtp(otpMail);
  const verify = await appPost("/auth/verify-otp", { email: mailbox.address, otp_code: otp });
  assert.equal(verify.response.status, 200, `OTP ${label} falhou: HTTP ${verify.response.status}`);
  const token = verify.data?.access_token;
  assert.ok(token, `OTP ${label} não retornou token`);

  await jsonFetch(`${ORIGIN}/api/apps/${APP_ID}/entities/User/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      nome_completo: `FASE10 USUARIO ${label}`,
      empresa: "FASE10 E2E - PODE REMOVER",
    }),
  });

  const login = await appPost("/auth/login", { email: mailbox.address, password });
  assert.equal(login.response.status, 200, `Login ${label} falhou`);
  const sessionToken = login.data?.access_token;
  assert.ok(sessionToken, `Login ${label} não retornou token`);

  const client = createClient({ appId: APP_ID, token: sessionToken });
  const me = await client.auth.me();
  assert.equal(me.email, mailbox.address, `Sessão ${label} autenticou usuário incorreto`);
  assert.equal(me.role, "user", `Sessão ${label} não é usuário comum`);
  return { label, email: mailbox.address, password, token: sessionToken, client, me };
}

function errorStatus(error) {
  return error?.response?.status ?? error?.status ?? null;
}

async function expectDenied(label, fn) {
  try {
    const value = await fn();
    throw new Error(`${label}: operação indevida foi aceita (${JSON.stringify(value)?.slice(0, 160)})`);
  } catch (error) {
    if (String(error?.message || "").startsWith(`${label}: operação indevida`)) throw error;
    const status = errorStatus(error);
    assert.ok(status == null || [401, 403, 404].includes(status), `${label}: rejeição inesperada HTTP ${status}`);
    return true;
  }
}

async function expectInvisible(label, entityApi, id) {
  try {
    const rows = await entityApi.filter({ id });
    assert.ok(Array.isArray(rows), `${label}: filter não retornou array`);
    assert.equal(rows.length, 0, `${label}: registro privado apareceu no filter do outro usuário`);
  } catch (error) {
    const status = errorStatus(error);
    assert.ok([401, 403, 404].includes(status), `${label}: filter falhou de modo inesperado HTTP ${status}`);
  }
}

const report = {
  run_id: runId,
  sessions: 0,
  entities_tested: [],
  checks: 0,
  denied_cross_reads: 0,
  denied_cross_updates: 0,
  denied_cross_deletes: 0,
  invisible_cross_filters: 0,
  owner_crud_passes: 0,
  forged_owner_rejections: 0,
  base_promotion_rejections: 0,
  cleanup_records: 0,
  mailboxes_deleted: 0,
};

const mailboxes = [];
const cleanup = [];
let userA = null;
let userB = null;

function count(ok = true) {
  if (ok) report.checks += 1;
}

async function registerCleanup(owner, entityName, id) {
  cleanup.push({ owner, entityName, id });
}

async function createOwned(owner, entityName, data) {
  const created = await owner.client.entities[entityName].create(data);
  assert.ok(created?.id, `${entityName}: create sem id`);
  await registerCleanup(owner, entityName, created.id);
  return created;
}

async function testPrivateRecord({ entityName, owner, attacker, createData, updateData }) {
  const apiOwner = owner.client.entities[entityName];
  const apiAttacker = attacker.client.entities[entityName];
  const created = await createOwned(owner, entityName, createData);
  count();

  const ownRead = await apiOwner.get(created.id);
  assert.equal(ownRead.id, created.id, `${entityName}: dono não consegue ler`);
  report.owner_crud_passes += 1; count();

  const updated = await apiOwner.update(created.id, updateData);
  assert.equal(updated.id, created.id, `${entityName}: dono não consegue atualizar`);
  report.owner_crud_passes += 1; count();

  await expectInvisible(`${entityName} ${owner.label}->${attacker.label} filter`, apiAttacker, created.id);
  report.invisible_cross_filters += 1; count();

  await expectDenied(`${entityName} ${owner.label}->${attacker.label} get`, () => apiAttacker.get(created.id));
  report.denied_cross_reads += 1; count();

  await expectDenied(`${entityName} ${owner.label}->${attacker.label} update`, () => apiAttacker.update(created.id, updateData));
  report.denied_cross_updates += 1; count();

  await expectDenied(`${entityName} ${owner.label}->${attacker.label} delete`, () => apiAttacker.delete(created.id));
  report.denied_cross_deletes += 1; count();

  const stillThere = await apiOwner.get(created.id);
  assert.equal(stillThere.id, created.id, `${entityName}: ataque removeu/ocultou registro do dono`);
  count();

  return created;
}

async function cleanupRecord(item) {
  try {
    await item.owner.client.entities[item.entityName].delete(item.id);
    report.cleanup_records += 1;
  } catch {}
}

try {
  const domainsRes = await jsonFetch(`${MAIL_API}/domains`);
  assert.equal(domainsRes.response.status, 200, "Mail.tm /domains indisponível");
  const domain = members(domainsRes.data).find((d) => d.isActive !== false)?.domain;
  assert.ok(domain, "Nenhum domínio temporário ativo disponível");

  const boxA = await createMailAccount("a", domain);
  const boxB = await createMailAccount("b", domain);
  mailboxes.push(boxA, boxB);

  userA = await createAppUser("A", boxA);
  userB = await createAppUser("B", boxB);
  report.sessions = 2;
  count(userA.me.id !== userB.me.id);
  assert.notEqual(userA.me.id, userB.me.id, "A e B resolveram para o mesmo usuário");

  const directions = [[userA, userB], [userB, userA]];

  // Cria fixtures-pai persistentes durante os testes das entidades-filhas.
  const fixture = new Map();
  for (const owner of [userA, userB]) {
    const receita = await createOwned(owner, "Receita", {
      nome: `F10 Receita Fixture ${owner.label} ${runId}`,
      usuario_dono_id: owner.me.id,
      categorias: ["Receitas Base"],
      porcoes_base: 2,
    });
    const cardapio = await createOwned(owner, "Cardapio", {
      nome: `F10 Cardapio Fixture ${owner.label} ${runId}`,
      tipo: "personalizado",
      usuario_dono_id: owner.me.id,
    });
    fixture.set(owner.label, { receita, cardapio });
  }

  const specs = [
    {
      entityName: "Receita",
      root: true,
      createData: (owner) => ({ nome: `F10 Receita ${owner.label} ${runId}`, usuario_dono_id: owner.me.id, categorias: ["Receitas Base"] }),
      updateData: (owner) => ({ nome: `F10 Receita Atualizada ${owner.label} ${runId}` }),
    },
    {
      entityName: "Cardapio",
      root: true,
      createData: (owner) => ({ nome: `F10 Cardapio ${owner.label} ${runId}`, tipo: "personalizado", usuario_dono_id: owner.me.id }),
      updateData: (owner) => ({ nome: `F10 Cardapio Atualizado ${owner.label} ${runId}` }),
    },
    {
      entityName: "Planejamento",
      createData: (owner) => ({ nome: `F10 Planejamento ${owner.label} ${runId}`, tipo_planejamento: "Outro", tipo_servico: "Outro" }),
      updateData: () => ({ duracao_horas: 3 }),
    },
    {
      entityName: "ListaCompras",
      createData: (owner) => ({ nome: `F10 Lista ${owner.label} ${runId}`, itens: [] }),
      updateData: () => ({ total_geral: 12.34 }),
    },
    {
      entityName: "PerCapitaUsuario",
      createData: (owner) => ({ prep_nome: `F10 PC ${owner.label} ${runId}`, per_capita_g: 100, original_g: 0 }),
      updateData: () => ({ per_capita_g: 123 }),
    },
    {
      entityName: "IngredienteReceita",
      child: true,
      createData: (owner) => ({ receita_id: fixture.get(owner.label).receita.id, tipo: "ingrediente", ingrediente_id: INGREDIENTE_ID, ingrediente_nome: "Macarrão, talharin", quantidade_por_porcao: 50, unidade_quantidade: "g", ordem: 1, is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ ordem: 2 }),
    },
    {
      entityName: "InsumoReceita",
      child: true,
      createData: (owner) => ({ receita_id: fixture.get(owner.label).receita.id, insumo_nome: `F10 embalagem ${owner.label}`, categoria: "embalagem", quantidade: 1, unidade: "un", is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ quantidade: 2 }),
    },
    {
      entityName: "ReceitaTag",
      child: true,
      createData: (owner) => ({ receita_id: fixture.get(owner.label).receita.id, tag_id: TAG_ID, tag_nome: "Vegetariana", is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ tag_nome: "Vegetariana F10" }),
    },
    {
      entityName: "IngredienteEsquecidoReceita",
      child: true,
      createData: (owner) => ({ receita_id: fixture.get(owner.label).receita.id, nome: `F10 esquecido ${owner.label}`, quantidade_g: 10, is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ quantidade_g: 20 }),
    },
    {
      entityName: "CardapioReceita",
      child: true,
      createData: (owner) => ({ cardapio_id: fixture.get(owner.label).cardapio.id, receita_id: fixture.get(owner.label).receita.id, receita_nome: `F10 Receita Fixture ${owner.label}`, per_capita_g: 80, is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ per_capita_g: 90 }),
    },
    {
      entityName: "CardapioInsumo",
      child: true,
      createData: (owner) => ({ cardapio_id: fixture.get(owner.label).cardapio.id, nome: `F10 guardanapo ${owner.label}`, quantidade: 2, unidade: "un", is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ quantidade: 3 }),
    },
    {
      entityName: "CardapioTag",
      child: true,
      createData: (owner) => ({ cardapio_id: fixture.get(owner.label).cardapio.id, tag_id: TAG_ID, tag_nome: "Vegetariana", is_base: false, usuario_dono_id: owner.me.id }),
      updateData: () => ({ tag_nome: "Vegetariana F10" }),
    },
  ];

  for (const spec of specs) {
    report.entities_tested.push(spec.entityName);
    for (const [owner, attacker] of directions) {
      await testPrivateRecord({
        entityName: spec.entityName,
        owner,
        attacker,
        createData: spec.createData(owner),
        updateData: spec.updateData(owner),
      });
    }
  }

  // Tentativas explícitas de forjar propriedade e promover conteúdo para catálogo-base.
  for (const [owner, other] of directions) {
    await expectDenied(`Receita ${owner.label} forja dono ${other.label}`, () => owner.client.entities.Receita.create({
      nome: `F10 forge receita ${owner.label}`,
      usuario_dono_id: other.me.id,
    }));
    report.forged_owner_rejections += 1; count();

    await expectDenied(`Cardapio ${owner.label} forja dono ${other.label}`, () => owner.client.entities.Cardapio.create({
      nome: `F10 forge cardapio ${owner.label}`,
      tipo: "personalizado",
      usuario_dono_id: other.me.id,
    }));
    report.forged_owner_rejections += 1; count();

    await expectDenied(`IngredienteReceita ${owner.label} forja dono ${other.label}`, () => owner.client.entities.IngredienteReceita.create({
      receita_id: fixture.get(owner.label).receita.id,
      tipo: "ingrediente",
      ingrediente_id: INGREDIENTE_ID,
      is_base: false,
      usuario_dono_id: other.me.id,
    }));
    report.forged_owner_rejections += 1; count();

    await expectDenied(`Receita ${owner.label} tenta is_base=true`, () => owner.client.entities.Receita.create({
      nome: `F10 base forge receita ${owner.label}`,
      usuario_dono_id: owner.me.id,
      is_base: true,
    }));
    report.base_promotion_rejections += 1; count();

    await expectDenied(`IngredienteReceita ${owner.label} tenta is_base=true`, () => owner.client.entities.IngredienteReceita.create({
      receita_id: fixture.get(owner.label).receita.id,
      tipo: "ingrediente",
      ingrediente_id: INGREDIENTE_ID,
      is_base: true,
      usuario_dono_id: owner.me.id,
    }));
    report.base_promotion_rejections += 1; count();
  }

  // Catálogo-base deve continuar legível por ambos.
  for (const user of [userA, userB]) {
    const ingrediente = await user.client.entities.Ingrediente.get(INGREDIENTE_ID);
    assert.equal(ingrediente.id, INGREDIENTE_ID, `${user.label} não lê Ingrediente global`);
    count();
    const tag = await user.client.entities.Tag.get(TAG_ID);
    assert.equal(tag.id, TAG_ID, `${user.label} não lê Tag global`);
    count();
  }

  assert.equal(report.denied_cross_reads, specs.length * 2);
  assert.equal(report.denied_cross_updates, specs.length * 2);
  assert.equal(report.denied_cross_deletes, specs.length * 2);
  assert.equal(report.invisible_cross_filters, specs.length * 2);

  console.log("OK: Fase 10 A × B real aprovada em duas sessões autenticadas independentes.");
  console.log(JSON.stringify(report, null, 2));
} finally {
  // Limpa dados de negócio criados pelo teste. Os Users reais permanecem para remoção administrativa.
  for (const item of cleanup.reverse()) await cleanupRecord(item);

  for (const mailbox of mailboxes) {
    try {
      const del = await fetch(`${MAIL_API}/accounts/${mailbox.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mailbox.token}` },
      });
      if (del.status === 204) report.mailboxes_deleted += 1;
    } catch {}
  }
  console.log("CLEANUP", JSON.stringify({ records: report.cleanup_records, mailboxes: report.mailboxes_deleted }));
}
