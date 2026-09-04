import assert from "node:assert/strict";
import { planejarMovimentoCardapio } from "../src/lib/reordenacaoDnD.js";

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
