import assert from "node:assert/strict";
import fs from "node:fs";

const helper = fs.readFileSync("base44/shared/processarDesistencia.ts", "utf8");
const webhook = fs.readFileSync("base44/functions/webhookMercadoPago/entry.ts", "utf8");
const solicitar = fs.readFileSync("base44/functions/solicitarDesistenciaCompra/entry.ts", "utf8");
const painel = fs.readFileSync("src/components/comunicacao/DesistenciasTab.jsx", "utf8");
const comprar = fs.readFileSync("src/pages/ComprarZR.jsx", "utf8");

assert.match(helper, /finalizarEstornoConfirmado\([\s\S]*pedidoOpcional: any \| null = null/);
assert.match(helper, /if \(!pedido\)[\s\S]*PedidoDesistencia\.filter\(\{ pagamento_id: pagamento\.id \}\)/);
assert.match(helper, /if \(pedido && pedido\.status !== "concluido"\)/);
assert.match(helper, /revogarCompraEstorno\(base44, pagamento\)/);
assert.match(helper, /tipo: "pagamento_estornado"/);
assert.match(webhook, /finalizarEstornoConfirmado\(base44, pagamento, null, "webhook_mercado_pago"\)/);

assert.match(helper, /"X-Idempotency-Key": chave/);
assert.match(helper, /method: "POST"[\s\S]*\/refund/);
assert.doesNotMatch(helper, /body:\s*JSON\.stringify/);
assert.match(helper, /if \(opcoes\.consultarAntes\)[\s\S]*consultarOrder\(orderId\)/);
assert.match(solicitar, /status: "processando"/);

assert.match(webhook, /pagamento_contestado/);
assert.match(webhook, /pagamento_encerrado/);
assert.match(helper, /eventoChave = `\$\{tipo\}:\$\{pagamento\.id\}`/);
assert.match(helper, /idempotencyKey: eventoChave/);

assert.doesNotMatch(painel, /Assumir atendimento/);
assert.doesNotMatch(painel, /Marcar devolução concluída/);
assert.match(painel, /Tentar reembolso novamente/);
assert.match(painel, /pedido\.status === "falha_reembolso"/);
assert.match(painel, /Último resultado do Mercado Pago/);

assert.match(comprar, /encodeURIComponent\(`\/ler\/\$\{faixa\}`\)/);

console.log("✓ estorno automático: regressões estruturais cobertas");
console.log("✓ finalizador aceita estorno confirmado sem PedidoDesistencia");
console.log("✓ contestação e pagamento encerrado avisam o cliente com evento idempotente");
