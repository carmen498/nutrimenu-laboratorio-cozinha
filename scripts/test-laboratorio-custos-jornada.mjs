import assert from "node:assert/strict";
import { calcularCustoReceitaCanonico } from "../src/lib/custoReceita.js";
import { calcularLaboratorioCustos, calcularPrecoPorMargem } from "../src/lib/custos/motorCustos.js";

const perto = (a, b, tol = 0.001) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, obtido ${a}`);

// Snapshot read-only da receita real SALMÃO COM COGUMELOS, usado na Rodada 2 de homologação.
// Os valores abaixo foram conferidos contra as entidades Receita, IngredienteReceita e Ingrediente.
const receita = {
  id: "6a71ff1a77082d188c4b22bf",
  nome: "SALMÃO COM COGUMELOS",
  porcoes_base: 1,
  per_capita_g: 150,
  rendimento_total: 1243,
  unidade_base: "g",
};

const ingredientesReceita = [
  { id: "ir1", tipo: "ingrediente", ingrediente_id: "salmao", ingrediente_nome: "Salmão", quantidade_por_porcao: 800, proporcional: true },
  { id: "ir2", tipo: "ingrediente", ingrediente_id: "cogumelo", ingrediente_nome: "Cogumelo Paris", quantidade_por_porcao: 300, proporcional: true },
  { id: "ir3", tipo: "ingrediente", ingrediente_id: "manteiga", ingrediente_nome: "Manteiga Sem Sal", quantidade_por_porcao: 30, proporcional: true },
  { id: "ir4", tipo: "ingrediente", ingrediente_id: "alho", ingrediente_nome: "Alho", quantidade_por_porcao: 10, proporcional: true },
  { id: "ir5", tipo: "ingrediente", ingrediente_id: "vinho", ingrediente_nome: "Vinho Branco", quantidade_por_porcao: 100, proporcional: true },
  { id: "ir6", tipo: "ingrediente", ingrediente_id: "sal", ingrediente_nome: "Sal", quantidade_por_porcao: 2, proporcional: true },
  { id: "ir7", tipo: "ingrediente", ingrediente_id: "pimenta", ingrediente_nome: "Pimenta-Do-Reino Preta", quantidade_por_porcao: 1, proporcional: true },
];

const ingredienteMap = {
  salmao: { id: "salmao", nome: "Salmão", preco_por_g_rs: 0.118, fator_correcao: 1 },
  cogumelo: { id: "cogumelo", nome: "Cogumelo Paris", preco_por_g_rs: 0.0795, fator_correcao: 1 },
  manteiga: { id: "manteiga", nome: "Manteiga Sem Sal", preco_por_g_rs: 0.058, fator_correcao: 1 },
  alho: { id: "alho", nome: "Alho", preco_por_g_rs: 0.0198, fator_correcao: 1 },
  vinho: { id: "vinho", nome: "Vinho Branco", preco_por_g_rs: 0.042, fator_correcao: 1 },
  sal: { id: "sal", nome: "Sal", preco_por_g_rs: 0.007, fator_correcao: 1 },
  pimenta: { id: "pimenta", nome: "Pimenta-Do-Reino Preta", preco_por_g_rs: 0.03, fator_correcao: 1 },
};

const tecnico = calcularCustoReceitaCanonico({
  receita,
  ingredientesReceita,
  ingredienteMap,
  fator: 2,
  numeroLotes: 2,
});

assert.equal(tecnico.completo, true);
perto(tecnico.custoTotal, 248.864);
perto(tecnico.rendimento, 2486);
perto(tecnico.porcoesEfetivas, 2486 / 150);

// Jornada econômica controlada: despesas mensais + mão de obra + custos diretos.
const despesas = [
  { grupo: "gastos_negocio", nome: "Aluguel", valor_mensal: 1200, ativo: true },
  { grupo: "gastos_negocio", nome: "Internet", valor_mensal: 200, ativo: true },
  { grupo: "producao", nome: "Energia", valor_mensal: 600, ativo: true },
  { grupo: "producao", nome: "Gás", valor_mensal: 300, ativo: true },
  { grupo: "embalagem_outros", nome: "Materiais gerais", valor_mensal: 400, ativo: true },
  { grupo: "trabalho_ajudantes", nome: "Ajudante mensal", valor_mensal: 900, ativo: true },
];

const resultado = calcularLaboratorioCustos({
  custoTecnicoProducao: tecnico.custoTotal,
  despesas,
  volumeMensal: 60,
  quantidadeProduzida: 2,
  gruposRateio: ["gastos_negocio", "producao", "embalagem_outros"],
  horasMaoDeObra: 3,
  valorHora: 30,
  custoEmbalagemAdicional: 12,
  outrosCustos: 8,
  totalPorcoes: tecnico.porcoesEfetivas,
});

assert.equal(resultado.valido, true);
perto(resultado.rateio.totalMensal, 2700);
perto(resultado.rateio.custoPorUnidade, 45);
perto(resultado.rateio.custoDaProducao, 90);
perto(resultado.maoDeObra.total, 90);
perto(resultado.custoTotal, 448.864);
perto(resultado.custoUnitario, 224.432);
perto(resultado.custoPorPorcao, 27.0835076428);

// Formação assistida: 40% de margem líquida, 3% cartão, 6% impostos e R$ 2/lote de custo fixo de venda.
const formacao = calcularPrecoPorMargem({
  custoUnitario: resultado.custoUnitario,
  margemDesejadaPct: 40,
  taxasVariaveisPct: 9,
  custoFixoAdicionalUnitario: 2,
});
assert.equal(formacao.valido, true);
perto(formacao.preco, 443.9843137255);
const lucroLiquido = formacao.preco - (resultado.custoUnitario + 2) - (formacao.preco * 0.09);
perto((lucroLiquido / formacao.preco) * 100, 40);

// Proteção da jornada: despesa rateável sem volume mensal não pode ser tratada como cálculo válido.
const semVolume = calcularLaboratorioCustos({
  custoTecnicoProducao: tecnico.custoTotal,
  despesas,
  volumeMensal: 0,
  quantidadeProduzida: 2,
  gruposRateio: ["gastos_negocio", "producao", "embalagem_outros"],
});
assert.equal(semVolume.valido, false);
assert.equal(semVolume.rateio.diagnostico, "volume_mensal_ausente");

// Escolha consciente de nenhum grupo: rateio zero e jornada válida mesmo sem volume.
const semRateio = calcularLaboratorioCustos({
  custoTecnicoProducao: tecnico.custoTotal,
  despesas,
  volumeMensal: 0,
  quantidadeProduzida: 2,
  gruposRateio: [],
});
assert.equal(semRateio.valido, true);
assert.equal(semRateio.rateio.totalMensal, 0);
assert.equal(semRateio.rateio.custoDaProducao, 0);

console.log("OK: jornada real SALMÃO COM COGUMELOS fecha do custo técnico à formação do preço.");
