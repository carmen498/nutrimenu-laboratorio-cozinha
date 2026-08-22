// Modelo canônico de MedidaCaseira — Fase 7.
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

export function getIngredienteIdMedida(medida) {
  return texto(medida?.ingrediente_id) || texto(medida?.alimento) || null;
}

export function getUtensilioIdMedida(medida) {
  return texto(medida?.utensilio_id) || texto(medida?.utensilio) || null;
}

export function getQuantidadeUtensilioMedida(medida) {
  return numeroPositivo(medida?.quantidade_utensilio) || 1;
}

export function getPesoPorMedidaG(medida) {
  const quantidade = getQuantidadeUtensilioMedida(medida);
  const pesoCanonico = numeroPositivo(medida?.peso_g);
  if (pesoCanonico) return pesoCanonico / quantidade;

  const legado = numeroPositivo(medida?.referencia_g) || numeroPositivo(medida?.equivalencia_g);
  return legado || null;
}

export function getVolumePorMedidaMl(medida) {
  const quantidade = getQuantidadeUtensilioMedida(medida);
  const volumeCanonico = numeroPositivo(medida?.volume_ml);
  if (volumeCanonico) return volumeCanonico / quantidade;

  const legado = numeroPositivo(medida?.equivalencia_ml);
  return legado || null;
}

export function chaveCanonicaMedida(medida) {
  const ingredienteId = getIngredienteIdMedida(medida) || "*";
  const utensilioId = getUtensilioIdMedida(medida) || "*";
  const estado = texto(medida?.estado_alimento) || "não informado";
  return `${ingredienteId}|${utensilioId}|${estado}`;
}

export function normalizarPayloadMedidaCaseira(payload = {}) {
  const ingredienteId = getIngredienteIdMedida(payload);
  const utensilioId = getUtensilioIdMedida(payload);
  const quantidadeUtensilio = getQuantidadeUtensilioMedida(payload);
  const pesoPorMedida = getPesoPorMedidaG(payload);
  const volumePorMedida = getVolumePorMedidaMl(payload);

  const dados = {
    ...payload,
    modelo_versao: MEDIDA_CASEIRA_MODELO_VERSAO,
    ingrediente_id: ingredienteId || "",
    utensilio_id: utensilioId || "",
    quantidade_utensilio: quantidadeUtensilio,
    estado_alimento: ["cru", "pronto", "não informado"].includes(payload.estado_alimento)
      ? payload.estado_alimento
      : "não informado",
    so_gramas: !!payload.so_gramas,
  };

  if (pesoPorMedida) dados.peso_g = pesoPorMedida * quantidadeUtensilio;
  else if (dados.peso_g == null) dados.peso_g = null;

  if (volumePorMedida) dados.volume_ml = volumePorMedida * quantidadeUtensilio;
  else if (dados.volume_ml == null) dados.volume_ml = null;

  // Fase 7: não gerar novos espelhos legados.
  delete dados.alimento;
  delete dados.utensilio;
  delete dados.referencia_g;
  delete dados.equivalencia_g;
  delete dados.equivalencia_ml;
  delete dados.ingrediente_especifico;
  delete dados.medida_pronto_g;

  return dados;
}

export function diagnosticarMedidaCaseira(medida = {}) {
  const problemas = [];
  const ingredienteId = getIngredienteIdMedida(medida);
  const utensilioId = getUtensilioIdMedida(medida);
  const pesoG = getPesoPorMedidaG(medida);
  const volumeMl = getVolumePorMedidaMl(medida);

  if (!utensilioId && !medida.so_gramas) problemas.push("sem_utensilio_id");
  if (!ingredienteId && !medida.so_gramas) problemas.push("sem_ingrediente_id");
  if (!medida.so_gramas && !pesoG && !volumeMl) problemas.push("sem_equivalencia_fisica");

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
