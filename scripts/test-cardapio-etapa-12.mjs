import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CATEGORIAS_RELACIONADAS_RECEITA,
  CATEGORIAS_RELACIONADAS_BEBIDA,
  calcularIndiceInsercao,
  filtrarOpcoesCardapio,
  prioridadeClassificacao,
} from "../src/lib/cardapioRegras.js";
import { toSentenceCaseName, toUpperName } from "../src/lib/textCase.js";

const receitas = [
  { id: "salada", nome: "SALADA DE BRÓCOLIS COM TOMATE", categorias: ["Saladas"] },
  { id: "molho", nome: "MOLHO DE SALADA DE IOGURTE", categorias: ["Molhos"] },
  { id: "sopa", nome: "SOPA DE LEGUMES", categorias: ["Sopas e Caldos"] },
  { id: "risoto", nome: "RISOTO DE CAMARÃO", categorias: ["Arroz e Risotos", "Peixes e Frutos do Mar"] },
  { id: "peixe", nome: "FILÉ DE PEIXE ASSADO", categorias: ["Peixes e Frutos do Mar"] },
  { id: "feijao", nome: "FEIJÃO SIMPLES", categorias: ["Leguminosas"] },
  { id: "doce", nome: "PUDIM DE LEITE", categorias: ["Sobremesas"] },
];

function ids(lista) {
  return lista.map((item) => item.id);
}

assert.deepEqual(
  ids(filtrarOpcoesCardapio({
    opcoes: receitas,
    filtroCampo: "categorias",
    filtrosRelacionados: CATEGORIAS_RELACIONADAS_RECEITA.salada,
  })),
  ["salada"],
  "Saladas deve excluir molhos que apenas mencionam salada",
);

assert.deepEqual(
  ids(filtrarOpcoesCardapio({
    opcoes: receitas,
    busca: "sopa",
    filtroCampo: "categorias",
    filtrosRelacionados: CATEGORIAS_RELACIONADAS_RECEITA.entrada,
  })),
  ["sopa"],
  "Busca por sopa deve refinar as categorias relacionadas de Entradas",
);

assert.deepEqual(
  ids(filtrarOpcoesCardapio({
    opcoes: receitas,
    filtroCampo: "categorias",
    filtrosRelacionados: CATEGORIAS_RELACIONADAS_RECEITA.prato_principal,
  })),
  ["sopa", "risoto", "peixe"],
  "Pratos principais deve reunir as categorias técnicas relacionadas",
);

assert.deepEqual(
  ids(filtrarOpcoesCardapio({
    opcoes: receitas,
    filtro: "Peixes e Frutos do Mar",
    filtroCampo: "categorias",
    filtrosRelacionados: CATEGORIAS_RELACIONADAS_RECEITA.prato_principal,
  })),
  ["risoto", "peixe"],
  "Categoria explícita deve refinar o grupo relacionado",
);

assert.deepEqual(
  ids(filtrarOpcoesCardapio({
    opcoes: receitas,
    filtroCampo: "categorias",
    filtrosRelacionados: CATEGORIAS_RELACIONADAS_RECEITA.acompanhamento,
  })),
  ["feijao"],
  "Acompanhamentos deve incluir Leguminosas",
);

const ingredientes = [
  { id: "suco", nome: "Limão, siciliano (suco)", categoria: "Frutas" },
  { id: "agua", nome: "Água", categoria: "Diversos" },
];
assert.deepEqual(
  ids(filtrarOpcoesCardapio({
    opcoes: ingredientes,
    busca: "limao suco",
    filtroCampo: "categoria",
    filtrosRelacionados: CATEGORIAS_RELACIONADAS_BEBIDA,
  })),
  ["suco"],
  "Bebidas deve combinar Frutas com busca sem depender de acentos",
);

assert.equal(prioridadeClassificacao("entrada"), 1);
assert.equal(prioridadeClassificacao("guarnicao"), 6, "Guarnição legada equivale a Acompanhamentos");
assert.equal(prioridadeClassificacao(undefined), 9, "Sem classificação fica ao final");

const diaOrdenado = [
  { id: "e1", ordem: 0, classificacao: "entrada" },
  { id: "s1", ordem: 1, classificacao: "salada" },
  { id: "p1", ordem: 2, classificacao: "prato_principal" },
  { id: "d1", ordem: 3, classificacao: "sobremesa" },
  { id: "x1", ordem: 4 },
];

assert.equal(calcularIndiceInsercao(diaOrdenado, "entrada"), 1, "Nova Entrada fica após Entradas existentes");
assert.equal(calcularIndiceInsercao(diaOrdenado, "salada"), 2, "Nova Salada preserva ordem dentro da classe");
assert.equal(calcularIndiceInsercao(diaOrdenado, "segundo_prato"), 3, "Segundo prato entra antes da Sobremesa");
assert.equal(calcularIndiceInsercao(diaOrdenado, "bebida"), 3, "Bebida entra antes da Sobremesa");
assert.equal(calcularIndiceInsercao(diaOrdenado, undefined), 5, "Sem classificação entra ao final");
assert.equal(
  calcularIndiceInsercao([{ classificacao: "sobremesa" }, { classificacao: "entrada" }], "prato_principal"),
  2,
  "A inclusão respeita a posição manual existente sem reordenar itens antigos",
);

assert.equal(toUpperName("  almoço de domingo  "), "ALMOÇO DE DOMINGO", "Eventos, Refeições e Cardápios ficam em maiúsculas");
assert.equal(toUpperName("bolo de cenoura"), "BOLO DE CENOURA", "Receitas ficam em maiúsculas");
assert.equal(toUpperName("molho branco"), "MOLHO BRANCO", "Subtítulos de grupo ficam em maiúsculas");
assert.equal(toSentenceCaseName("BATATA INGLESA"), "Batata inglesa", "Ingredientes ficam com inicial maiúscula");

const sidebarSource = readFileSync(new URL("../src/components/layout/Sidebar.jsx", import.meta.url), "utf8");
const ordemMenuComum = [
  'label: "Ingredientes"',
  'label: "Receitas"',
  'label: "Refeições"',
  'label: "Cardápios"',
  'label: "Eventos"',
];
const posicoesMenu = ordemMenuComum.map((label) => sidebarSource.indexOf(label));
assert.ok(
  posicoesMenu.every((posicao) => posicao >= 0) && posicoesMenu.every((posicao, indice) => indice === 0 || posicao > posicoesMenu[indice - 1]),
  "USER e ADMIN devem compartilhar a ordem Ingredientes → Receitas → Refeições → Cardápios → Eventos",
);
assert.match(
  sidebarSource,
  /\{laboratorioItems\.map\(\(item\) => \(/,
  "O menu comum não pode depender do perfil administrativo",
);

console.log("Etapa 12: 22 verificações funcionais aprovadas.");
