import { base44 } from "@/api/base44Client";

const MAX_PROFUNDIDADE = 12;

const atualizadoEm = (receita) => receita?.updated_date || receita?.updated_at || receita?.created_date || "";

const rendimentoOperacional = (receita, itens) => {
  const informado = Number(receita?.peso_pos_preparo_total) > 0
    ? Number(receita.peso_pos_preparo_total)
    : (Number(receita?.rendimento_total) > 0 ? Number(receita.rendimento_total) : 0);
  if (informado > 0) return { valor: informado, estimado: false };

  const porcoes = Number(receita?.porcoes_base) > 0 ? Number(receita.porcoes_base) : 1;
  const totalCanonico = (itens || [])
    .filter((item) => item.tipo !== "grupo" && !item.subreceita_parent_id)
    .reduce((soma, item) => soma + (Number(item.quantidade_por_porcao) || 0) * porcoes, 0);
  return { valor: totalCanonico > 0 ? totalCanonico : 1, estimado: true };
};

const assinaturaDependencias = (dependencias) => [...dependencias.entries()]
  .sort(([a], [b]) => String(a).localeCompare(String(b)))
  .map(([id, data]) => `${id}@${data || "sem-data"}`)
  .join("|");

/**
 * Fase 8 — expande uma sub-receita em memória até ingredientes atômicos.
 *
 * O marcador `tipo=subreceita + subreceita_id` é a relação canônica. Os filhos
 * persistidos continuam existindo como CACHE derivado para compatibilidade das
 * telas atuais, mas carregam linhagem e assinatura das dependências para poderem
 * ser auditados e sincronizados quando a receita de origem mudar.
 */
export async function explodeSubreceita(subreceita, qtdPorPorcao, options = {}) {
  const receitaCache = new Map();
  const itensCache = new Map();
  const dependencias = new Map();
  const alertas = [];
  let rendimentoRaiz = 1;
  let rendimentoRaizEstimado = false;
  let ultimaComposicaoMs = 0;
  let ultimaComposicaoEm = "";

  const carregarReceita = async (id) => {
    if (!id) throw new Error("Sub-receita sem referência canônica (subreceita_id).");
    if (!receitaCache.has(id)) {
      const receita = id === subreceita.id ? subreceita : await base44.entities.Receita.get(id);
      if (!receita) throw new Error(`Sub-receita não encontrada: ${id}`);
      receitaCache.set(id, receita);
    }
    return receitaCache.get(id);
  };

  const carregarItens = async (receitaId) => {
    if (!itensCache.has(receitaId)) {
      const itens = await base44.entities.IngredienteReceita.filter(
        { receita_id: receitaId }, "ordem", 500
      );
      itensCache.set(receitaId, itens || []);
    }
    return itensCache.get(receitaId);
  };

  const children = [];

  const expandir = async (receitaAtual, quantidadeSaidaPorPorcaoPai, pilha = []) => {
    if (pilha.length >= MAX_PROFUNDIDADE) {
      throw new Error(`Sub-receitas excederam ${MAX_PROFUNDIDADE} níveis de profundidade.`);
    }
    if (pilha.includes(receitaAtual.id)) {
      const nomes = [];
      for (const id of [...pilha, receitaAtual.id]) {
        const r = await carregarReceita(id);
        nomes.push(r?.nome || id);
      }
      throw new Error(`Ciclo de sub-receitas detectado: ${nomes.join(" → ")}`);
    }

    const itens = await carregarItens(receitaAtual.id);
    dependencias.set(receitaAtual.id, atualizadoEm(receitaAtual));
    for (const item of itens) {
      if (item.tipo === "grupo" || item.subreceita_parent_id) continue;
      const data = atualizadoEm(item);
      const ms = data ? Date.parse(data) : 0;
      if (Number.isFinite(ms) && ms > ultimaComposicaoMs) {
        ultimaComposicaoMs = ms;
        ultimaComposicaoEm = data;
      }
    }

    const rendimento = rendimentoOperacional(receitaAtual, itens);
    const porcoesBase = Number(receitaAtual.porcoes_base) > 0 ? Number(receitaAtual.porcoes_base) : 1;
    const escalaPorSaida = quantidadeSaidaPorPorcaoPai / rendimento.valor;

    if (pilha.length === 0) {
      rendimentoRaiz = rendimento.valor;
      rendimentoRaizEstimado = rendimento.estimado;
    }
    if (rendimento.estimado) {
      alertas.push(`Rendimento estimado em ${receitaAtual.nome || receitaAtual.id}.`);
    }

    // Todo item com subreceita_parent_id é snapshot/cache legado e nunca entra
    // novamente na expansão dinâmica. A relação canônica é sempre o marcador.
    const itensCanonicos = itens.filter((item) => item.tipo !== "grupo" && !item.subreceita_parent_id);

    for (const item of itensCanonicos) {
      const quantidadeNoLote = (Number(item.quantidade_por_porcao) || 0) * porcoesBase;
      const quantidadeEscalada = quantidadeNoLote * escalaPorSaida;
      if (!(quantidadeEscalada > 0)) continue;

      if (item.tipo === "subreceita") {
        if (!item.subreceita_id) {
          throw new Error(`Sub-receita sem ID em ${receitaAtual.nome || receitaAtual.id}.`);
        }
        const aninhada = await carregarReceita(item.subreceita_id);
        await expandir(aninhada, quantidadeEscalada, [...pilha, receitaAtual.id]);
        continue;
      }

      if (!item.ingrediente_id) {
        alertas.push(`Item sem ingrediente_id ignorado em ${receitaAtual.nome || receitaAtual.id}.`);
        continue;
      }

      children.push({
        tipo: "ingrediente",
        ingrediente_id: item.ingrediente_id,
        ingrediente_nome: item.ingrediente_nome || "",
        quantidade_por_porcao: quantidadeEscalada,
        unidade_quantidade: item.unidade_quantidade || (receitaAtual.unidade_base === "ml" ? "ml" : "g"),
        pre_preparo: item.pre_preparo || "",
        proporcional: item.proporcional !== false,
        fator_correcao_override: Number(item.fator_correcao_override) > 0
          ? Number(item.fator_correcao_override)
          : 0,
        medida_caseira_id: item.medida_caseira_id || "",
        quantidade_medida_caseira: item.quantidade_medida_caseira,
        medida_caseira: item.medida_caseira || "",
        subreceita_cache: true,
        subreceita_cache_versao: 2,
        subreceita_origem_receita_id: receitaAtual.id,
        subreceita_origem_item_id: item.id || "",
        subreceita_linhagem: [...pilha, receitaAtual.id].join(">"),
      });
    }
  };

  await expandir(subreceita, Number(qtdPorPorcao) || 0, options.pilhaInicial || []);
  const assinatura = assinaturaDependencias(dependencias);
  const raizAtualizadaEm = atualizadoEm(subreceita);
  const geradoEm = new Date().toISOString();

  for (const child of children) {
    child.subreceita_dependencias_assinatura = assinatura;
    child.subreceita_origem_updated_at = raizAtualizadaEm;
  }

  return {
    children,
    rendimentoEfetivo: rendimentoRaiz,
    rendimentoEstimado: rendimentoRaizEstimado,
    diagnostico: {
      assinaturaDependencias: assinatura,
      dependencias: Object.fromEntries(dependencias),
      raizAtualizadaEm,
      ultimaComposicaoEm,
      geradoEm,
      alertas,
      totalAtomicos: children.length,
    },
  };
}
