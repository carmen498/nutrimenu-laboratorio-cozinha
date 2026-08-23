// Fase 10.4 — espelho frontend da assinatura semântica do custo.
export const CUSTO_ASSINATURA_VERSAO = 2;

const txt = (v) => v == null ? "" : String(v).trim();
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const n = (v) => num(v).toFixed(10);
const norm = (v) => txt(v)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

function fnv1a64(input) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

export function serializarDeterminantesCusto(/** @type {any} */ {
  receita,
  itens = [],
  insumos = [],
  esquecidos = [],
  contexto = "global",
  rendimento = 0,
  resolverIngrediente = (_id) => null,
  resolverPreco = (_ingrediente) => 0,
  resolverAssinaturaSubreceita = (_subreceitaId) => "",
} = {}) {
  const linhas = [
    `V|${CUSTO_ASSINATURA_VERSAO}`,
    `CTX|${txt(contexto) || "global"}`,
    `R|porcoes=${n(receita?.porcoes_base || 1)}|rendimento=${n(rendimento)}|percapita=${n(receita?.per_capita_g)}|unidade=${txt(receita?.unidade_base || "g")}`,
  ];

  const composicao = [];
  for (const item of itens || []) {
    if (!item || item.tipo === "grupo") continue;
    if (item.tipo === "subreceita") {
      composicao.push([
        "S",
        txt(item.subreceita_id),
        n(item.quantidade_por_porcao),
        txt(item.unidade_quantidade),
        txt(resolverAssinaturaSubreceita(txt(item.subreceita_id))),
      ].join("|"));
      continue;
    }

    const ingrediente = item.ingrediente_id ? resolverIngrediente(txt(item.ingrediente_id)) : null;
    const preco = ingrediente ? resolverPreco(ingrediente) : 0;
    const fcOverride = num(item.fator_correcao_override);
    const fcMestre = num(ingrediente?.fator_correcao);
    const fc = fcOverride > 0 ? fcOverride : (fcMestre > 0 ? fcMestre : 1);
    composicao.push([
      "I",
      txt(item.ingrediente_id),
      norm(item.ingrediente_nome),
      norm(ingrediente?.nome),
      n(item.quantidade_por_porcao),
      n(fc),
      n(preco),
      txt(item.custo_comportamento),
      item.subreceita_cache === true ? "cache" : "direto",
    ].join("|"));
  }
  linhas.push(...composicao.sort());

  const linhasInsumos = (insumos || []).map((item) => [
    "N",
    txt(item.insumo_id),
    norm(item.insumo_nome || item.nome),
    n(item.quantidade),
    n(item.custo_unitario),
    txt(item.comportamento_custo || "por_lote"),
    n(item.modelo_custo_versao || 1),
  ].join("|")).sort();
  linhas.push(...linhasInsumos);

  const linhasEsquecidos = (esquecidos || []).map((item) => {
    const ingrediente = item.ingrediente_id ? resolverIngrediente(txt(item.ingrediente_id)) : null;
    const preco = ingrediente ? resolverPreco(ingrediente) : 0;
    const fc = ingrediente && num(ingrediente.fator_correcao) > 0 ? num(ingrediente.fator_correcao) : 1;
    return [
      "E",
      txt(item.ingrediente_id),
      norm(item.nome),
      norm(ingrediente?.nome),
      n(item.quantidade_g),
      n(fc),
      n(preco),
      n(item.custo_unitario),
      n(item.custo_total),
    ].join("|");
  }).sort();
  linhas.push(...linhasEsquecidos);

  return linhas.join("\n");
}

export function gerarAssinaturaCusto(args = {}) {
  const serializado = serializarDeterminantesCusto(args);
  return `custo-v${CUSTO_ASSINATURA_VERSAO}-${fnv1a64(serializado)}`;
}
