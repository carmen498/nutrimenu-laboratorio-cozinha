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
const datasAssinatura = read("base44/shared/datasAssinatura.ts");
const revogar = read("base44/shared/revogarAcessoEstorno.ts");
const pagamentoSchema = read("base44/entities/Pagamento.jsonc");
const userSchema = read("base44/entities/User.jsonc");
const preflight = read("base44/functions/preflightGoLive/entry.ts");
const regraRenovacao = read("base44/shared/regraRenovacao.ts");
const parcelamentoPlanos = read("base44/shared/parcelamentoPlanos.ts");
const sincronizarPlanos = read("base44/functions/sincronizarConfiguracaoPlanos/entry.ts");

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
assert(cartao.includes('const cpfLimpo = cpf.replace(/\\D/g, "")'), "CPF do cartão não é normalizado antes da tokenização");
assert(cartao.includes("respostaErro?.orientacao"), "checkout de cartão descarta orientação de recusa do backend");

assert(/export const IS_PRODUCTION = (true|false);/.test(mpConfig), "modo Mercado Pago frontend não está explícito");
assert(mpConfig.includes("SANDBOX_PUBLIC_KEY") && mpConfig.includes("PROD_PUBLIC_KEY"), "public keys por ambiente ausentes");

assert(criarPagamento.includes("await base44.auth.me()"), "checkout backend não exige autenticação");
assert(criarPagamento.includes('const PLANOS_VALIDOS') && criarPagamento.includes('"renovacao"'), "checkout backend precisa aceitar Renovação");
assert(criarPagamento.includes('"custos_mensal"') && criarPagamento.includes('"custos_anual"'), "checkout backend precisa aceitar os planos pagos do Laboratório de Custos");
assert(criarPagamento.includes("avaliarElegibilidadeRenovacao(user)"), "checkout backend não revalida elegibilidade da Renovação");
assert(criarPagamento.includes('code: "parcelamento_invalido"'), "checkout backend não bloqueia parcelamento inválido");
assert(criarPagamento.includes("ConfiguracaoPlano.filter"), "preço não vem da configuração server-side");
assert(criarPagamento.includes("aceite_termos !== true"), "checkout backend não exige aceite");
assert(criarPagamento.includes("idempotency_key"), "checkout backend sem idempotência persistida");
assert(criarPagamento.indexOf("pagamentosAntecipados") < criarPagamento.indexOf("avaliarElegibilidadeRenovacao(user)"), "idempotência da Renovação ocorre depois da janela D-30 e pode falhar em replay pós-aprovação");
assert(criarPagamento.includes('"X-Idempotency-Key"'), "header de idempotência Mercado Pago ausente");
assert(!criarPagamento.includes("cardNumber"), "backend recebe número bruto de cartão");
assert(criarPagamento.includes('identification: { type: "CPF", number: cpfLimpo }'), "CPF do titular não acompanha o payer do cartão");
assert(criarPagamento.includes("const orientacao = codigoRecusa.includes"), "backend não traduz recusa para orientação segura");
assert(criarPagamento.includes('"test@testuser.com"'), "checkout sandbox não usa o e-mail oficial de comprador de teste da Orders API");
assert(!criarPagamento.includes("JSON.stringify(mpData)"), "resposta bruta do Mercado Pago voltou a logs ou diagnóstico");

assert(webhook.includes("validarAssinatura(req, dataId)"), "webhook sem validação HMAC");
assert(webhook.includes("body?.live_mode === false"), "webhook não reconhece notificação sandbox autenticada");
assert(webhook.includes("MERCADOPAGO_ACCESS_TOKEN_SANDBOX"), "webhook não possui credencial sandbox para reconsulta homologada");
assert(webhook.includes("api.mercadopago.com"), "webhook não reconsulta provedor");
assert(webhook.includes("pagamento.status === novoStatus"), "webhook sem idempotência de estado final");
assert(webhook.includes("resolverStatusOrderMercadoPago") && webhook.includes("resolverStatusPaymentMercadoPago"), "normalização de status incompleta");

assert(ativar.includes("pagamento_ativo_id"), "ativação não registra pagamento vigente");
assert(ativar.includes("calcularExpiracaoInclusiva(dataInicio, dias)"), "ativação não usa a fonte única de validade inclusiva");
assert(ativar.includes("proximoCicloRenovacao"), "ativação não atualiza ciclo de renovação");
assert(datasAssinatura.includes("dias - 1"), "validade inclusiva do plano não está protegida na fonte única");
assert(revogar.includes("usuario.pagamento_ativo_id !== pagamento.id"), "estorno antigo pode revogar assinatura nova");
assert(revogar.includes("cicloRenovacaoAposEstorno"), "estorno vigente não reconcilia ciclo de renovação");

assert(pagamentoSchema.includes('"data.usuario_id": "{{user.id}}"'), "Pagamento não restringe leitura ao titular");
assert(pagamentoSchema.includes('"create": {\n      "user_condition": {\n        "role": "admin"'), "Pagamento não restringe escrita server-side/admin");
for (const campo of ["role", "plano_atual", "status_assinatura", "data_expiracao", "pagamento_ativo_id", "termos_versao_aceita"]) {
  assert(userSchema.includes(`\"${campo}\"`), `campo protegido User ausente: ${campo}`);
}
assert((userSchema.match(/"role": "admin"/g) || []).length >= 6, "FLS admin dos campos comerciais parece incompleto");

assert(preflight.includes('user.role !== "admin"'), "preflight não é admin-only");
assert(preflight.includes('MERCADOPAGO_WEBHOOK_SECRET'), "preflight não valida secret do webhook");
assert(preflight.includes('RESEND_API_KEY'), "preflight não valida e-mail transacional");
assert(preflight.includes('["mensal", "anual", "renovacao"]'), "preflight não exige configuração de Renovação");
assert(regraRenovacao.includes("JANELA_RENOVACAO_DIAS = 30"), "janela D-30 não está protegida");
assert(parcelamentoPlanos.includes("MAX_PARCELAS_RENOVACAO = 6"), "teto de 6 parcelas da Renovação não está protegido");
assert(sincronizarPlanos.includes('code: "configuracao_renovacao_duplicada"'), "sincronização não bloqueia duplicidade de Renovação");

const mode = mpConfig.match(/export const IS_PRODUCTION = (true|false);/)?.[1] === "true" ? "producao" : "sandbox";
assert(planos.includes('handleAssinar("renovacao"'), "Renovação não abre o checkout pago");
assert(!planos.includes("handleEmBreve"), "Renovação voltou ao placeholder Em breve");

console.log("OK: contratos estáticos críticos de autenticação, assinatura, Renovação e Mercado Pago aprovados.");
console.log(`INFO: frontend Mercado Pago configurado para ${mode}.`);
