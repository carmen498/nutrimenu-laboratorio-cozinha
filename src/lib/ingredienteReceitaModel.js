// Modelo canônico de IngredienteReceita — Fase 6.
//
// Objetivos:
// - manter `ingrediente_id`, `subreceita_id` e `medida_caseira_id` como referências canônicas;
// - impedir combinações incoerentes entre tipo=ingrediente, grupo e subreceita;
// - preservar caches legados somente para compatibilidade de leitura/migração;
// - marcar novos registros com modelo_versao=2.

export const INGREDIENTE_RECEITA_MODELO_VERSAO = 2;
export const TIPOS_INGREDIENTE_RECEITA = new Set(["ingrediente", "grupo", "subreceita"]);

const numeroNaoNegativo = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const numeroPositivo = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const texto = (valor) => typeof valor === "string" ? valor.trim() : "";

export function inferirTipoIngredienteReceita(payload = {}) {
  if (payload.tipo && TIPOS_INGREDIENTE_RECEITA.has(payload.tipo)) return payload.tipo;
  if (payload.subreceita_id) return "subreceita";
  if (payload.titulo_grupo) return "grupo";
  return "ingrediente";
}

/**
 * Normaliza um NOVO registro antes do create. Campos cache legados podem continuar
 * presentes em payloads antigos, mas nunca são usados para decidir identidade/tipo.
 */
export function normalizarNovoIngredienteReceita(payload = {}, receita = null) {
  const dados = { ...payload };
  const tipo = inferirTipoIngredienteReceita(dados);
  const unidadePadrao = receita?.unidade_base === "ml" ? "ml" : "g";

  dados.modelo_versao = INGREDIENTE_RECEITA_MODELO_VERSAO;
  dados.tipo = tipo;
  dados.proporcional = dados.proporcional !== false;
  dados.ordem = numeroNaoNegativo(dados.ordem, 0);

  if (tipo === "grupo") {
    dados.titulo_grupo = texto(dados.titulo_grupo).toUpperCase();
    dados.ingrediente_id = "";
    dados.subreceita_id = "";
    dados.quantidade_por_porcao = 0;
    dados.fator_correcao_override = 0;
    dados.medida_caseira_id = "";
    delete dados.quantidade_medida_caseira;
    delete dados.unidade_quantidade;
    delete dados.pre_preparo;
    return dados;
  }

  dados.quantidade_por_porcao = numeroNaoNegativo(dados.quantidade_por_porcao, 0);
  dados.unidade_quantidade = dados.unidade_quantidade === "ml" || dados.unidade_quantidade === "g"
    ? dados.unidade_quantidade
    : unidadePadrao;
  dados.pre_preparo = texto(dados.pre_preparo);

  if (tipo === "subreceita") {
    dados.ingrediente_id = "";
    dados.fator_correcao_override = 0;
    dados.medida_caseira_id = "";
    delete dados.quantidade_medida_caseira;
    delete dados.titulo_grupo;
    return dados;
  }

  // tipo=ingrediente
  dados.subreceita_id = "";
  dados.fator_correcao_override = numeroPositivo(dados.fator_correcao_override);
  dados.medida_caseira_id = texto(dados.medida_caseira_id);
  if (dados.quantidade_medida_caseira !== undefined) {
    const qtdMc = numeroPositivo(dados.quantidade_medida_caseira);
    if (qtdMc > 0) dados.quantidade_medida_caseira = qtdMc;
    else delete dados.quantidade_medida_caseira;
  }
  delete dados.titulo_grupo;
  return dados;
}

/**
 * Validação não destrutiva. Durante a transição, registros antigos sem ID são
 * classificados como legado em vez de serem apagados ou rejeitados na leitura.
 */
export function diagnosticarIngredienteReceita(item = {}) {
  const tipo = inferirTipoIngredienteReceita(item);
  const problemas = [];

  if (!item.receita_id) problemas.push("sem_receita_id");
  if (tipo === "ingrediente" && !item.ingrediente_id) problemas.push("ingrediente_sem_id");
  if (tipo === "subreceita" && !item.subreceita_id) problemas.push("subreceita_sem_id");
  if (tipo === "grupo" && !texto(item.titulo_grupo)) problemas.push("grupo_sem_titulo");

  if (tipo === "ingrediente" && item.subreceita_id) problemas.push("ingrediente_com_subreceita_id");
  if (tipo === "subreceita" && item.ingrediente_id) problemas.push("subreceita_com_ingrediente_id");
  if (tipo === "grupo" && (item.ingrediente_id || item.subreceita_id)) problemas.push("grupo_com_referencia");

  const versao = Number(item.modelo_versao) || 1;
  return {
    tipo,
    modeloVersao: versao,
    legado: versao < INGREDIENTE_RECEITA_MODELO_VERSAO,
    valido: problemas.length === 0,
    problemas,
  };
}

/**
 * Resolve nomes para exibição dando preferência às entidades relacionadas.
 * Os campos *_nome ficam apenas como fallback para registros legados/cache.
 */
export function resolverNomeIngredienteReceita(item, ingredienteMap = {}, receitaMap = {}) {
  const tipo = inferirTipoIngredienteReceita(item);
  if (tipo === "grupo") return texto(item?.titulo_grupo);
  if (tipo === "subreceita") {
    return texto(receitaMap[item?.subreceita_id]?.nome) || texto(item?.subreceita_nome) || "Sub-receita";
  }
  return texto(ingredienteMap[item?.ingrediente_id]?.nome) || texto(item?.ingrediente_nome) || "Ingrediente";
}

/**
 * Hidrata somente a camada de leitura. Não grava caches derivados no banco.
 */
export function hidratarIngredienteReceita(item, ingredienteMap = {}, receitaMap = {}) {
  const tipo = inferirTipoIngredienteReceita(item);
  const nome = resolverNomeIngredienteReceita(item, ingredienteMap, receitaMap);
  const diagnostico = diagnosticarIngredienteReceita(item);

  return {
    ...item,
    tipo,
    ingrediente_nome: tipo === "ingrediente" ? nome : (item.ingrediente_nome || ""),
    subreceita_nome: tipo === "subreceita" ? nome : (item.subreceita_nome || ""),
    _modelo: diagnostico,
  };
}
