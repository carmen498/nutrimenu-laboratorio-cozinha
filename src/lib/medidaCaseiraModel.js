// Modelo canônico de MedidaCaseira — Fase 7/7.1.
//
// Referências canônicas:
// - ingrediente_id -> Ingrediente
// - utensilio_id -> UtensilioPadrao
// - quantidade_utensilio + peso_g/volume_ml -> equivalência física
// Campos legados permanecem apenas como fallback de leitura/migração.

export const MEDIDA_CASEIRA_MODELO_VERSAO = 2;

const numeroPositivo = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const texto = (valor) => typeof valor === "string" ? valor.trim() : "";

export function getIngredienteIdMedida(/** @type {any} */ medida) {
  return texto(medida?.ingrediente_id) || texto(medida?.alimento) || null;
}

export function getUtensilioIdMedida(/** @type {any} */ medida) {
  if (medida?.so_gramas) return null;
  return texto(medida?.utensilio_id) || texto(medida?.utensilio) || null;
}

export function getQuantidadeUtensilioMedida(/** @type {any} */ medida) {
  return numeroPositivo(medida?.quantidade_utensilio) || 1;
}

export function getPesoPorMedidaG(/** @type {any} */ medida) {
  const quantidade = getQuantidadeUtensilioMedida(medida);
  const pesoCanonico = numeroPositivo(medida?.peso_g);
  if (pesoCanonico) return pesoCanonico / quantidade;

  const legado = numeroPositivo(medida?.referencia_g) || numeroPositivo(medida?.equivalencia_g);
  return legado || null;
}

export function getVolumePorMedidaMl(/** @type {any} */ medida) {
  const quantidade = getQuantidadeUtensilioMedida(medida);
  const volumeCanonico = numeroPositivo(medida?.volume_ml);
  if (volumeCanonico) return volumeCanonico / quantidade;

  const legado = numeroPositivo(medida?.equivalencia_ml);
  return legado || null;
}

export function chaveCanonicaMedida(/** @type {any} */ medida) {
  const ingredienteId = getIngredienteIdMedida(medida) || "*";
  const utensilioId = medida?.so_gramas ? "*" : (getUtensilioIdMedida(medida) || "*");
  const estado = texto(medida?.estado_alimento) || "não informado";
  return `${ingredienteId}|${utensilioId}|${estado}`;
}

/**
 * Normaliza payload de criação/edição.
 * `manterCacheRuntime` mantém apenas referencia_g como cache temporário porque
 * o módulo legado de conversão ainda existe em alguns consumidores. Nenhum novo
 * vínculo é gravado em alimento/utensilio/ingrediente_especifico/equivalencia_*.
 */
export function normalizarPayloadMedidaCaseira(/** @type {any} */ payload = {}, { manterCacheRuntime = true } = {}) {
  const ingredienteId = getIngredienteIdMedida(payload);
  const utensilioId = payload.so_gramas ? null : getUtensilioIdMedida(payload);
  const quantidadeUtensilio = getQuantidadeUtensilioMedida(payload);
  const pesoPorMedida = getPesoPorMedidaG(payload);
  const volumePorMedida = getVolumePorMedidaMl(payload);
  const estado = ["cru", "pronto", "não informado"].includes(payload.estado_alimento)
    ? payload.estado_alimento
    : "não informado";

  const dados = {
    ...payload,
    modelo_versao: MEDIDA_CASEIRA_MODELO_VERSAO,
    ingrediente_id: ingredienteId || "",
    utensilio_id: payload.so_gramas ? "" : (utensilioId || ""),
    quantidade_utensilio: quantidadeUtensilio,
    estado_alimento: estado,
    so_gramas: !!payload.so_gramas,
  };

  if (pesoPorMedida) dados.peso_g = pesoPorMedida * quantidadeUtensilio;
  else if (dados.peso_g == null) dados.peso_g = null;

  if (volumePorMedida) dados.volume_ml = volumePorMedida * quantidadeUtensilio;
  else if (dados.volume_ml == null) dados.volume_ml = null;

  dados.chave_canonica = `${dados.ingrediente_id || "*"}|${dados.so_gramas ? "*" : (dados.utensilio_id || "*")}|${estado}`;

  delete dados.alimento;
  delete dados.utensilio;
  delete dados.equivalencia_g;
  delete dados.equivalencia_ml;
  delete dados.ingrediente_especifico;
  delete dados.medida_pronto_g;

  if (manterCacheRuntime && pesoPorMedida) dados.referencia_g = pesoPorMedida;
  else delete dados.referencia_g;

  return dados;
}

export function diagnosticarMedidaCaseira(/** @type {any} */ medida = {}) {
  const problemas = [];
  const ingredienteId = getIngredienteIdMedida(medida);
  const utensilioId = getUtensilioIdMedida(medida);
  const pesoG = getPesoPorMedidaG(medida);
  const volumeMl = getVolumePorMedidaMl(medida);

  if (!ingredienteId) problemas.push("sem_ingrediente_id");
  if (!utensilioId && !medida.so_gramas) problemas.push("sem_utensilio_id");
  if (!medida.so_gramas && !pesoG && !volumeMl) problemas.push("sem_equivalencia_fisica");
  if (numeroPositivo(medida.medida_pronto_g)) problemas.push("medida_pronto_legada_a_separar");

  const versao = Number(medida.modelo_versao) || 1;
  return {
    modeloVersao: versao,
    legado: versao < MEDIDA_CASEIRA_MODELO_VERSAO,
    valido: problemas.length === 0,
    problemas,
    ingredienteId,
    utensilioId,
    pesoPorMedidaG: pesoG,
    volumePorMedidaMl: volumeMl,
    chaveCanonica: chaveCanonicaMedida(medida),
  };
}
