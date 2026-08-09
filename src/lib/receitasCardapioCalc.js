// Fonte única de verdade do relatório "Receitas do Cardápio" (caderno de
// produção para impressão) — uma receita por página, com a tabela de
// ingredientes escalada pelo fator do evento e o modo de preparo completo.
// Documento de COZINHA: nunca inclui custos, %, FC ou markup.
import { base44 } from "@/api/base44Client";
import { rendimentoEfetivo } from "@/lib/custoReceita";
import { formatarModoPreparo } from "@/lib/formatarModoPreparo";
import { converterGramasParaMedida } from "@/lib/conversorMedidas";

function fmtKg(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPeso(g) {
  const v = g || 0;
  if (v >= 1000) return fmtKg(v / 1000) + " kg";
  return Math.round(v).toLocaleString("pt-BR") + " g";
}

// Carrega tudo que o relatório precisa (receitas do cardápio, ingredientes,
// medidas caseiras/utensílios). Somente leitura.
export async function carregarDadosReceitasCardapio(cardapioId) {
  const receitasCardapio = await base44.entities.CardapioReceita.filter({ cardapio_id: cardapioId }, "ordem", 200);
  const receitaIds = [...new Set((receitasCardapio || []).map((r) => r.receita_id).filter(Boolean))];

  const receitaMap = {};
  for (const rid of receitaIds) {
    try {
      const rec = await base44.entities.Receita.get(rid);
      if (rec) receitaMap[rid] = rec;
    } catch { /* ignore */ }
  }

  const ingredientesPorReceita = {};
  for (const rid of receitaIds) {
    try {
      ingredientesPorReceita[rid] = await base44.entities.IngredienteReceita.filter({ receita_id: rid }, "ordem", 200);
    } catch {
      ingredientesPorReceita[rid] = [];
    }
  }

  const ingredienteIds = new Set();
  Object.values(ingredientesPorReceita).forEach((arr) =>
    (arr || []).forEach((i) => { if (i.tipo === "ingrediente" && i.ingrediente_id) ingredienteIds.add(i.ingrediente_id); })
  );

  const todasMedidas = await base44.entities.MedidaCaseira.list("nome", 3000);
  const medidaByIngrediente = {};
  (todasMedidas || []).forEach((m) => {
    if (m.alimento && ingredienteIds.has(m.alimento) && !medidaByIngrediente[m.alimento]) {
      medidaByIngrediente[m.alimento] = m;
    }
  });

  const todosUtensilios = await base44.entities.UtensilioPadrao.list("simbolo", 500);
  const uteMap = {};
  (todosUtensilios || []).forEach((u) => { uteMap[u.id] = u; });

  return { receitasCardapio: receitasCardapio || [], receitaMap, ingredientesPorReceita, medidaByIngrediente, uteMap };
}

export function montarReceitasCardapio(cardapio, dados, { incluirMedidaCaseira = false } = {}) {
  const { receitasCardapio, receitaMap, ingredientesPorReceita, medidaByIngrediente, uteMap } = dados;
  const numPessoas = Number(cardapio.num_unidades) || 0;
  const dataEvento = cardapio.data ? cardapio.data.split("-").reverse().join("/") : null;

  const receitas = receitasCardapio.map((cr) => {
    const receita = receitaMap[cr.receita_id];
    const nome = cr.receita_nome || receita?.nome || "—";
    const categoria = cr.receita_categoria || receita?.categorias?.[0] || "Sem categoria";
    if (!receita) {
      return { id: cr.id, nome, categoria, indisponivel: true };
    }

    const rend = rendimentoEfetivo(receita, ingredientesPorReceita[cr.receita_id] || []);
    const porcoesBase = receita.porcoes_base || 1;
    const qtdTotal = Number(cr.quantidade_total_g) || 0;
    const fator = rend > 0 ? qtdTotal / rend : 0;
    const pcG = Number(cr.per_capita_g) || (numPessoas > 0 ? qtdTotal / numPessoas : 0);

    const ingrs = ingredientesPorReceita[cr.receita_id] || [];
    const linhas = ingrs.map((ing) => {
      if (ing.tipo === "grupo") {
        return { tipo: "grupo", id: ing.id, titulo: ing.titulo_grupo };
      }
      const scaledQty = (Number(ing.quantidade_por_porcao) || 0) * porcoesBase * fator;
      if (ing.tipo === "subreceita") {
        return {
          tipo: "subreceita",
          id: ing.id,
          nome: ing.subreceita_nome || "—",
          qtdFmt: fmtPeso(scaledQty),
          nota: "(preparar antes — ver Pré-preparos)",
        };
      }
      let medidaTexto = null;
      if (incluirMedidaCaseira) {
        const medida = ing.ingrediente_id ? medidaByIngrediente[ing.ingrediente_id] : null;
        const utensilio = medida ? uteMap[medida.utensilio] : null;
        const conv = converterGramasParaMedida(scaledQty, medida, utensilio);
        medidaTexto = conv.texto;
      }
      return {
        tipo: "ingrediente",
        id: ing.id,
        nome: ing.ingrediente_nome || "—",
        prePreparo: ing.pre_preparo || "",
        qtdFmt: fmtPeso(scaledQty),
        medidaTexto,
      };
    });

    const passos = formatarModoPreparo(receita.modo_preparo);

    return {
      id: cr.id,
      nome,
      categoria,
      indisponivel: false,
      porcoesLabel: `escalado para ${numPessoas} pessoas`,
      pcFmt: `${Math.round(pcG)} g`,
      totalKgFmt: `${fmtKg(qtdTotal / 1000)} kg`,
      linhas,
      passos,
      rendimentoLinha: `rendimento esperado: ${fmtKg(qtdTotal / 1000)} kg · ≈ ${numPessoas} porções de ${Math.round(pcG)} g`,
    };
  });

  const sumario = receitas.map((r, i) => ({ nome: r.nome, categoria: r.categoria, pagina: i + 2 }));

  return {
    nome: cardapio.nome || "",
    dataEvento,
    numPessoas,
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
    sumario,
    receitas,
    incluirMedidaCaseira,
  };
}