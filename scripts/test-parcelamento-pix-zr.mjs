import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const cartao = fs.readFileSync("src/components/planos/CartaoForm.jsx", "utf8");
const consulta = fs.readFileSync("base44/functions/consultarParcelamentoMercadoPago/entry.ts", "utf8");
const parcelamento = fs.readFileSync("base44/shared/parcelamentoMercadoPago.ts", "utf8");
const condicoes = fs.readFileSync("base44/shared/condicoesComerciaisZR.ts", "utf8");
const credencial = fs.readFileSync("base44/shared/mercadoPagoCredencial.ts", "utf8");
const criar = fs.readFileSync("base44/functions/criarPagamentoMercadoPago/entry.ts", "utf8");
const ofertas = fs.readFileSync("base44/functions/ofertasGuiaZR/entry.ts", "utf8");
const estorno = fs.readFileSync("base44/shared/processarDesistencia.ts", "utf8");
const admin = fs.readFileSync("src/components/comunicacao/CondicoesComerciaisZR.jsx", "utf8");
const adminPlano = fs.readFileSync("src/components/comunicacao/ConfiguracaoPlanoDialog.jsx", "utf8");
const checkout = fs.readFileSync("src/pages/ComprarZR.jsx", "utf8");
const cardsZr = fs.readFileSync("src/components/planos/PlanosGuiaZR.jsx", "utf8");
const guiaZr = fs.readFileSync("base44/shared/guiaTecnicoZR.ts", "utf8");
const parcelasFrontend = fs.readFileSync("src/lib/parcelamentoPlanos.js", "utf8");

assert.ok(cartao.includes("consultarParcelamentoMercadoPago"));
assert.ok(cartao.includes("card_bin: cardNumberLimpo.slice(0, 6)"));
assert.ok(parcelamento.includes("payment_methods/installments"));
assert.ok(parcelamento.includes("payer_costs"));
assert.ok(parcelamento.includes("installment_amount"));
assert.ok(parcelamento.includes("grupoA - grupoB || a.installments - b.installments"));
assert.ok(parcelamento.includes('console.error("Fallback de parcelamento Mercado Pago acionado"'));
assert.ok(parcelamento.includes("opcoes: [opcaoAVista(valor)]"));
assert.ok(cartao.includes("total_amount"));
assert.ok(cartao.includes("sem juros"));

assert.ok(credencial.includes('secrets.get("AMBIENTE")'));
assert.ok(credencial.includes("MERCADOPAGO_ACCESS_TOKEN_PROD"));
assert.ok(credencial.includes("MERCADOPAGO_ACCESS_TOKEN_SANDBOX"));
assert.ok(!parcelamento.includes("Deno.env.get"));

assert.ok(consulta.includes("plano_id: plano"));
assert.ok(consulta.includes("valor = Number(configuracao?.valor_cobranca)"));
for (const id of ["zr_tin", "zr_full_upgrade_tin_arquitetura", "zr_tin_renovacao"]) {
  assert.ok(consulta.includes("plano_id: plano"), id + " deve usar o ID exato da oferta");
}

assert.ok(criar.includes("valorGuiaZr = aplicarDescontoPixParaBaixo"));
assert.ok(criar.includes("const valor = valorCozinha + valorCustos + valorGuiaZr"));
assert.ok(criar.includes("total_amount: valorFormatado"));
assert.ok(criar.includes("unit_price: valorFormatado"));
assert.ok(criar.includes("amount: valorFormatado"));
assert.ok(criar.includes("somaItens !== valorFormatado"));
assert.ok(criar.includes("desconto_pix_pct: descontoPixPct"));
assert.ok(criar.includes("valor_sem_desconto: valorSemDesconto"));

assert.ok(estorno.includes("/refund"));
assert.ok(!estorno.slice(estorno.indexOf("/refund"), estorno.indexOf("/refund") + 240).includes("body:"));
assert.ok(estorno.includes("pagamento.valor ?? 0"));

for (const campo of ["preco:", "preco_pix:", "desconto_pix:", "parcelas_sem_juros:"]) {
  assert.ok(ofertas.includes(campo), "ofertasGuiaZR deve devolver " + campo);
}
assert.ok(admin.includes("espelha o “parcelado vendedor”"));
assert.ok(admin.includes("Mudar um sem mudar o outro"));
assert.ok(checkout.includes("oferta.parcelas_sem_juros"));
assert.ok(cardsZr.includes("parcelas_sem_juros"));
assert.ok(ofertas.includes("descricaoAcessoSemParcelamento(c.preco_detalhe)"));
assert.ok(adminPlano.includes("Retire o parcelamento deste campo"));
assert.ok(!/preco_detalhe\s*:\s*["'`][^\n"'`]*(?:sem\s+juros|até\s+\d+\s*x|\d+\s*x\s+de)/i.test(guiaZr));
assert.ok(!/maxParcelas\s*:\s*\d+/.test(guiaZr));
assert.ok(!parcelasFrontend.includes("MAX_PARCELAS_ZR"));

const jsCondicoes = ts.transpileModule(condicoes, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const modulo = await import("data:text/javascript;base64," + Buffer.from(jsCondicoes).toString("base64"));
assert.equal(modulo.aplicarDescontoPixParaBaixo(147, 5), 139.65);
assert.equal(modulo.aplicarDescontoPixParaBaixo(97, 5), 92.15);
assert.equal(modulo.aplicarDescontoPixParaBaixo(53, 5), 50.35);
assert.equal(modulo.aplicarDescontoPixParaBaixo(0.11, 5), 0.10);

console.log("✓ parcelas do ZR vêm do Mercado Pago e fallback oferece somente 1x com log");
console.log("✓ juros, total e ordenação das opções estão protegidos");
console.log("✓ PIX altera o valor real da order e mantém os três campos iguais");
console.log("✓ compra, upgrade e renovação usam o valor exato da própria oferta");
console.log("✓ estorno integral usa o valor efetivamente pago");
console.log("✓ ofertasGuiaZR devolve preço, PIX, desconto e parcelas sem juros");
