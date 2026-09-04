function ordenarItens(lista) {
  return [...lista].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

export function planejarMovimentoCardapio({
  itens = [],
  dataOrigem,
  indiceOrigem,
  dataDestino,
  indiceDestino,
}) {
  if (dataOrigem !== dataDestino) return null;

  const itensDoDia = ordenarItens(itens.filter((item) => item.data === dataOrigem));
  const itemMovido = itensDoDia[indiceOrigem];
  if (!itemMovido || indiceOrigem === indiceDestino) return null;

  const novaOrdem = [...itensDoDia];
  novaOrdem.splice(indiceOrigem, 1);
  novaOrdem.splice(indiceDestino, 0, itemMovido);

  const afetados = new Map(
    novaOrdem.map((item, ordem) => [item.id, { ...item, data: dataOrigem, ordem }]),
  );

  return {
    movimentacoes: novaOrdem.map((item, ordem) => ({
      id: item.id,
      data: dataOrigem,
      ordem,
    })),
    novosItens: itens.map((item) => afetados.get(item.id) || item),
  };
}
