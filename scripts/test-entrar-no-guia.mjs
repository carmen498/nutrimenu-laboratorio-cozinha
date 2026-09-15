import assert from "node:assert/strict";
import { validarReturnToInterno } from "../src/lib/authReturnTo.js";
import { validarVolta } from "../src/lib/voltaGuiaZR.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n— validarReturnToInterno: path vs query —");

test("returnTo com query contendo https: é aceito (path limpo)", () => {
  const result = validarReturnToInterno("/entrar-no-guia?volta=https://zr.nutrimenu.com.br/entrar");
  assert.equal(result, "/entrar-no-guia?volta=https://zr.nutrimenu.com.br/entrar");
});

test("returnTo com path válido simples é aceito", () => {
  assert.equal(validarReturnToInterno("/app"), "/app");
  assert.equal(validarReturnToInterno("/login"), "/login");
});

test("returnTo vazio ou nulo retorna fallback", () => {
  assert.equal(validarReturnToInterno(""), "/");
  assert.equal(validarReturnToInterno(null), "/");
  assert.equal(validarReturnToInterno(undefined), "/");
});

test("returnTo sem barra inicial é rejeitado", () => {
  assert.equal(validarReturnToInterno("javascript:alert(1)"), "/");
  assert.equal(validarReturnToInterno("https://site-falso.com"), "/");
});

test("returnTo com // é rejeitado (protocolo relativo)", () => {
  assert.equal(validarReturnToInterno("//site-falso.com"), "/");
  assert.equal(validarReturnToInterno("//site-falso.com?volta=https://zr.nutrimenu.com.br"), "/");
});

test("returnTo com /\\ é rejeitado", () => {
  assert.equal(validarReturnToInterno("/\\evil.com"), "/");
});

test("returnTo com barra invertida é rejeitado", () => {
  assert.equal(validarReturnToInterno("/app\\evil.com"), "/");
});

test("returnTo com esquema no path é rejeitado", () => {
  assert.equal(validarReturnToInterno("/javascript:alert(1)"), "/");
  assert.equal(validarReturnToInterno("/data:text/html,<script>"), "/");
});

test("returnTo com esquema codificado no path é rejeitado", () => {
  assert.equal(validarReturnToInterno("/%6a%61%76%61%73%63%72%69%70%74:alert(1)"), "/");
});

console.log("\n— validarVolta: whitelist de origens —");

test("volta=https://zr.nutrimenu.com.br/... é aceito", () => {
  assert.equal(
    validarVolta("https://zr.nutrimenu.com.br/entrar"),
    "https://zr.nutrimenu.com.br/entrar"
  );
  assert.equal(
    validarVolta("https://zr.nutrimenu.com.br/entrar?foo=bar"),
    "https://zr.nutrimenu.com.br/entrar?foo=bar"
  );
  assert.equal(
    validarVolta("https://zr.nutrimenu.com.br/"),
    "https://zr.nutrimenu.com.br/"
  );
});

test("volta=https://site-falso.com é rejeitado", () => {
  assert.equal(validarVolta("https://site-falso.com"), "https://zr.nutrimenu.com.br/entrar");
  assert.equal(validarVolta("https://site-falso.com/entrar"), "https://zr.nutrimenu.com.br/entrar");
});

test("volta=https://zr.nutrimenu.com.br.site-falso.com é rejeitado", () => {
  assert.equal(
    validarVolta("https://zr.nutrimenu.com.br.site-falso.com/entrar"),
    "https://zr.nutrimenu.com.br/entrar"
  );
});

test("volta=//site-falso.com é rejeitado", () => {
  assert.equal(validarVolta("//site-falso.com"), "https://zr.nutrimenu.com.br/entrar");
});

test("volta=javascript:alert(1) é rejeitado", () => {
  assert.equal(validarVolta("javascript:alert(1)"), "https://zr.nutrimenu.com.br/entrar");
});

test("volta=http://zr.nutrimenu.com.br é rejeitado (não-HTTPS)", () => {
  assert.equal(validarVolta("http://zr.nutrimenu.com.br/entrar"), "https://zr.nutrimenu.com.br/entrar");
});

test("volta nulo/vazio retorna destino padrão", () => {
  assert.equal(validarVolta(null), "https://zr.nutrimenu.com.br/entrar");
  assert.equal(validarVolta(""), "https://zr.nutrimenu.com.br/entrar");
  assert.equal(validarVolta(undefined), "https://zr.nutrimenu.com.br/entrar");
});

test("volta com fragmento pré-existente é descartado", () => {
  const result = validarVolta("https://zr.nutrimenu.com.br/entrar#foo=bar");
  assert.equal(result, "https://zr.nutrimenu.com.br/entrar");
});

test("volta malformado retorna destino padrão", () => {
  assert.equal(validarVolta("https://"), "https://zr.nutrimenu.com.br/entrar");
  assert.equal(validarVolta("https://[invalid"), "https://zr.nutrimenu.com.br/entrar");
});

console.log("\n— Fluxo de origem: ponte vs cadastro direto —");

test("marcarOrigemCadastro + consumirOrigemCadastro grava guia_zr", async () => {
  const { marcarOrigemCadastro, consumirOrigemCadastro, ORIGEM_GUIA_ZR } = await import("../src/lib/origemCadastro.js");

  // Mock sessionStorage
  const data = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };

  marcarOrigemCadastro(ORIGEM_GUIA_ZR);
  const valor = consumirOrigemCadastro();
  assert.equal(valor, "guia_zr");
  // Consumir remove o marcador
  assert.equal(consumirOrigemCadastro(), null);
});

test("cadastro direto (sem marcarOrigemCadastro) retorna null → backend aplica laboratorio_cozinha", async () => {
  const { consumirOrigemCadastro } = await import("../src/lib/origemCadastro.js");

  const data = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };

  const valor = consumirOrigemCadastro();
  assert.equal(valor, null);
  // registrarAceiteTermos recebe null → aplica fallback ORIGEM_LABORATORIO
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);