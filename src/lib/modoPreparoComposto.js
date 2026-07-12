import { formatarModoPreparo } from "./formatarModoPreparo";

/**
 * Calcula os blocos do Modo de Preparo Composto.
 * Lê o modo de preparo das sub-receitas POR REFERÊNCIA (do mapa de receitas).
 * Não altera nenhum dado — somente leitura.
 *
 * @param {Array} itensOrdenados - Itens da ficha ordenados (com tipo, subreceita_id, etc.)
 * @param {Object} receitasMap - Mapa id → receita para look up de sub-receitas
 * @param {string} modoPreparoMae - Modo de preparo da receita-mãe
 * @returns {Array} Array de blocos: [{ tipo: "subreceita"|"montagem", nome, passos, vazio }]
 */
export function calcularModoPreparoComposto(itensOrdenados, receitasMap, modoPreparoMae) {
  const blocos = [];
  const vistas = new Set();

  for (const item of itensOrdenados) {
    if (item.tipo !== "subreceita" || !item.subreceita_id) continue;
    if (item.subreceita_parent_id) continue; // filho explodido, não é marcador
    if (vistas.has(item.subreceita_id)) continue; // já mostrou na primeira ocorrência
    vistas.add(item.subreceita_id);

    const subRec = receitasMap[item.subreceita_id];
    const nome = item.subreceita_nome || subRec?.nome || "—";
    const passos = subRec ? formatarModoPreparo(subRec.modo_preparo) : [];
    blocos.push({ tipo: "subreceita", nome, passos, vazio: passos.length === 0 });
  }

  const passosMae = formatarModoPreparo(modoPreparoMae);
  blocos.push({ tipo: "montagem", nome: "Montagem", passos: passosMae, vazio: passosMae.length === 0 });

  return blocos;
}