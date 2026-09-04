import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  executarMovimentoCardapio,
  ordenarItensCardapio,
  planejarMovimentoCardapio,
} from "../src/lib/reordenacaoCardapio.js";
import {
  persistirReordenacaoIngredientes,
  planejarReordenacaoIngredientes,
} from "../src/lib/reordenacaoIngredientesReceita.js";

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
let itensEntreDiasPersistidos = itensEntreDias.map((item) => ({ ...item }));
const planoEntreDias = executarMovimentoCardapio({
  itens: itensEntreDias,
  dataOrigem: segunda,
  indiceOrigem: 1,
  dataDestino: terca,
  indiceDestino: 0,
  aplicarPlano: (plano) => {
    const movimentosPorId = new Map(
      plano.movimentacoes.map((movimento) => [movimento.id, movimento]),
    );
    itensEntreDiasPersistidos = itensEntreDiasPersistidos.map((item) => ({
      ...item,
      ...movimentosPorId.get(item.id),
    }));
  },
});
const itensAposRecarregar = itensEntreDiasPersistidos.map((item) => ({ ...item }));

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

const tresGruposAoMoverParaBaixo = [
  { id: "massa", isGrupo: true },
  { id: "farinha" },
  { id: "ovos" },
  { id: "recheio", isGrupo: true },
  { id: "queijo" },
  { id: "finalizacao", isGrupo: true },
  { id: "ervas" },
];

assert.deepEqual(
  planejarReordenacaoIngredientes({
    itens: tresGruposAoMoverParaBaixo,
    indiceOrigem: 0,
    indiceDestino: 3,
  }),
  [
    { id: "recheio", ordem: 0 },
    { id: "queijo", ordem: 10 },
    { id: "massa", ordem: 20 },
    { id: "farinha", ordem: 30 },
    { id: "ovos", ordem: 40 },
    { id: "finalizacao", ordem: 50 },
    { id: "ervas", ordem: 60 },
  ],
  "Mover um Sub-título para baixo deve converter o índice do DnD sem saltar o grupo de destino",
);

const subreceitaAoMoverParaBaixo = [
  { id: "molho", isSubreceita: true },
  { id: "tomate-cache", subreceita_parent_id: "molho" },
  { id: "cebola-cache", subreceita_parent_id: "molho" },
  { id: "arroz" },
  { id: "salada" },
  { id: "batata" },
];

assert.deepEqual(
  planejarReordenacaoIngredientes({
    itens: subreceitaAoMoverParaBaixo,
    indiceOrigem: 0,
    indiceDestino: 3,
  }),
  [
    { id: "arroz", ordem: 0 },
    { id: "molho", ordem: 10 },
    { id: "tomate-cache", ordem: 20 },
    { id: "cebola-cache", ordem: 30 },
    { id: "salada", ordem: 40 },
    { id: "batata", ordem: 50 },
  ],
  "Mover uma Sub-receita para baixo deve descontar apenas os filhos adicionais removidos",
);

let itensReceitaPersistidos = subreceitaAoMoverParaBaixo.map((item) => ({ ...item }));
const escritasReceita = [];
const atualizacoesReceita = await persistirReordenacaoIngredientes({
  itens: subreceitaAoMoverParaBaixo,
  indiceOrigem: 0,
  indiceDestino: 3,
  persistir: async (atualizacoes) => {
    escritasReceita.push(atualizacoes);
    const atualizacoesPorId = new Map(
      atualizacoes.map((atualizacao) => [atualizacao.id, atualizacao]),
    );
    itensReceitaPersistidos = itensReceitaPersistidos.map((item) => ({
      ...item,
      ...atualizacoesPorId.get(item.id),
    }));
  },
});

assert.deepEqual(
  {
    quantidadeEscritas: escritasReceita.length,
    atualizacoesReceita,
    ordemAposRecarregar: [...itensReceitaPersistidos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => item.id),
  },
  {
    quantidadeEscritas: 1,
    atualizacoesReceita: [
      { id: "arroz", ordem: 0 },
      { id: "molho", ordem: 10 },
      { id: "tomate-cache", ordem: 20 },
      { id: "cebola-cache", ordem: 30 },
      { id: "salada", ordem: 40 },
      { id: "batata", ordem: 50 },
    ],
    ordemAposRecarregar: [
      "arroz",
      "molho",
      "tomate-cache",
      "cebola-cache",
      "salada",
      "batata",
    ],
  },
  "O controlador da Receita deve persistir uma vez e devolver a ordem observada no readback",
);

let escritasNoOp = 0;
const resultadoNoOp = await persistirReordenacaoIngredientes({
  itens: subreceitaAoMoverParaBaixo,
  indiceOrigem: 0,
  indiceDestino: 0,
  persistir: async () => {
    escritasNoOp += 1;
  },
});
assert.deepEqual(
  { resultadoNoOp, escritasNoOp },
  { resultadoNoOp: null, escritasNoOp: 0 },
  "Um drop sem movimento não deve produzir escrita",
);

