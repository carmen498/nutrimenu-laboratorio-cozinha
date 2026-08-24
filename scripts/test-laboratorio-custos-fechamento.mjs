import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const app = read("src/App.jsx");
const route = read("src/components/CustosRoute.jsx");
const layout = read("src/components/custos/CustosLayout.jsx");
const sidebar = read("src/components/custos/CustosSidebar.jsx");
const calcular = read("src/pages/CustosCalcular.jsx");
const despesas = read("src/pages/CustosDespesas.jsx");
const bloqueado = read("src/pages/CustosBloqueado.jsx");
const access = read("src/lib/laboratorioCustosAccess.js");
const saveFunction = read("base44/functions/salvarCalculoCusto/entry.ts");
const serverAccess = read("base44/shared/acessoLaboratorioCustos.ts");
const calculoSchema = read("base44/entities/CalculoCusto.jsonc");
const itemSchema = read("base44/entities/CalculoCustoItem.jsonc");
const configSchema = read("base44/entities/ConfiguracaoCustosUsuario.jsonc");
const entitlementSchema = read("base44/entities/AcessoLaboratorioCustosUsuario.jsonc");
const addonSchema = read("base44/entities/ConfiguracaoAddonCustos.jsonc");
const commercialPreflight = read("base44/functions/preflightLaboratorioCustos/entry.ts");

for (const path of ["/custos", "/custos/despesas", "/custos/calcular", "/custos/ficha/:id", "/custos/historico", "/custos/configuracoes"]) {
  assert.ok(app.includes(`path=\"${path}\"`), `rota do Laboratório de Custos ausente: ${path}`);
}
assert.ok(app.includes("<Route element={<CustosRoute />}>"), "rotas internas não estão protegidas por CustosRoute");
assert.ok(app.includes("<Route element={<CustosLayout />}>") && layout.includes("CustosSidebar") && layout.includes("CustosTopBar"), "layout próprio do Laboratório de Custos não está conectado");
assert.ok(app.includes('path="/custos/adicionar-ao-plano" element={<CustosBloqueado />}'), "rota de upsell ausente");
assert.ok(sidebar.includes('to="/app"') && sidebar.includes("Voltar à Cozinha"), "layout de Custos não oferece retorno explícito à Cozinha");

assert.ok(route.includes("ConfiguracaoAddonCustos.filter"), "guard não lê configuração comercial persistida");
assert.ok(route.includes("AcessoLaboratorioCustosUsuario.filter"), "guard não lê entitlement do usuário");
assert.ok(!access.includes("LABORATORIO_CUSTOS_COMERCIAL_ENABLED"), "flag comercial hardcoded ainda controla o módulo");
assert.ok(bloqueado.includes("venda_habilitada") && bloqueado.includes("preco_exibido"), "upsell não está preparado para configuração comercial");
assert.ok(addonSchema.includes('"modulo_habilitado"') && addonSchema.includes('"default": false'), "configuração comercial não nasce fechada");
assert.ok(addonSchema.includes('"venda_habilitada"'), "configuração comercial não separa venda e acesso");
assert.ok(commercialPreflight.includes('user.role !== "admin"'), "preflight comercial não é admin-only");
assert.ok(commercialPreflight.includes("checkoutAddonIntegrado = false"), "preflight não mantém checkout do add-on explicitamente fechado");
assert.ok(commercialPreflight.includes("go_comercial"), "preflight comercial não publica decisão GO/NO-GO");

assert.ok(calcular.includes('base44.functions.invoke("salvarCalculoCusto"'), "Tela 3 não usa gravação server-side");
assert.ok(!calcular.includes("base44.entities.CalculoCusto.create"), "Tela 3 ainda cria CalculoCusto diretamente");
assert.ok(!calcular.includes("base44.entities.CalculoCustoItem.create"), "Tela 3 ainda cria itens diretamente");
assert.ok(saveFunction.includes("exigirAcessoLaboratorioCustos(base44)"), "gravação server-side não exige acesso ao add-on");
assert.ok(saveFunction.includes("cost_composition_mismatch"), "gravação server-side não valida fechamento da composição");
assert.ok(saveFunction.includes("technical_snapshot_mismatch"), "gravação server-side não valida snapshot técnico");
assert.ok(saveFunction.includes("CalculoCustoItem.delete") && saveFunction.includes("CalculoCusto.delete"), "gravação server-side não possui rollback compensatório");
assert.ok(serverAccess.includes("avaliarAcessoAssinaturaServer"), "acesso server-side ao add-on não exige plano-base válido");

for (const schema of [calculoSchema, itemSchema]) {
  assert.ok(schema.includes('"create"') && schema.includes('"user_condition"') && schema.includes('"role": "admin"'), "histórico não restringe criação ao backend/admin");
  assert.ok(schema.includes('"update"') && schema.includes('"role": "admin"'), "histórico não é imutável para o titular");
  assert.ok(schema.includes('"delete"') && schema.includes('"role": "admin"'), "histórico pode ser apagado diretamente pelo titular");
  assert.ok(schema.includes('"data.user_id": "{{user.id}}"'), "leitura do histórico não está vinculada ao titular");
}
assert.ok(entitlementSchema.includes('"create"') && entitlementSchema.includes('"role": "admin"'), "entitlement pode ser autoconcedido pelo usuário");
assert.ok(entitlementSchema.includes('"data.user_id": "{{user.id}}"'), "entitlement não restringe leitura ao titular");
assert.ok(configSchema.includes('"grupos_rateio_incluidos"'), "schema versionado de configuração perdeu os grupos de rateio");
assert.ok(despesas.includes("config?.grupos_rateio_incluidos") && despesas.includes("totalRateio"), "Minhas Despesas não usa a mesma seleção de grupos da Tela 7");

console.log("OK: fechamento estrutural, segurança, isolamento e preparação comercial do Laboratório de Custos aprovados.");
