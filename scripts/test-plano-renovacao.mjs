import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const agora = new Date("2026-08-23T12:00:00.000Z");

const hojeSaoPauloInline = `
function hojeSaoPauloISO(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(agora);
  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;
  return \`${'${ano}'}-${'${mes}'}-${'${dia}'}\`;
}
`;

async function importarJsComAcesso(relPath) {
  let source = await fs.readFile(path.join(root, relPath), "utf8");
  source = source.replace(/import \{ hojeSaoPauloISO \} from [^;]+;/, hojeSaoPauloInline);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

async function importarTs(relPath, injetarAcesso = false) {
  const full = path.join(root, relPath);
  let source = await fs.readFile(full, "utf8");
  if (injetarAcesso) source = source.replace(/import \{ hojeSaoPauloISO \} from [^;]+;/, hojeSaoPauloInline);
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    fileName: full,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

const front = await importarJsComAcesso("src/lib/regraRenovacao.js");
const back = await importarTs("base44/shared/regraRenovacao.ts", true);
const parcelamento = await importarTs("base44/shared/parcelamentoPlanos.ts");
const config = await importarTs("base44/shared/configuracaoPlanoRenovacao.ts");

const cenarios = [
  ["admin", { role: "admin" }, true, "admin"],
  ["primeiro ciclo", { role: "user", ciclo_renovacao: 0, data_expiracao: "2026-08-23" }, false, "ciclo_insuficiente"],
  ["D-31", { role: "user", ciclo_renovacao: 1, data_expiracao: "2026-09-23" }, false, "fora_janela"],
  ["D-30", { role: "user", ciclo_renovacao: 1, data_expiracao: "2026-09-22" }, true, "janela_renovacao"],
  ["último dia", { role: "user", ciclo_renovacao: 1, data_expiracao: "2026-08-23" }, true, "janela_renovacao"],
  ["já expirado", { role: "user", ciclo_renovacao: 1, data_expiracao: "2026-08-22" }, true, "expirado"],
];

for (const [nome, user, elegivel, motivo] of cenarios) {
  const frontResult = front.avaliarElegibilidadeRenovacao(user, agora);
  const backResult = back.avaliarElegibilidadeRenovacao(user, agora);
  assert.equal(frontResult.elegivel, elegivel, `${nome}: frontend elegibilidade`);
  assert.equal(frontResult.motivo, motivo, `${nome}: frontend motivo`);
  assert.equal(backResult.elegivel, elegivel, `${nome}: backend elegibilidade`);
  assert.equal(backResult.motivo, motivo, `${nome}: backend motivo`);
}

assert.equal(back.proximoCicloRenovacao("anual", 0), 1, "anual inicial deve estabelecer ciclo 1");
assert.equal(back.proximoCicloRenovacao("renovacao", 1), 2, "primeira renovação deve avançar 1→2");
assert.equal(back.proximoCicloRenovacao("renovacao", 2), 3, "renovações seguintes devem incrementar");
assert.equal(back.proximoCicloRenovacao("mensal", 2), 2, "mensal não deve alterar ciclo");
assert.equal(back.cicloRenovacaoAposEstorno("anual", 1), 0, "estorno anual deve reverter ciclo");
assert.equal(back.cicloRenovacaoAposEstorno("renovacao", 2), 1, "estorno de renovação deve decrementar ciclo");
assert.equal(back.cicloRenovacaoAposEstorno("mensal", 2), 2, "estorno mensal não deve alterar ciclo");
assert.equal(back.cicloRenovacaoAposEstorno("renovacao", 0), 0, "ciclo nunca pode ficar negativo");

assert.equal(parcelamento.maxParcelasPlano("renovacao"), 6, "Renovação deve limitar a 6 parcelas");
assert.equal(parcelamento.maxParcelasPlano("anual"), 12, "Anual mantém teto padrão de 12 parcelas");
assert.equal(parcelamento.validarParcelamentoPlano("renovacao", 6).valido, true, "6x deve ser válido para Renovação");
assert.equal(parcelamento.validarParcelamentoPlano("renovacao", 7).valido, false, "7x deve ser recusado para Renovação");
assert.equal(parcelamento.validarParcelamentoPlano("anual", 12).valido, true, "12x deve continuar válido para Anual");

assert.equal(config.CONFIGURACAO_RENOVACAO_CANONICA.valor_cobranca, 99, "valor canônico deve ser R$ 99");
assert.equal(config.CONFIGURACAO_RENOVACAO_CANONICA.preco_detalhe, "ou 6x de R$ 16,50", "texto canônico de parcelamento divergente");
assert.equal(config.configuracaoRenovacaoValida(config.CONFIGURACAO_RENOVACAO_CANONICA), true, "seed canônico deve ser válido");

const ler = async (p) => fs.readFile(path.join(root, p), "utf8");
const [pagamento, ativar, revogar, schema, planos, cartao, preflight, sync] = await Promise.all([
  ler("base44/functions/criarPagamentoMercadoPago/entry.ts"),
  ler("base44/shared/ativarAssinaturaPagamento.ts"),
  ler("base44/shared/revogarAcessoEstorno.ts"),
  ler("base44/entities/Pagamento.jsonc"),
  ler("src/pages/Planos.jsx"),
  ler("src/components/planos/CartaoForm.jsx"),
  ler("base44/functions/preflightGoLive/entry.ts"),
  ler("base44/functions/sincronizarConfiguracaoPlanos/entry.ts"),
]);

assert.ok(pagamento.includes('const PLANOS_VALIDOS = ["mensal", "anual", "renovacao"]'), "backend precisa aceitar Renovação");
assert.ok(pagamento.includes("avaliarElegibilidadeRenovacao(user)"), "backend precisa revalidar elegibilidade");
assert.ok(pagamento.includes('code: "parcelamento_invalido"'), "backend precisa recusar parcelamento inválido");
assert.ok(ativar.includes("proximoCicloRenovacao"), "ativação precisa atualizar ciclo");
assert.ok(revogar.includes("cicloRenovacaoAposEstorno"), "estorno precisa reconciliar ciclo");
assert.ok(schema.includes('"renovacao"'), "schema Pagamento precisa aceitar Renovação");
assert.ok(planos.includes('handleAssinar("renovacao"'), "card Renovação precisa abrir checkout real");
assert.ok(!planos.includes("handleEmBreve"), "Renovação não pode voltar ao placeholder Em breve");
assert.ok(cartao.includes("maxParcelasPlano(plano)"), "frontend precisa espelhar teto de parcelas");
assert.ok(preflight.includes('["mensal", "anual", "renovacao"]'), "preflight precisa exigir Renovação configurada");
assert.ok(sync.includes('code: "configuracao_renovacao_duplicada"'), "sync precisa bloquear duplicidade");
assert.ok(sync.includes("corrigir_valor_cobranca"), "sync precisa exigir autorização explícita para corrigir valor inválido");

console.log("OK: Renovação — elegibilidade D-30, ciclo, estorno, parcelamento, checkout, configuração e preflight aprovados.");
