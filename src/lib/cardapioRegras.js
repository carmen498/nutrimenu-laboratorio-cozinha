export const CATEGORIAS_RELACIONADAS_RECEITA = {
  entrada: ["Entradas", "Sopas e Caldos", "Arroz e Risotos"],
  salada: ["Saladas"],
  prato_principal: [
    "Carnes Bovinas e Suínos", "Aves", "Peixes e Frutos do Mar",
    "Massas, Pastelão e Quiches", "Arroz e Risotos", "Sopas e Caldos",
  ],
  segundo_prato: [
    "Carnes Bovinas e Suínos", "Aves", "Peixes e Frutos do Mar",
    "Massas, Pastelão e Quiches", "Arroz e Risotos", "Sopas e Caldos",
  ],
  acompanhamento: ["Acompanhamentos", "Leguminosas"],
  sobremesa: ["Sobremesas"],
};

export const CATEGORIAS_RELACIONADAS_BEBIDA = ["Frutas"];

export const ORDEM_CLASSIFICACOES = {
  entrada: 1,
  salada: 2,
  refeicao_completa: 3,
  prato_principal: 4,
  segundo_prato: 5,
  acompanhamento: 6,
  guarnicao: 6,
  bebida: 7,
  sobremesa: 8,
  outro: 9,
};

export const ORDEM_SEM_CLASSIFICACAO = 9;

export function prioridadeClassificacao(classificacao) {
  return ORDEM_CLASSIFICACOES[classificacao] || ORDEM_SEM_CLASSIFICACAO;
}

export function calcularIndiceInsercao(itensDoDia = [], classificacao) {
  const prioridadeNova = prioridadeClassificacao(classificacao);
  return itensDoDia.reduce(
    (indice, item, posicao) =>
      prioridadeClassificacao(item.classificacao) <= prioridadeNova ? posicao + 1 : indice,
    0,
  );
}

function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function filtrarOpcoesCardapio({
  opcoes = [],
  busca = "",
  filtro = "",
  filtroCampo,
  filtrosRelacionados,
}) {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  return opcoes.filter((item) => {
    const nome = normalizar(item.nome);
    if (!termos.every((termo) => nome.includes(termo))) return false;

    const valor = item[filtroCampo];
    if (filtro) return Array.isArray(valor) ? valor.includes(filtro) : valor === filtro;
    if (filtrosRelacionados) {
      return Array.isArray(valor)
        ? valor.some((categoria) => filtrosRelacionados.includes(categoria))
        : filtrosRelacionados.includes(valor);
    }
    return true;
  });
}
