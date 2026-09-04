import assert from "node:assert/strict";
import {
  ordenarItensCardapio,
  planejarMovimentoCardapio,
  planejarReordenacaoIngredientes,
} from "../src/lib/reordenacaoDnD.js";

const segunda = "2026-09-07";
const itens = [
  { id: "entrada", data: segunda, ordem: 0 },
  { id: "prato", data: segunda, ordem: 1 },
  { id: "sobremesa", data: segunda, ordem: 2 },
];

assert.deepEqual(
  planejarMovimentoCardapio({
    itens,
    dataOrigem: segunda,
    indiceOrigem: 0,
    dataDestino: segunda,
    indiceDestino: 2,
  }),
  {
    movimentacoes: [
      { id: "prato", data: segunda, ordem: 0 },
      { id: "sobremesa", data: segunda, ordem: 1 },
      { id: "entrada", data: segunda, ordem: 2 },
    ],
    novosItens: [
      { id: "entrada", data: segunda, ordem: 2 },
      { id: "prato", data: segunda, ordem: 0 },
      { id: "sobremesa", data: segunda, ordem: 1 },
    ],
  },
  "Mover uma Entrada para o fim do dia deve produzir a ordem visual e o payload persistível correspondentes",
);

console.log("DnD: reordenação no mesmo dia aprovada.");

const terca = "2026-09-08";
const itensEntreDias = [
  { id: "entrada", data: segunda, ordem: 0 },
  { id: "prato", data: segunda, ordem: 1 },
  { id: "sobremesa", data: terca, ordem: 0 },
];
const planoEntreDias = planejarMovimentoCardapio({
  itens: itensEntreDias,
  dataOrigem: segunda,
  indiceOrigem: 1,
  dataDestino: terca,
  indiceDestino: 0,
});
const movimentosPorId = new Map(
  planoEntreDias.movimentacoes.map((movimento) => [movimento.id, movimento]),
);
const itensAposRecarregar = itensEntreDias.map((item) => ({
  ...item,
  ...movimentosPorId.get(item.id),
}));

assert.deepEqual(
  {
    movimentacoes: planoEntreDias.movimentacoes,
    segundaAposRecarregar: ordenarItensCardapio(
      itensAposRecarregar.filter((item) => item.data === segunda),
    ).map(({ id, data, ordem }) => ({ id, data, ordem })),
    tercaAposRecarregar: ordenarItensCardapio(
      itensAposRecarregar.filter((item) => item.data === terca),
    ).map(({ id, data, ordem }) => ({ id, data, ordem })),
  },
  {
    movimentacoes: [
      { id: "entrada", data: segunda, ordem: 0 },
      { id: "prato", data: terca, ordem: 0 },
      { id: "sobremesa", data: terca, ordem: 1 },
    ],
    segundaAposRecarregar: [
      { id: "entrada", data: segunda, ordem: 0 },
    ],
    tercaAposRecarregar: [
      { id: "prato", data: terca, ordem: 0 },
      { id: "sobremesa", data: terca, ordem: 1 },
    ],
  },
  "Mover um Prato para outro dia deve persistir e reaparecer na ordem correta após o readback",
);

const ingredientesComGrupos = [
  { id: "massa", isGrupo: true },
  { id: "farinha" },
  { id: "ovos" },
  { id: "recheio", isGrupo: true },
  { id: "queijo" },
];

assert.deepEqual(
  planejarReordenacaoIngredientes({
    itens: ingredientesComGrupos,
    indiceOrigem: 0,
    indiceDestino: 4,
  }),
  [
    { id: "recheio", ordem: 0 },
    { id: "queijo", ordem: 10 },
    { id: "massa", ordem: 20 },
    { id: "farinha", ordem: 30 },
    { id: "ovos", ordem: 40 },
  ],
  "Mover um Sub-título deve preservar como bloco todos os ingredientes até o próximo Sub-título",
);

const ingredientesComSubreceita = [
  { id: "arroz" },
  { id: "molho", isSubreceita: true },
  { id: "tomate-cache", subreceita_parent_id: "molho" },
  { id: "cebola-cache", subreceita_parent_id: "molho" },
  { id: "salada" },
];

assert.deepEqual(
  planejarReordenacaoIngredientes({
    itens: ingredientesComSubreceita,
    indiceOrigem: 1,
    indiceDestino: 0,
  }),
  [
    { id: "molho", ordem: 0 },
    { id: "tomate-cache", ordem: 10 },
    { id: "cebola-cache", ordem: 20 },
    { id: "arroz", ordem: 30 },
    { id: "salada", ordem: 40 },
  ],
  "Mover uma Sub-receita deve preservar juntos o marcador e todos os seus filhos cacheados",
);
