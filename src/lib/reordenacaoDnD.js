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

export function planejarReordenacaoIngredientes({
  itens = [],
  indiceOrigem,
  indiceDestino,
}) {
  const itemMovido = itens[indiceOrigem];
  if (!itemMovido || indiceOrigem === indiceDestino) return null;

  let fimBloco = indiceOrigem + 1;
  if (itemMovido.isGrupo) {
    while (fimBloco < itens.length && !itens[fimBloco].isGrupo) fimBloco += 1;
  } else if (itemMovido.isSubreceita) {
    while (
      fimBloco < itens.length
      && itens[fimBloco].subreceita_parent_id === itemMovido.id
    ) fimBloco += 1;
  }

  if (indiceDestino > indiceOrigem && indiceDestino < fimBloco) return null;

  const bloco = itens.slice(indiceOrigem, fimBloco);
  const restantes = itens.slice(0, indiceOrigem).concat(itens.slice(fimBloco));
  let destinoAjustado = Math.max(0, Math.min(indiceDestino, restantes.length));

  if (itemMovido.isGrupo) {
    let grupoAnterior = -1;
    for (let indice = 0; indice < destinoAjustado; indice += 1) {
      if (restantes[indice].isGrupo) grupoAnterior = indice;
    }
    if (grupoAnterior >= 0 && destinoAjustado > grupoAnterior) {
      let fimGrupoDestino = grupoAnterior + 1;
      while (fimGrupoDestino < restantes.length && !restantes[fimGrupoDestino].isGrupo) {
        fimGrupoDestino += 1;
      }
      if (destinoAjustado < fimGrupoDestino) destinoAjustado = fimGrupoDestino;
    }
  }

  for (let indice = 0; indice < restantes.length; indice += 1) {
    if (!restantes[indice].isSubreceita) continue;
    let fimSubreceita = indice + 1;
    while (
      fimSubreceita < restantes.length
      && restantes[fimSubreceita].subreceita_parent_id === restantes[indice].id
    ) fimSubreceita += 1;
    if (destinoAjustado > indice && destinoAjustado < fimSubreceita) {
      destinoAjustado = fimSubreceita;
      break;
    }
  }

  const novaOrdem = [
    ...restantes.slice(0, destinoAjustado),
    ...bloco,
    ...restantes.slice(destinoAjustado),
  ];
  return novaOrdem.map((item, indice) => ({ id: item.id, ordem: indice * 10 }));
}
