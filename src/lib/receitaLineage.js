export const RECEITA_LINHAGEM_VERSAO = 1;

export const TIPOS_LINHAGEM_RECEITA = Object.freeze({
  CATALOGO: "catalogo",
  AUTORAL: "autoral",
  PERSONALIZACAO: "personalizacao",
  DUPLICACAO: "duplicacao",
  IMPORTACAO: "importacao",
});

export const STATUS_LINHAGEM_RECEITA = Object.freeze({
  CANONICA: "canonica",
  A_VALIDAR: "a_validar",
  ORIGEM_AUSENTE: "origem_ausente",
  CICLO: "ciclo",
});

const texto = (valor) => (valor == null ? "" : String(valor).trim());
const numeroInteiro = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
};

export function resolverReceitaOrigemId(receita) {
  return texto(receita?.receita_origem_id) || texto(receita?.forked_from_id);
}

export function resolverReceitaRaizId(receita) {
  return texto(receita?.receita_raiz_id)
    || resolverReceitaOrigemId(receita)
    || texto(receita?.id);
}

export function resolverDonoReceitaId(receita) {
  return texto(receita?.usuario_dono_id) || texto(receita?.created_by_id);
}

export function construirLinhagemRaiz({ isBase, tipo } = {}) {
  return {
    receita_origem_id: "",
    forked_from_id: "",
    receita_raiz_id: "",
    linhagem_geracao: 0,
    linhagem_tipo: tipo || (isBase ? TIPOS_LINHAGEM_RECEITA.CATALOGO : TIPOS_LINHAGEM_RECEITA.AUTORAL),
    linhagem_versao: RECEITA_LINHAGEM_VERSAO,
    linhagem_status: STATUS_LINHAGEM_RECEITA.CANONICA,
  };
}

export function construirLinhagemDerivada(origem, tipo = TIPOS_LINHAGEM_RECEITA.PERSONALIZACAO) {
  if (!origem?.id) throw new Error("Receita de origem é obrigatória para criar uma derivação.");

  const raizId = resolverReceitaRaizId(origem) || origem.id;
  const geracaoOrigem = numeroInteiro(origem.linhagem_geracao, raizId === origem.id ? 0 : 1);
  const personalizacao = tipo === TIPOS_LINHAGEM_RECEITA.PERSONALIZACAO;

  return {
    receita_origem_id: origem.id,
    forked_from_id: personalizacao ? origem.id : "",
    receita_raiz_id: raizId,
    linhagem_geracao: geracaoOrigem + 1,
    linhagem_tipo: tipo,
    linhagem_versao: RECEITA_LINHAGEM_VERSAO,
    linhagem_status: STATUS_LINHAGEM_RECEITA.CANONICA,
  };
}

/**
 * Campos de linhagem/propriedade nunca devem vazar por spread ao criar uma nova
 * receita independente. Derivações explícitas devem usar __linhagem em
 * criarReceitaSegura().
 */
export function removerMetadadosLinhagem(payload = {}) {
  const {
    is_base,
    usuario_dono_id,
    data_personalizacao,
    forked_from_id,
    receita_origem_id,
    receita_raiz_id,
    linhagem_geracao,
    linhagem_tipo,
    linhagem_versao,
    linhagem_status,
    __linhagem,
    ...dados
  } = payload;
  return dados;
}

function seguirRaiz(receita, receitaMap) {
  const visitados = [];
  let atual = receita;

  while (atual) {
    const id = texto(atual.id);
    if (!id) return { status: STATUS_LINHAGEM_RECEITA.A_VALIDAR, raizId: "", visitados };
    if (visitados.includes(id)) {
      return { status: STATUS_LINHAGEM_RECEITA.CICLO, raizId: "", visitados: [...visitados, id] };
    }
    visitados.push(id);

    const origemA = texto(atual.receita_origem_id);
    const origemB = texto(atual.forked_from_id);
    if (origemA && origemB && origemA !== origemB) {
      return { status: STATUS_LINHAGEM_RECEITA.A_VALIDAR, raizId: "", visitados, conflito: true };
    }
    const parentId = origemA || origemB;
    if (!parentId) return { status: STATUS_LINHAGEM_RECEITA.CANONICA, raizId: id, visitados };

    const parent = receitaMap?.[parentId];
    if (!parent) {
      return { status: STATUS_LINHAGEM_RECEITA.ORIGEM_AUSENTE, raizId: "", visitados, origemAusenteId: parentId };
    }
    atual = parent;
  }

  return { status: STATUS_LINHAGEM_RECEITA.A_VALIDAR, raizId: "", visitados };
}

export function diagnosticarLinhagemReceita(receita, receitaMap = {}) {
  const problemas = [];
  const origemA = texto(receita?.receita_origem_id);
  const origemB = texto(receita?.forked_from_id);
  const owner = texto(receita?.usuario_dono_id);
  const isBase = receita?.is_base !== false;

  if (origemA && origemB && origemA !== origemB) problemas.push("origens_conflitantes");
  if (origemA === receita?.id || origemB === receita?.id) problemas.push("auto_referencia");
  if (isBase && owner) problemas.push("base_com_dono");
  if (!isBase && !owner && !receita?.created_by_id) problemas.push("pessoal_sem_dono");
  if (!texto(receita?.receita_raiz_id)) problemas.push("raiz_ausente");
  if (numeroInteiro(receita?.linhagem_versao, 0) < RECEITA_LINHAGEM_VERSAO) problemas.push("modelo_legado");
  if (!texto(receita?.linhagem_tipo)) problemas.push("tipo_ausente");

  const cadeia = seguirRaiz(receita, receitaMap);
  if (cadeia.status === STATUS_LINHAGEM_RECEITA.CICLO) problemas.push("ciclo");
  if (cadeia.status === STATUS_LINHAGEM_RECEITA.ORIGEM_AUSENTE) problemas.push("origem_ausente");
  if (cadeia.conflito && !problemas.includes("origens_conflitantes")) problemas.push("origens_conflitantes");

  const raizPersistida = texto(receita?.receita_raiz_id);
  if (cadeia.raizId && raizPersistida && cadeia.raizId !== raizPersistida) problemas.push("raiz_incorreta");

  const geracaoEsperada = Math.max(0, cadeia.visitados.length - 1);
  if (
    cadeia.status === STATUS_LINHAGEM_RECEITA.CANONICA
    && numeroInteiro(receita?.linhagem_geracao, -1) !== geracaoEsperada
  ) problemas.push("geracao_incorreta");

  let status = STATUS_LINHAGEM_RECEITA.CANONICA;
  if (problemas.includes("ciclo")) status = STATUS_LINHAGEM_RECEITA.CICLO;
  else if (problemas.includes("origem_ausente")) status = STATUS_LINHAGEM_RECEITA.ORIGEM_AUSENTE;
  else if (problemas.length > 0) status = STATUS_LINHAGEM_RECEITA.A_VALIDAR;

  return {
    problemas,
    status,
    raizCalculadaId: cadeia.raizId,
    geracaoCalculada: geracaoEsperada,
    cadeiaIds: cadeia.visitados,
    origemId: origemA || origemB,
    donoId: owner || texto(receita?.created_by_id),
  };
}
