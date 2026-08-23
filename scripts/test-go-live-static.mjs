import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(cond, message) {
  if (!cond) throw new Error(`GO-LIVE STATIC FAIL: ${message}`);
}

const app = read("src/App.jsx");
const protectedRoute = read("src/components/ProtectedRoute.jsx");
const adminRoute = read("src/components/AdminRoute.jsx");
const register = read("src/pages/Register.jsx");
const checkout = read("src/components/planos/CheckoutDialog.jsx");
const cartao = read("src/components/planos/CartaoForm.jsx");
const pix = read("src/components/planos/PixForm.jsx");
const planos = read("src/pages/Planos.jsx");
const mpConfig = read("src/lib/mercadoPagoConfig.js");
const criarPagamento = read("base44/functions/criarPagamentoMercadoPago/entry.ts");
const webhook = read("base44/functions/webhookMercadoPago/entry.ts");
const ativar = read("base44/shared/ativarAssinaturaPagamento.ts");
const revogar = read("base44/shared/revogarAcessoEstorno.ts");
const pagamentoSchema = read("base44/entities/Pagamento.jsonc");
const userSchema = read("base44/entities/User.jsonc");
const preflight = read("base44/functions/preflightGoLive/entry.ts");

for (const rota of ["/login", "/register", "/termos", "/privacidade", "/aceitar-termos", "/planos"]) {
  assert(app.includes(`path=\"${rota}\"`), `rota crítica ausente: ${rota}`);
}
assert(protectedRoute.includes("termosAtuaisAceitos(user)"), "ProtectedRoute não exige termos vigentes");
assert(protectedRoute.includes("avaliarAcessoAssinatura(user)"), "ProtectedRoute não avalia assinatura");
assert(adminRoute.includes('user.role !== \'admin\''), "AdminRoute não restringe role admin");

assert(register.includes('disabled={loading || !aceitaTermos}'), "cadastro por e-mail não bloqueia sem aceite");
assert(register.includes('base44.functions.invoke("registrarAceiteTermos"'), "cadastro não persiste aceite");
assert(register.indexOf('registrarAceiteTermos') < register.indexOf('inicializarTrialUsuario'), "trial ocorre antes do aceite dos termos");

assert(checkout.includes("aceiteContratacao"), "checkout não exige aceite contratual");
assert(cartao.includes('forma_pagamento: "cartao"'), "fluxo de cartão ausente");
assert(pix.includes('forma_pagamento: "pix"'), "fluxo PIX ausente");
assert(cartao.includes("crypto.randomUUID()") && pix.includes("crypto.randomUUID()"), "tentativa idempotente não é gerada no checkout");

assert(/export const IS_PRODUCTION = (true|false);/.test(mpConfig), "modo Mercado Pago frontend não está explícito");
assert(mpConfig.includes("SANDBOX_PUBLIC_KEY") && mpConfig.includes("PROD_PUBLIC_KEY"), "public keys por ambiente ausentes");

assert(criarPagamento.includes("await base44.auth.me()"), "checkout backend não exige autenticação");
assert(criarPagamento.includes('const PLANOS_VALIDOS = ["mensal", "anual"]'), "escopo de planos pagos inesperado");
assert(criarPagamento.includes("ConfiguracaoPlano.filter"), "preço não vem da configuração server-side");
assert(criarPagamento.includes("aceite_termos !== true"), "checkout backend não exige aceite");
assert(criarPagamento.includes("idempotency_key"), "checkout backend sem idempotência persistida");
assert(criarPagamento.includes('"X-Idempotency-Key"'), "header de idempotência Mercado Pago ausente");
assert(!criarPagamento.includes("cardNumber"), "backend recebe número bruto de cartão");

assert(webhook.includes("validarAssinatura(req, dataId)"), "webhook sem validação HMAC");
assert(webhook.includes("api.mercadopago.com"), "webhook não reconsulta provedor");
assert(webhook.includes("pagamento.status === novoStatus"), "webhook sem idempotência de estado final");
assert(webhook.includes("resolverStatusOrderMercadoPago") && webhook.includes("resolverStatusPaymentMercadoPago"), "normalização de status incompleta");

assert(ativar.includes("pagamento_ativo_id"), "ativação não registra pagamento vigente");
assert(ativar.includes("Math.max(dias - 1, 0)"), "validade inclusiva do plano não está protegida");
assert(revogar.includes("usuario.pagamento_ativo_id !== pagamento.id"), "estorno antigo pode revogar assinatura nova");

assert(pagamentoSchema.includes('"data.usuario_id": "{{user.id}}"'), "Pagamento não restringe leitura ao titular");
assert(pagamentoSchema.includes('"create": {\n      "user_condition": {\n        "role": "admin"'), "Pagamento não restringe escrita server-side/admin");
for (const campo of ["role", "plano_atual", "status_assinatura", "data_expiracao", "pagamento_ativo_id", "termos_versao_aceita"]) {
  assert(userSchema.includes(`\"${campo}\"`), `campo protegido User ausente: ${campo}`);
}
assert((userSchema.match(/"role": "admin"/g) || []).length >= 6, "FLS admin dos campos comerciais parece incompleto");

assert(preflight.includes('user.role !== "admin"'), "preflight não é admin-only");
assert(preflight.includes('MERCADOPAGO_WEBHOOK_SECRET'), "preflight não valida secret do webhook");
assert(preflight.includes('RESEND_API_KEY'), "preflight não valida e-mail transacional");

const mode = mpConfig.match(/export const IS_PRODUCTION = (true|false);/)?.[1] === "true" ? "producao" : "sandbox";
const renovacaoEmBreve = planos.includes('onClick={handleEmBreve}');

console.log("OK: contratos estáticos críticos de autenticação, assinatura e Mercado Pago aprovados.");
console.log(`INFO: frontend Mercado Pago configurado para ${mode}.`);
if (renovacaoEmBreve) console.log("WARN: plano Renovação permanece fora do checkout pago (Em breve).");
