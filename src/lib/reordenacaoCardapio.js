export function ordenarItensCardapio(lista) {
  return [...lista].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

export function planejarMovimentoCardapio({
  itens = [],
  dataOrigem,
  indiceOrigem,
  dataDestino,
  indiceDestino,
}) {
  const origem = ordenarItensCardapio(itens.filter((item) => item.data === dataOrigem));
  const destino = dataOrigem === dataDestino
    ? origem
    : ordenarItensCardapio(itens.filter((item) => item.data === dataDestino));
  const itemMovido = origem[indiceOrigem];
  if (!itemMovido) return null;
  if (dataOrigem === dataDestino && indiceOrigem === indiceDestino) return null;

  let novaOrigem;
  let novoDestino;
  if (dataOrigem === dataDestino) {
    novoDestino = [...origem];
    novoDestino.splice(indiceOrigem, 1);
    novoDestino.splice(indiceDestino, 0, itemMovido);
    novaOrigem = novoDestino;
  } else {
    novaOrigem = origem.filter((item) => item.id !== itemMovido.id);
    novoDestino = [...destino];
    novoDestino.splice(indiceDestino, 0, { ...itemMovido, data: dataDestino });
  }

  const afetados = new Map();
  novaOrigem.forEach((item, ordem) => {
    afetados.set(item.id, { ...item, data: dataOrigem, ordem });
  });
  if (dataOrigem !== dataDestino) {
    novoDestino.forEach((item, ordem) => {
      afetados.set(item.id, { ...item, data: dataDestino, ordem });
    });
  }

  return {
    movimentacoes: [...afetados.values()].map((item) => ({
      id: item.id,
      data: item.data,
      ordem: item.ordem,
    })),
    novosItens: itens.map((item) => afetados.get(item.id) || item),
  };
}

export function executarMovimentoCardapio({
  itens = [],
  dataOrigem,
  indiceOrigem,
  dataDestino,
  indiceDestino,
  aplicarPlano,
}) {
  const plano = planejarMovimentoCardapio({
    itens,
    dataOrigem,
    indiceOrigem,
    dataDestino,
    indiceDestino,
  });
  if (!plano) return null;
  aplicarPlano(plano);
  return plano;
}
