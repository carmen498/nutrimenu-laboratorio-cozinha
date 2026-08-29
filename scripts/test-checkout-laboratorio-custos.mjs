import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFile(path.join(root, p), "utf8");
const [pagamento, ativar, revogar, cartao, pix, dialog, schema, parcelamento] = await Promise.all([
  read("base44/functions/criarPagamentoMercadoPago/entry.ts"),
  read("base44/shared/ativarCompraPagamento.ts"),
  read("base44/shared/revogarCompraEstorno.ts"),
  read("src/components/planos/CartaoForm.jsx"),
  read("src/components/planos/PixForm.jsx"),
  read("src/components/planos/CheckoutDialog.jsx"),
  read("base44/entities/Pagamento.jsonc"),
  read("base44/shared/parcelamentoPlanos.ts"),
]);

assert.ok(pagamento.includes('"custos_mensal"') && pagamento.includes('"custos_anual"'), "checkout precisa aceitar planos pagos do Custos");
assert.ok(pagamento.includes("valorCozinha + valorCustos"), "total precisa ser calculado no servidor");
assert.ok(pagamento.includes('produtoCompra = addonId ? (planoBaseId ? "cozinha_mais_custos" : "laboratorio_custos")'), "pagamento precisa classificar compra isolada/combinada");
assert.ok(pagamento.includes("configAddon.venda_habilitada") && pagamento.includes("configModulo?.venda_habilitada"), "checkout do Custos precisa respeitar kill switches comerciais");
assert.ok(ativar.includes("referencia_pagamento_id") && ativar.includes('origem: "checkout"'), "aprovação precisa criar entitlement rastreável");
assert.ok(revogar.includes('status: "cancelado"') && revogar.includes("referencia_pagamento_id"), "estorno do Custos precisa cancelar somente seu entitlement");
assert.ok(cartao.includes("addon_plano_id") && pix.includes("addon_plano_id"), "cartão e PIX precisam enviar composição do pedido");
assert.ok(dialog.includes("Laboratório de Cozinha") && dialog.includes("Laboratório de Custos") && dialog.includes("Total"), "checkout precisa exibir composição e total");
assert.ok(schema.includes('"produto_compra"') && schema.includes('"valor_cozinha"') && schema.includes('"valor_custos"'), "schema Pagamento precisa persistir composição");
assert.ok(parcelamento.includes('plano === "custos_mensal"') && parcelamento.includes('plano === "custos_anual"'), "parcelamento do Custos precisa ser explícito");

console.log("OK: checkout multiproduto do Laboratório de Custos preparado com preço server-side, entitlement e estorno isolados.");
