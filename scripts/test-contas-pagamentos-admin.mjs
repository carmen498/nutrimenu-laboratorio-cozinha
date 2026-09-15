import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const conta = read("src/pages/ContaZR.jsx");
const pagamentos = read("src/lib/pagamentosUsuario.js");
const cards = read("src/components/admin/ResumoPagamentosCards.jsx");
const usuariosTab = read("src/components/comunicacao/UsuariosTab.jsx");
const usuariosTable = read("src/components/admin/UsuariosTable.jsx");
const userSchema = read("base44/entities/User.jsonc");

assert.match(conta, /href="\/planos"[\s\S]*Fazer upgrade/, "Minha conta deve oferecer upgrade para quem já comprou");
assert.match(pagamentos, /rejected:\s*"Recusado"/, "Pagamento rejeitado deve aparecer como recusado");
assert.doesNotMatch(pagamentos, /rejected:\s*"Expirado"/, "Pagamento rejeitado não pode aparecer como expirado");
assert.match(cards, /status:\s*"rejected",\s*label:\s*"Recusado"/, "Resumo deve usar o mesmo rótulo");
assert.match(userSchema, /"conta_teste"\s*:\s*\{[\s\S]*?"type"\s*:\s*"boolean"/, "User deve ter marca de conta de teste");
assert.match(usuariosTable, /Conta de teste — excluir dos números de vendas/, "Admin deve conseguir marcar a conta");
assert.match(usuariosTable, /User\.update\(usuario\.id, \{ conta_teste: contaTeste \}\)/, "Marcação deve ser persistida no usuário");
assert.match(usuariosTab, /usuariosFiltrados\.filter\(\(u\) => !u\.conta_teste\)/, "Contas de teste devem sair dos números de vendas");

console.log("OK — upgrade, status recusado e exclusão de contas de teste verificados.");
