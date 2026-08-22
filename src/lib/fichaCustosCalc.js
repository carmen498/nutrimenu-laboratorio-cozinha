// Fonte única de verdade da Ficha de Custos do Cardápio (uso interno) — usada
// tanto pela tela de pré-visualização (FichaCustosCardapio.jsx) quanto pelo PDF
// exportado (fichaCustosPDF.js). NUNCA calcula custo por conta própria: reaproveita
// r.custo_total (já derivado ao vivo por calcularCustoCardapio, em custoCardapio.js)
// e rendimentoEfetivo (custoReceita.js) — garante paridade total com o resto do app.
// Documento de USO INTERNO: nunca inclui markup ou preço de venda.
import { rendimentoEfetivo } from "@/lib/custoReceita";

function fmtKg(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtRs(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}
function fmtPeso(g) {
  const v = g || 0;
  if (v >= 1000) return fmtKg(v / 1000) + " kg";
  return Math.round(v).toLocaleString("pt-BR") + " g";
}

// Detalhe de ingredientes de uma receita: os que somam ≥80% do custo (ordenados
// por custo decrescente) + uma linha-resumo para o restante.
function montarDetalheIngredientes(cr, receitaMap, ingredientesPorReceita, ingredienteMap) {
  const receita = receitaMap[cr.receita_id];
  if (!receita) return null;
  const ingrs = (ingredientesPorReceita[cr.receita_id] || []).filter((i) => i.tipo === "ingrediente");
  if (ingrs.length === 0) return null;

  const rend = rendimentoEfetivo(receita, ingredientesPorReceita[cr.receita_id] || []);
  const porcoesBase = receita.porcoes_base || 1;
  const qtdTotal = Number(cr.quantidade_total_g) || 0;
  const fator = rend > 0 ? qtdTotal / rend : 0;

  const itens = ingrs
    .map((ing) => {
      // A quantidade cadastrada na receita é Peso Líquido (PL).
      // Para compra e custo, usar Peso Bruto (PB) = PL × FC.
      const qtdLiquida = (Number(ing.quantidade_por_porcao) || 0) * porcoesBase * fator;
      const ingRef = ing.ingrediente_id ? ingredienteMap[ing.ingrediente_id] : null;
      const fc = Number(ingRef?.fator_correcao) || 1;
      const qtdBruta = qtdLiquida * fc;
      const custo = qtdBruta * (Number(ingRef?.preco_por_g_rs) || 0);
      return { nome: ing.ingrediente_nome || "—", qtd: qtdBruta, custo };
    })
    .filter((i) => i.custo > 0 || i.qtd > 0)
    .sort((a, b) => b.custo - a.custo);

  const totalCusto = itens.reduce((s, i) => s + i.custo, 0);
  if (totalCusto <= 0) return null;

  const limite = totalCusto * 0.8;
  let acumulado = 0;
  const mostrados = [];
  const restantes = [];
  itens.forEach((i) => {
    if (acumulado < limite || mostrados.length === 0) {
      mostrados.push(i);
      acumulado += i.custo;
    } else {
      restantes.push(i);
    }
  });

  return {
    mostrados: mostrados.map((i) => ({ nome: i.nome, qtdFmt: fmtPeso(i.qtd), custoFmt: fmtRs(i.custo) })),
    resumoRestante: restantes.length > 0
      ? { qtd: restantes.length, custoFmt: fmtRs(restantes.reduce((s, i) => s + i.custo, 0)) }
      : null,
  };
}

export function montarFichaCustos({ cardapio, num, receitasView, receitaMap, ingredientesPorReceita, ingredienteMap, custoInsumos = 0, abrirIngredientes = false }) {
  const dataEvento = cardapio.data ? cardapio.data.split("-").reverse().join("/") : null;
  const custoReceitasTotal = (receitasView || []).reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
  const totalComidaG = (receitasView || []).reduce((s, r) => s + (Number(r.quantidade_total_g) || 0), 0);
  const custoPorPessoa = num > 0 ? custoReceitasTotal / num : 0;

  // Agrupar por categoria, preservando a ordem de primeira aparição
  const gruposMap = new Map();
  (receitasView || []).forEach((r) => {
    const cat = r.receita_categoria || "Sem categoria";
    if (!gruposMap.has(cat)) gruposMap.set(cat, []);
    gruposMap.get(cat).push(r);
  });

  let maiorPctItem = null;

  const grupos = Array.from(gruposMap.entries()).map(([categoria, itensRaw]) => {
    const itens = itensRaw.map((r) => {
      const custo = Number(r.custo_total) || 0;
      const pct = custoReceitasTotal > 0 ? (custo / custoReceitasTotal) * 100 : 0;
      const item = {
        id: r.id,
        nome: r.receita_nome || "—",
        porcoes: num,
        qtdKgFmt: fmtKg((Number(r.quantidade_total_g) || 0) / 1000),
        custoFmt: custo > 0 ? fmtRs(custo) : "—",
        pctFmt: custo > 0 ? fmtPct(pct) : "—",
        pct,
        destaque: false,
        ingredientes: abrirIngredientes ? montarDetalheIngredientes(r, receitaMap, ingredientesPorReceita, ingredienteMap) : null,
      };
      if (!maiorPctItem || pct > maiorPctItem.pct) maiorPctItem = item;
      return item;
    });
    const subtotalCusto = itens.reduce((s, i) => s + (Number(i.pct) > 0 ? (i.pct / 100) * custoReceitasTotal : 0), 0);
    const subtotalKg = itensRaw.reduce((s, r) => s + (Number(r.quantidade_total_g) || 0), 0) / 1000;
    return {
      categoria,
      itens,
      mostrarSubtotal: itens.length >= 2,
      subtotalCustoFmt: fmtRs(subtotalCusto),
      subtotalKgFmt: fmtKg(subtotalKg),
    };
  });

  if (maiorPctItem) maiorPctItem.destaque = true;

  const custoProducaoTotal = custoReceitasTotal + custoInsumos;

  return {
    nome: cardapio.nome?.toUpperCase?.() || cardapio.nome || "",
    numPessoas: num,
    dataEvento,
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
    totalComidaKgFmt: fmtKg(totalComidaG / 1000),
    custoTotalFmt: fmtRs(custoReceitasTotal),
    custoPorPessoaFmt: fmtRs(custoPorPessoa),
    grupos,
    totalPorcoes: num * (receitasView || []).length,
    totalKgFmt: fmtKg(totalComidaG / 1000),
    totalCustoFmt: fmtRs(custoReceitasTotal),
    temInsumos: custoInsumos > 0,
    custoInsumosFmt: fmtRs(custoInsumos),
    custoProducaoTotalFmt: fmtRs(custoProducaoTotal),
    leitura: maiorPctItem
      ? `${maiorPctItem.nome} responde por ${fmtPct(maiorPctItem.pct)} do custo (${fmtRs((maiorPctItem.pct / 100) * custoReceitasTotal)}), a maior participação do cardápio.`
      : null,
    abrirIngredientes,
  };
}