import assert from "node:assert/strict";
import fs from "node:fs";
import { montarOrcamentoEvento } from "../src/lib/orcamentoEventoCalc.js";

const orcamento = montarOrcamentoEvento({
  planejamento: { nome: "Evento", total_pessoas: 10 },
  dados: { config: { grupos: [], doces_bebidas: [] }, receitaMap: {} },
  precoFinal: 250,
});

assert.equal(orcamento.total, 250, "o total comercial deve ser preservado");
assert.equal(orcamento.precoPorPessoa, 25, "o preço por pessoa deve ser derivado uma única vez");

const pdf = fs.readFileSync("src/lib/orcamentoEventoPDF.js", "utf8");
const pagina = fs.readFileSync("src/pages/OrcamentoEvento.jsx", "utf8");

assert.match(
  pdf,
  /montarOrcamentoEvento\(\{ planejamento, dados, precoFinal, validadeDias \}\)/,
  "o PDF deve encaminhar o preço final ao cálculo canônico",
);
assert.match(
  pagina,
  /precoFinal: orc\.total/,
  "a tela deve enviar o total comercial ao gerador do PDF",
);

console.log("OK: contrato de preço total e preço por pessoa do orçamento aprovado.");
