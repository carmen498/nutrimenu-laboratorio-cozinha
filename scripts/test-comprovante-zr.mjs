import assert from "node:assert/strict";
import fs from "node:fs";
import { formatarDocumentoFiscal, resolverPagadorFiscal } from "../base44/shared/dadosFiscaisPagador.js";

assert.deepEqual(resolverPagadorFiscal({ cpf_cnpj: "123.456.789-01", nome_completo: "Maria Fiscal", full_name: "comercial" }), {
  tipo: "pf", nome: "Maria Fiscal", cpf_cnpj: "123.456.789-01", documento_digitos: "12345678901", faltando: [],
});
assert.deepEqual(resolverPagadorFiscal({ cpf_cnpj: "53.301.456/0001-58", razao_social: "Empresa Fiscal", full_name: "comercial" }), {
  tipo: "pj", nome: "Empresa Fiscal", cpf_cnpj: "53.301.456/0001-58", documento_digitos: "53301456000158", faltando: [],
});
assert.equal(formatarDocumentoFiscal("12345678901"), "123.456.789-01");
assert.equal(formatarDocumentoFiscal("53301456000158"), "53.301.456/0001-58");
assert.deepEqual(resolverPagadorFiscal({ cpf_cnpj: "123.456.789-01", full_name: "comercial" }).faltando, ["nome completo"]);
assert.deepEqual(resolverPagadorFiscal({ cpf_cnpj: "53.301.456/0001-58", full_name: "comercial" }).faltando, ["razão social"]);

const functionCode = fs.readFileSync("base44/functions/obterComprovantePagamentoZR/entry.ts", "utf8");
const contaCode = fs.readFileSync("src/pages/ContaZR.jsx", "utf8");
const notaCode = fs.readFileSync("base44/functions/solicitarNotaFiscalZR/entry.ts", "utf8");
const dialogCode = fs.readFileSync("src/components/conta-zr/ComprovantePagamentoDialog.jsx", "utf8");
assert.ok(functionCode.includes("Seu pagamento e seu acesso não foram afetados"));
assert.ok(functionCode.includes("resolverPagadorFiscal(user)"));
assert.ok(functionCode.includes("transacao: pagamento.mercadopago_order_id"));
assert.ok(dialogCode.includes('rotulo="N.º da transação"'));
assert.ok(!functionCode.includes("user.full_name"));
assert.ok(notaCode.includes("resolverPagadorFiscal({ ...user, ...updateData })"));
assert.ok(!notaCode.includes("user.full_name"));
assert.ok(contaCode.includes('pag.status === "approved"') && !contaCode.includes('pag.status === "approved" && vigente'));
assert.ok(dialogCode.includes("ESTORNADO em"));
assert.ok(dialogCode.includes("horário de Brasília"));
assert.ok(!dialogCode.toLowerCase().includes("assinatura"));
console.log("OK: comprovante ZR e fonte fiscal do pagador aprovados.");
