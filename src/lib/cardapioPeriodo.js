import { base44 } from "@/api/base44Client";
import { calcularIndiceInsercao } from "@/lib/cardapioRegras";

const TIPOS_ORIGEM = new Set(["refeicao", "receita", "ingrediente"]);
const IDENTIFICACOES = new Set(["refeicao", "almoco", "jantar"]);
const CLASSIFICACOES = new Set([
  "entrada", "salada", "refeicao_completa", "prato_principal", "segundo_prato",
  "acompanhamento", "guarnicao", "bebida", "sobremesa", "outro",
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
  if (dataUtc(dataInicio).getUTCDay() !== 1) throw new Error("O início da semana deve ser uma segunda-feira.");
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

  const itensDoCardapio = await listarItensCardapioPeriodo(cardapio.id);
  const itensDoDia = (itensDoCardapio || [])
    .filter((item) => item.data === payload.data)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const indiceInsercao = calcularIndiceInsercao(itensDoDia, classificacao);
  const afetados = itensDoDia.slice(indiceInsercao);

  try {
    for (let indice = afetados.length - 1; indice >= 0; indice -= 1) {
      const item = afetados[indice];
      await base44.entities.CardapioPeriodoItem.update(item.id, { ordem: indiceInsercao + indice + 1 });
    }

    return await base44.entities.CardapioPeriodoItem.create({
      cardapio_periodo_id: cardapio.id,
      data: payload.data,
      dia_semana: diaSemanaDaData(payload.data),
      tipo_origem: payload.tipo_origem,
      origem_id: origem.id,
      nome_cache: origem.nome || payload.nome_cache || "Item sem nome",
      ordem: indiceInsercao,
      ...(classificacao ? { classificacao } : {}),
    });
  } catch (erro) {
    for (let indice = 0; indice < afetados.length; indice += 1) {
      await base44.entities.CardapioPeriodoItem
        .update(afetados[indice].id, { ordem: indiceInsercao + indice })
        .catch(() => undefined);
    }
    throw erro;
  }
}

export function listarItensCardapioPeriodo(cardapioPeriodoId, limit = 5000) {
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

export async function reorganizarItensCardapioPeriodo(cardapioPeriodoId, movimentacoes = []) {
  if (!cardapioPeriodoId) throw new Error("Cardápio é obrigatório.");
  if (!Array.isArray(movimentacoes) || movimentacoes.length === 0) return [];

  const cardapio = await base44.entities.CardapioPeriodo.get(cardapioPeriodoId);
  if (!cardapio) throw new Error("Cardápio não encontrado.");

  const ids = new Set();
  for (const movimento of movimentacoes) {
    if (!movimento?.id || ids.has(movimento.id)) throw new Error("Movimentação inválida.");
    ids.add(movimento.id);
    validarDataNoPeriodo(movimento.data, cardapio);
  }

  const itens = await Promise.all(
    movimentacoes.map((movimento) => base44.entities.CardapioPeriodoItem.get(movimento.id)),
  );
  if (itens.some((item) => !item || item.cardapio_periodo_id !== cardapioPeriodoId)) {
    throw new Error("Um dos itens não pertence a este Cardápio.");
  }

  const atualizados = [];
  for (const movimento of movimentacoes) {
    atualizados.push(await base44.entities.CardapioPeriodoItem.update(movimento.id, {
      data: movimento.data,
      dia_semana: diaSemanaDaData(movimento.data),
      ordem: Math.max(0, Number.parseInt(String(movimento.ordem ?? 0), 10) || 0),
    }));
  }
  return atualizados;
}

export function removerItemCardapioPeriodo(itemId) {
  return base44.entities.CardapioPeriodoItem.delete(itemId);
}

export async function duplicarCardapioPeriodo(id, payload = {}) {
  const original = await base44.entities.CardapioPeriodo.get(id);
  if (!original) throw new Error("Cardápio não encontrado.");

  const novaDataInicio = payload.data_inicio;
  if (dataUtc(novaDataInicio).getUTCDay() !== 1) {
    throw new Error("O início da nova semana deve ser uma segunda-feira.");
  }

  const itensOriginais = await listarItensCardapioPeriodo(id);
  const diferencaDias = Math.round(
    (dataUtc(novaDataInicio).getTime() - dataUtc(original.data_inicio).getTime()) / 86400000,
  );
  const novo = await criarCardapioPeriodo({
    nome: payload.nome?.trim() || `${original.nome} — cópia`,
    data_inicio: novaDataInicio,
    identificacao_refeicao: original.identificacao_refeicao,
    observacoes: original.observacoes || "",
    status: "rascunho",
  });

  const criados = [];
  try {
    for (const item of itensOriginais || []) {
      const novaData = dataUtc(item.data);
      novaData.setUTCDate(novaData.getUTCDate() + diferencaDias);
      criados.push(await base44.entities.CardapioPeriodoItem.create({
        cardapio_periodo_id: novo.id,
        data: isoData(novaData),
        dia_semana: diaSemanaDaData(isoData(novaData)),
        tipo_origem: item.tipo_origem,
        origem_id: item.origem_id,
        nome_cache: item.nome_cache,
        ordem: item.ordem || 0,
        ...(item.classificacao ? { classificacao: item.classificacao } : {}),
      }));
    }
    return novo;
  } catch (erro) {
    for (const item of criados) {
      await base44.entities.CardapioPeriodoItem.delete(item.id).catch(() => undefined);
    }
    await base44.entities.CardapioPeriodo.delete(novo.id).catch(() => undefined);
    throw erro;
  }
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
