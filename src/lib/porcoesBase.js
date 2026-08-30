export function normalizarPorcoesBase(valor, padrao = 1) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : padrao;
}

export async function confirmarPorcoesBase(entity, receitaId, esperado) {
  let receita = await entity.get(receitaId);
  if (Number(receita?.porcoes_base) === Number(esperado)) return receita;

  await entity.update(receitaId, { porcoes_base: esperado });
  receita = await entity.get(receitaId);
  if (Number(receita?.porcoes_base) !== Number(esperado)) {
    throw new Error("Não foi possível confirmar o número de porções da receita importada.");
  }
  return receita;
}