// Sobreposição do padrão de PC (per capita) por categoria — gravado em AppConfig.
// Usado quando o usuário confirma "Sim" na pergunta de atualização do padrão da categoria.
import { base44 } from "@/api/base44Client";
import { getPerCapitaInfo } from "@/lib/perCapitaData";

const PREFIX = "pc_categoria::";

export function chaveCategoria(categoria) {
  return `${PREFIX}${categoria}`;
}

/** Retorna o padrão atual (g) da categoria: sobreposição salva pelo usuário, ou o valor da tabela estática. */
export async function getPadraoCategoria(categoria) {
  if (!categoria) return null;
  const rows = await base44.entities.AppConfig.filter({ chave: chaveCategoria(categoria) });
  if (rows.length > 0) {
    const v = parseFloat(rows[0].valor);
    if (!isNaN(v)) return v;
  }
  const info = getPerCapitaInfo(categoria);
  return info?.g ?? null;
}

/** Grava/atualiza o padrão da categoria na tabela de referência (sobreposição em AppConfig). */
export async function salvarPadraoCategoria(categoria, novoValor) {
  const chave = chaveCategoria(categoria);
  const rows = await base44.entities.AppConfig.filter({ chave });
  if (rows.length > 0) {
    await base44.entities.AppConfig.update(rows[0].id, { valor: String(novoValor) });
  } else {
    await base44.entities.AppConfig.create({ chave, valor: String(novoValor) });
  }
}