const draggableRowSource = readFileSync(
  new URL("../src/components/receita/DraggableRow.jsx", import.meta.url),
  "utf8",
);
const cardapioSemanalSource = readFileSync(
  new URL("../src/pages/CardapioSemanal.jsx", import.meta.url),
  "utf8",
);

assert.deepEqual(
  {
    receita: {
      handleEhBotaoSeguro: /<button\s+type="button"\s+\{\.\.\.provided\.dragHandleProps\}/s.test(draggableRowSource),
      atributosDnDAplicados: draggableRowSource.includes("{...provided.dragHandleProps}"),
      nomeAcessivel: draggableRowSource.includes('aria-label="Arraste para reordenar"'),
    },
    cardapio: {
      handleEhBotaoSeguro: /<button\s+type="button"\s+\{\.\.\.dragProvided\.dragHandleProps\}/s.test(cardapioSemanalSource),
      atributosDnDAplicados: cardapioSemanalSource.includes("{...dragProvided.dragHandleProps}"),
      nomeAcessivel: cardapioSemanalSource.includes("aria-label={`Mover ${item.nome_cache}`}"),
      alternativaTeclado: [
        'aria-label="Mover para o dia anterior"',
        'aria-label="Mover para cima"',
        'aria-label="Mover para baixo"',
        'aria-label="Mover para o próximo dia"',
      ].every((rotulo) => cardapioSemanalSource.includes(rotulo)),
    },
  },
  {
    receita: {
      handleEhBotaoSeguro: true,
      atributosDnDAplicados: true,
      nomeAcessivel: true,
    },
    cardapio: {
      handleEhBotaoSeguro: true,
      atributosDnDAplicados: true,
      nomeAcessivel: true,
      alternativaTeclado: true,
    },
  },
  "Os controles públicos de arraste devem preservar teclado, ponteiro, nome acessível e alternativas por botão",
);

const subreceitaDentroDoGrupo = [
  { id: "massa", isGrupo: true },
  { id: "farinha" },
  { id: "molho", isSubreceita: true },
  { id: "tomate-cache", subreceita_parent_id: "molho" },
  { id: "ovos" },
];

assert.deepEqual(
  planejarReordenacaoIngredientes({
    itens: subreceitaDentroDoGrupo,
    indiceOrigem: 2,
    indiceDestino: 1,
  }),
  [
    { id: "massa", ordem: 0 },
    { id: "molho", ordem: 10 },
    { id: "tomate-cache", ordem: 20 },
    { id: "farinha", ordem: 30 },
    { id: "ovos", ordem: 40 },
  ],
  "Uma Sub-receita deve poder mudar de posição dentro do Sub-título sem separar seus filhos",
);

const ingredientesComItemComum = [
  { id: "massa", isGrupo: true },
  { id: "farinha" },
  { id: "molho", isSubreceita: true },
  { id: "tomate-cache", subreceita_parent_id: "molho" },
  { id: "ovos" },
];

assert.deepEqual(
  planejarReordenacaoIngredientes({
    itens: ingredientesComItemComum,
    indiceOrigem: 1,
    indiceDestino: 3,
  }),
  [
    { id: "massa", ordem: 0 },
    { id: "molho", ordem: 10 },
    { id: "tomate-cache", ordem: 20 },
    { id: "farinha", ordem: 30 },
    { id: "ovos", ordem: 40 },
  ],
  "Mover um Ingrediente comum deve persistir a nova ordem sem dividir uma Sub-receita",
);

const tabelaIngredientesSource = readFileSync(
  new URL("../src/components/receita/TabelaIngredientesReceita.jsx", import.meta.url),
  "utf8",
);

assert.deepEqual(
  {
    conectaResultadoAoHandler: tabelaIngredientesSource.includes(
      "<DragDropContext onDragEnd={handleDragEnd}>",
    ),
    publicaListaDeIngredientes: tabelaIngredientesSource.includes(
      '<Droppable droppableId="ingredientes">',
    ),
    handleFinalEhBotaoSeguro: /<button\s+type="button"\s+\{\.\.\.provided\.dragHandleProps\}/s.test(
      tabelaIngredientesSource,
    ),
    handleFinalRecebeDnD: tabelaIngredientesSource.includes(
      "{...provided.dragHandleProps}",
    ),
    handleFinalTemNomeAcessivel: tabelaIngredientesSource.includes(
      'aria-label="Arraste para reordenar"',
    ),
  },
  {
    conectaResultadoAoHandler: true,
    publicaListaDeIngredientes: true,
    handleFinalEhBotaoSeguro: true,
    handleFinalRecebeDnD: true,
    handleFinalTemNomeAcessivel: true,
  },
  "A Tabela de Ingredientes deve ligar o resultado do DnD ao handler e publicar um controle final acessível",
);
