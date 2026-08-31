import { base44 } from "@/api/base44Client";

const TIPOS_ORIGEM = new Set(["refeicao", "receita", "ingrediente"]);
const IDENTIFICACOES = new Set(["refeicao", "almoco", "jantar"]);
const CLASSIFICACOES = new Set([
  "entrada", "salada", "prato_principal", "segundo_prato", "acompanhamento",
  "guarnicao", "sobremesa", "bebida", "outro",
]);
const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function dataUtc(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) throw new Error("Data inválida.");
  const valor = new Date(`${data}T00:00:00.000Z`);
  if (Number.isNaN(valor.getTime()) || valor.toISOString().slice(0, 10) !== data) {
    throw new Error("Data inválida.");
  }
  return valor;
}

function isoData(data) {
  return data.toISOString().slice(0, 10);
}

export function calcularDataFimCardapio(dataInicio) {
  const fim = dataUtc(dataInicio);
  fim.setUTCDate(fim.getUTCDate() + 6);
  return isoData(fim);
}

export function diaSemanaDaData(data) {
  return DIAS[dataUtc(data).getUTCDay()];
}

function formatarPeriodo(dataInicio, dataFim) {
  const fmt = (data) => dataUtc(data).toLocaleDateString("pt-BR", {
    timeZone: "UTC", day: "2-digit", month: "2-digit",
  });
  return `Semana de ${fmt(dataInicio)} a ${fmt(dataFim)}`;
}

function validarDataNoPeriodo(data, cardapio) {
  const alvo = dataUtc(data).getTime();
  const inicio = dataUtc(cardapio.data_inicio).getTime();
  const fim = dataUtc(cardapio.data_fim).getTime();
  if (alvo < inicio || alvo > fim) throw new Error("O item deve ficar dentro do período do cardápio.");
}

async function origemAcessivel(tipoOrigem, origemId) {
  const entidades = {
    refeicao: base44.entities.Cardapio,
    receita: base44.entities.Receita,
    ingrediente: base44.entities.Ingrediente,
  };
  const origem = await entidades[tipoOrigem].get(origemId);
  if (!origem) throw new Error("Item de origem não encontrado.");
  return origem;
}

export async function criarCardapioPeriodo(payload = {}) {
  const dataInicio = payload.data_inicio;
  const dataFim = calcularDataFimCardapio(dataInicio);
  const identificacao = payload.identificacao_refeicao || "refeicao";
  if (!IDENTIFICACOES.has(identificacao)) throw new Error("Identificação da refeição inválida.");

  return base44.entities.CardapioPeriodo.create({
    nome: payload.nome?.trim() || formatarPeriodo(dataInicio, dataFim),
    tipo_periodo: "semanal",
    data_inicio: dataInicio,
    data_fim: dataFim,
    identificacao_refeicao: identificacao,
    observacoes: payload.observacoes?.trim() || "",
    status: payload.status === "ativo" ? "ativo" : "rascunho",
  });
}

export function listarCardapiosPeriodo(sort = "-data_inicio", limit = 100) {
  return base44.entities.CardapioPeriodo.list(sort, limit);
}

export function obterCardapioPeriodo(id) {
  if (!id) throw new Error("Cardápio é obrigatório.");
  return base44.entities.CardapioPeriodo.get(id);
}

export async function atualizarCardapioPeriodo(id, payload = {}) {
  const atual = await base44.entities.CardapioPeriodo.get(id);
  if (!atual) throw new Error("Cardápio não encontrado.");

  const dados = {};
  if (payload.nome !== undefined) dados.nome = payload.nome.trim() || atual.nome;
  if (payload.observacoes !== undefined) dados.observacoes = payload.observacoes.trim();
  if (payload.identificacao_refeicao !== undefined) {
    if (!IDENTIFICACOES.has(payload.identificacao_refeicao)) throw new Error("Identificação da refeição inválida.");
    dados.identificacao_refeicao = payload.identificacao_refeicao;
  }
  if (payload.status !== undefined) {
    if (!["rascunho", "ativo", "arquivado"].includes(payload.status)) throw new Error("Status inválido.");
    dados.status = payload.status;
  }
  return base44.entities.CardapioPeriodo.update(id, dados);
}

export async function criarCardapioPeriodoItem(payload = {}) {
  if (!TIPOS_ORIGEM.has(payload.tipo_origem)) throw new Error("Tipo de origem inválido.");
  if (!payload.cardapio_periodo_id) throw new Error("Cardápio é obrigatório.");
  if (!payload.origem_id) throw new Error("Item de origem é obrigatório.");

  const cardapio = await base44.entities.CardapioPeriodo.get(payload.cardapio_periodo_id);
  if (!cardapio) throw new Error("Cardápio não encontrado.");
  validarDataNoPeriodo(payload.data, cardapio);

  const origem = await origemAcessivel(payload.tipo_origem, payload.origem_id);
  const classificacao = CLASSIFICACOES.has(payload.classificacao) ? payload.classificacao : undefined;

  return base44.entities.CardapioPeriodoItem.create({
    cardapio_periodo_id: cardapio.id,
    data: payload.data,
    dia_semana: diaSemanaDaData(payload.data),
    tipo_origem: payload.tipo_origem,
    origem_id: origem.id,
    nome_cache: origem.nome || payload.nome_cache || "Item sem nome",
    ordem: Math.max(0, Number.parseInt(String(payload.ordem ?? 0), 10) || 0),
    ...(classificacao ? { classificacao } : {}),
  });
}

export function listarItensCardapioPeriodo(cardapioPeriodoId, limit = 500) {
  return base44.entities.CardapioPeriodoItem.filter(
    { cardapio_periodo_id: cardapioPeriodoId },
    "data",
    limit,
  );
}

export async function moverItemCardapioPeriodo(itemId, { data, ordem = 0 }) {
  const item = await base44.entities.CardapioPeriodoItem.get(itemId);
  if (!item) throw new Error("Item não encontrado.");
  const cardapio = await base44.entities.CardapioPeriodo.get(item.cardapio_periodo_id);
  if (!cardapio) throw new Error("Cardápio não encontrado.");
  validarDataNoPeriodo(data, cardapio);

  return base44.entities.CardapioPeriodoItem.update(itemId, {
    data,
    dia_semana: diaSemanaDaData(data),
    ordem: Math.max(0, Number.parseInt(String(ordem ?? 0), 10) || 0),
  });
}

export function removerItemCardapioPeriodo(itemId) {
  return base44.entities.CardapioPeriodoItem.delete(itemId);
}

export async function excluirCardapioPeriodo(id) {
  const cardapio = await base44.entities.CardapioPeriodo.get(id);
  if (!cardapio) throw new Error("Cardápio não encontrado.");
  const itens = await listarItensCardapioPeriodo(id);
  for (const item of itens || []) {
    await base44.entities.CardapioPeriodoItem.delete(item.id);
  }
  return base44.entities.CardapioPeriodo.delete(id);
}
