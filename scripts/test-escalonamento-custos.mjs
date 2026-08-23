import assert from "node:assert/strict";
import {
  ESCALONAMENTO_CUSTO_MODELO_VERSAO,
  criarEscalaReceitaCanonica,
  escalarInsumoReceita,
  escalarInsumoCardapio,
  quantidadeBaseInsumoReceita,
} from "../src/lib/escalonamentoCustos.js";

const approx = (actual, expected, eps = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= eps, `esperado ${expected}, obtido ${actual}`);
};

assert.equal(ESCALONAMENTO_CUSTO_MODELO_VERSAO, 2);

const escala2x = criarEscalaReceitaCanonica({
  fator: 2,
  rendimentoBase: 1000,
  porcoesBase: 10,
  perCapita: 100,
});
assert.equal(escala2x.rendimentoAlvo, 2000);
assert.equal(escala2x.unidadesFinais, 20);

// POR LOTE: não acompanha o fator da receita; acompanha apenas nº explícito de lotes.
let r = escalarInsumoReceita(
  { quantidade: 2, custo_unitario: 3, comportamento_custo: "por_lote" },
  escala2x
);
approx(r.quantidadeEscalada, 2);
approx(r.custoEscalado, 6);
r = escalarInsumoReceita(
  { quantidade: 2, custo_unitario: 3, comportamento_custo: "por_lote" },
  { ...escala2x, numeroLotes: 3 }
);
approx(r.quantidadeEscalada, 6);
approx(r.custoEscalado, 18);

// PROPORCIONAL: acompanha exatamente o fator da receita.
r = escalarInsumoReceita(
  { quantidade: 2, custo_unitario: 3, comportamento_custo: "proporcional" },
  escala2x
);
approx(r.quantidadeEscalada, 4);
approx(r.custoEscalado, 12);

// POR UNIDADE: quantidade-base é por unidade final.
r = escalarInsumoReceita(
  { quantidade: 0.5, custo_unitario: 3, comportamento_custo: "por_unidade" },
  escala2x
);
approx(r.quantidadeEscalada, 10);
approx(r.custoEscalado, 30);

// Edição na escala atual deve ser reversível para a quantidade-base persistida.
approx(
  quantidadeBaseInsumoReceita({ comportamento_custo: "proporcional" }, 4, escala2x),
  2
);
approx(
  quantidadeBaseInsumoReceita({ comportamento_custo: "por_unidade" }, 10, escala2x),
  0.5
);
approx(
  quantidadeBaseInsumoReceita({ comportamento_custo: "por_lote" }, 6, { ...escala2x, numeroLotes: 3 }),
  2
);

// Cardápio: proporcional é relativo à escala em que foi cadastrado.
let c = escalarInsumoCardapio(
  { quantidade: 10, custo_unitario: 2, comportamento_custo: "proporcional", escala_base_unidades: 100 },
  { unidadesFinais: 200 }
);
approx(c.quantidadeEscalada, 20);
approx(c.custoEscalado, 40);

c = escalarInsumoCardapio(
  { quantidade: 0.25, custo_unitario: 2, comportamento_custo: "por_unidade" },
  { unidadesFinais: 200 }
);
approx(c.quantidadeEscalada, 50);
approx(c.custoEscalado, 100);

c = escalarInsumoCardapio(
  { quantidade: 3, custo_unitario: 2, comportamento_custo: "por_lote" },
  { unidadesFinais: 200 }
);
approx(c.quantidadeEscalada, 3);
approx(c.custoEscalado, 6);

console.log("Fase 11.1: invariantes de escalonamento canônico OK");
