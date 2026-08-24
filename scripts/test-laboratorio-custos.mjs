import assert from "node:assert/strict";
import {
  calcularCustoProducao,
  calcularLaboratorioCustos,
  calcularMaoDeObra,
  calcularMargemSobreVenda,
  calcularMarkupMultiplicador,
  calcularPrecoPorMargem,
  calcularPrecoPorMarkup,
  calcularRateioMensal,
  somarDespesasAtivas,
} from "../src/lib/custos/motorCustos.js";
import { avaliarAcessoLaboratorioCustos } from "../src/lib/laboratorioCustosAccess.js";

const perto = (atual, esperado, tolerancia = 1e-9) => {
  assert.ok(Math.abs(atual - esperado) <= tolerancia, `esperado ${esperado}, recebido ${atual}`);
};

const despesas = [
  { grupo: "gastos_negocio", valor_mensal: 5000, ativo: true },
  { grupo: "producao", valor_mensal: 1000, ativo: true },
  { grupo: "embalagem_outros", valor_mensal: 800, ativo: true },
  { grupo: "trabalho_ajudantes", valor_mensal: 900, ativo: false },
];

assert.equal(somarDespesasAtivas(despesas), 6800);
assert.equal(somarDespesasAtivas(despesas, ["producao"]), 1000);
assert.equal(somarDespesasAtivas(despesas, []), 0, "lista vazia de grupos deve significar nenhum grupo rateado");

const rateio = calcularRateioMensal({ despesas, volumeMensal: 200, quantidadeProducao: 5 });
perto(rateio.custoPorUnidade, 34);
perto(rateio.custoDaProducao, 170);
assert.equal(rateio.valido, true);

const rateioSemGrupos = calcularRateioMensal({ despesas, volumeMensal: 200, quantidadeProducao: 5, gruposIncluidos: [] });
assert.equal(rateioSemGrupos.totalMensal, 0);
assert.equal(rateioSemGrupos.custoDaProducao, 0);
assert.equal(rateioSemGrupos.valido, true);

const rateioSemVolume = calcularRateioMensal({ totalDespesasMensais: 6800, volumeMensal: 0, quantidadeProducao: 5 });
assert.equal(rateioSemVolume.valido, false);
assert.equal(rateioSemVolume.diagnostico, "volume_mensal_ausente");

const maoObra = calcularMaoDeObra({ horas: 3, valorHora: 20 });
assert.equal(maoObra.total, 60);
assert.equal(calcularMaoDeObra({ horas: 3, valorHora: 20, valorDireto: 75 }).total, 75);

const producao = calcularCustoProducao({
  custoTecnicoProducao: 52,
  custoEmbalagemAdicional: 10,
  custoMaoObraDireta: 20,
  custoRateadoProducao: 18,
  quantidadeProduzida: 5,
  totalPorcoes: 60,
  precoVendaUnitario: 60,
});
assert.equal(producao.custoTotal, 100);
assert.equal(producao.custoUnitario, 20);
perto(producao.custoPorPorcao, 100 / 60);
assert.equal(producao.receitaVendaTotal, 300);
assert.equal(producao.lucroEstimadoTotal, 200);
perto(producao.margemEstimada, 66.66666666666666);
assert.equal(producao.markupMultiplicador, 3);

perto(calcularMargemSobreVenda({ custoUnitario: 15.6, precoVendaUnitario: 46.8 }), 66.66666666666666);
perto(calcularMarkupMultiplicador({ custoUnitario: 15.6, precoVendaUnitario: 46.8 }), 3);
perto(calcularPrecoPorMarkup({ custoUnitario: 15.6, markup: 3 }), 46.8);
perto(calcularPrecoPorMargem({ custoUnitario: 15.6, margemDesejadaPct: 40 }).preco, 26);
perto(calcularPrecoPorMargem({ custoUnitario: 15.6, margemDesejadaPct: 40, taxasVariaveisPct: 10 }).preco, 31.2);
const precoComTaxasEFixo = calcularPrecoPorMargem({ custoUnitario: 15.6, margemDesejadaPct: 50, taxasVariaveisPct: 10, custoFixoAdicionalUnitario: 2 });
perto(precoComTaxasEFixo.preco, 44); // (15,60 + 2,00) / (1 - 0,50 - 0,10)
perto(precoComTaxasEFixo.preco - 17.6 - (precoComTaxasEFixo.preco * 0.10), 22); // 50% líquido sobre o preço
assert.equal(calcularPrecoPorMargem({ custoUnitario: 15.6, margemDesejadaPct: 95, taxasVariaveisPct: 5 }).valido, false);

const completo = calcularLaboratorioCustos({
  custoTecnicoProducao: 50,
  despesas,
  volumeMensal: 200,
  quantidadeProduzida: 5,
  valorMaoDeObraDireto: 25,
  custoEmbalagemAdicional: 10,
  outrosCustos: 5,
  totalPorcoes: 50,
  precoVendaUnitario: 70,
});
assert.equal(completo.custoTotal, 260); // 50 + 170 rateio + 25 mão de obra + 10 embalagem + 5 outros
assert.equal(completo.custoUnitario, 52);
assert.equal(completo.valido, true);

const semQuantidade = calcularCustoProducao({ custoTecnicoProducao: 10, quantidadeProduzida: 0 });
assert.equal(semQuantidade.valido, false);
assert.deepEqual(semQuantidade.diagnosticos, ["quantidade_produzida_ausente"]);

// Tela 8 — entitlement do add-on, independente da assinatura-base da Cozinha.
const agoraEntitlement = new Date("2026-08-24T18:00:00-03:00");
const configFechado = { modulo_habilitado: false };
const configAberto = { modulo_habilitado: true };
assert.equal(avaliarAcessoLaboratorioCustos(null, configAberto, null, agoraEntitlement).motivo, "sem_usuario");
assert.equal(avaliarAcessoLaboratorioCustos({ id: "admin", role: "admin" }, configFechado, null, agoraEntitlement).temAcesso, true);
assert.equal(avaliarAcessoLaboratorioCustos({ id: "u1", role: "user" }, configFechado, null, agoraEntitlement).motivo, "comercial_indisponivel");
assert.equal(avaliarAcessoLaboratorioCustos({ id: "u1", role: "user" }, configAberto, null, agoraEntitlement).motivo, "addon_nao_contratado");
assert.equal(avaliarAcessoLaboratorioCustos({ id: "u1", role: "user" }, configAberto, { status: "ativo", inicio_em: "2026-08-01T00:00:00-03:00" }, agoraEntitlement).temAcesso, true);
assert.equal(avaliarAcessoLaboratorioCustos({ id: "u1", role: "user" }, configAberto, { status: "ativo", fim_em: "2026-08-20T00:00:00-03:00" }, agoraEntitlement).motivo, "addon_expirado");
assert.equal(avaliarAcessoLaboratorioCustos({ id: "u1", role: "user" }, configAberto, { status: "cancelado" }, agoraEntitlement).motivo, "addon_nao_contratado");

console.log("Laboratório de Custos: motor econômico e acesso do add-on OK");
