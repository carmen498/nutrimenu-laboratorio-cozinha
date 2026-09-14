import assert from "node:assert/strict";
import fs from "node:fs";
import { dataHoraBase44, formatarDataHoraBrasilia, formatarPrazoBrasilia } from "../src/lib/fusoBrasilia.js";

const helper = fs.readFileSync("base44/shared/processarDesistencia.ts", "utf8");
const webhook = fs.readFileSync("base44/functions/webhookMercadoPago/entry.ts", "utf8");
const solicitar = fs.readFileSync("base44/functions/solicitarDesistenciaCompra/entry.ts", "utf8");
const painel = fs.readFileSync("src/components/comunicacao/DesistenciasTab.jsx", "utf8");
const comprar = fs.readFileSync("src/pages/ComprarZR.jsx", "utf8");
const reprocessar = fs.readFileSync("base44/functions/reprocessarDesistencias/entry.ts", "utf8");
const conta = fs.readFileSync("src/pages/ContaZR.jsx", "utf8");
const contaGeral = fs.readFileSync("src/components/conta/DesistenciaCompraCard.jsx", "utf8");
const criarPagamento = fs.readFileSync("base44/functions/criarPagamentoMercadoPago/entry.ts", "utf8");
const schemaPagamento = fs.readFileSync("base44/entities/Pagamento.jsonc", "utf8");
const eslint = fs.readFileSync("eslint.config.js", "utf8");

assert.match(helper, /finalizarEstornoConfirmado\([\s\S]*pedidoOpcional: any \| null = null/);
assert.match(helper, /if \(!pedido\)[\s\S]*PedidoDesistencia\.filter\(\{ pagamento_id: pagamento\.id \}\)/);
assert.match(helper, /if \(pedido && pedido\.status !== "concluido"\)/);
assert.match(helper, /revogarCompraEstorno\(base44, pagamento\)/);
assert.match(helper, /tipo: "pagamento_estornado"/);
assert.match(webhook, /finalizarEstornoConfirmado\(base44, pagamento, null, "webhook_mercado_pago"\)/);

assert.match(helper, /"X-Idempotency-Key": chave/);
assert.match(helper, /\$\{MP_BASE\}\/\$\{orderId\}\/refund[\s\S]*method: "POST"/);
assert.doesNotMatch(helper, /body:\s*JSON\.stringify/);
assert.match(helper, /if \(opcoes\.consultarAntes\)[\s\S]*consultarOrder\(orderId\)/);
assert.match(solicitar, /status: "processando"/);
assert.match(reprocessar, /filter\(\{ status: "aberto" \}\)/);
assert.match(reprocessar, /validarCronologiaPedido/);
assert.match(solicitar, /statusQueBloqueiam = new Set\(\["processando", "aguardando_confirmacao", "falha_reembolso", "concluido"\]\)/);
assert.match(solicitar, /pagamento\.prazo_desistencia_em/);
assert.doesNotMatch(solicitar, /prazoFinal = new Date\(compraEm\.getTime/);
assert.match(criarPagamento, /prazo_desistencia_em: calcularPrazoDesistencia\(new Date\(\)\)/);
assert.match(schemaPagamento, /"prazo_desistencia_em"/);
assert.match(conta, /diasRestantes\(p\.prazo_desistencia_em\)/);
assert.doesNotMatch(conta, /diasRestantes\(p\.created_date\)/);
assert.match(contaGeral, /diasRestantes\(pagamento\.prazo_desistencia_em\)/);
assert.doesNotMatch(contaGeral, /const d = new Date\(iso\)/);
assert.match(eslint, /Campos de data\/hora de entidades Base44 devem passar por dataHoraBase44/);

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

assert.equal(dataHoraBase44("2026-09-14T13:11:34.034000").toISOString(), "2026-09-14T13:11:34.034Z");
assert.match(formatarDataHoraBrasilia("2026-09-14T13:11:34.034000"), /10:11:34/);
assert.match(formatarPrazoBrasilia("2026-09-21T13:11:34.034Z"), /21\/09\/2026, 10:11 \(horário de Brasília\)/);

console.log("✓ prazo legal vem do servidor e é exibido em America/Sao_Paulo");
console.log("✓ pedidos legados abertos entram no estorno automático");
console.log("✓ estorno automático: regressões estruturais cobertas");
console.log("✓ finalizador aceita estorno confirmado sem PedidoDesistencia");
console.log("✓ contestação e pagamento encerrado avisam o cliente com evento idempotente");
