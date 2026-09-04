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
  const filhosRemovidosAntesDoDestino = indiceDestino > indiceOrigem
    ? bloco.length - 1
    : 0;
  const destinoSemFilhosDoBloco = indiceDestino - filhosRemovidosAntesDoDestino;
  let destinoAjustado = Math.max(
    0,
    Math.min(destinoSemFilhosDoBloco, restantes.length),
  );

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

export async function persistirReordenacaoIngredientes({
  itens = [],
  indiceOrigem,
  indiceDestino,
  persistir,
}) {
  const atualizacoes = planejarReordenacaoIngredientes({
    itens,
    indiceOrigem,
    indiceDestino,
  });
  if (!atualizacoes) return null;
  await persistir(atualizacoes);
  return atualizacoes;
}
