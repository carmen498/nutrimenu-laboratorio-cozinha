import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import { custoPorKgPronto } from "@/lib/custoReceita";

// ─── Format helpers ───
function fmtKg(v) {
  return (v || 0).toFixed(1).replace(".", ",") + " kg";
}
function fmtKgNum(v) {
  return (v || 0).toFixed(1).replace(".", ",");
}
function fmtRs(v) {
  return "R$ " + (v || 0).toFixed(2).replace(".", ",");
}
function fmtPct(v) {
  return (v || 0).toFixed(1).replace(".", ",") + "%";
}
function fmtData(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

// ─── Data Loading (READ-ONLY — no creates/updates/deletes) ───
export async function carregarDadosRelatorios(planejamento) {
  const config = typeof planejamento.cardapio_config === "string"
    ? JSON.parse(planejamento.cardapio_config)
    : planejamento.cardapio_config;

  if (!config || !config.grupos) {
    return { config: { grupos: [] }, receitaMap: {}, ingredientesPorReceita: {} };
  }

  // Collect all receita_ids
  const receitaIds = new Set();
  config.grupos.forEach(g => {
    (g.itens || []).forEach(i => {
      if (i.receita_id) receitaIds.add(i.receita_id);
    });
  });

  // Load all receitas (READ-ONLY)
  const todasReceitas = await base44.entities.Receita.list("-nome", 500);
  const receitaMap = {};
  todasReceitas.forEach(r => { receitaMap[r.id] = r; });

  // Load IngredienteReceita for each receita (READ-ONLY)
  const ingredientesPorReceita = {};
  for (const id of receitaIds) {
    try {
      const ingrs = await base44.entities.IngredienteReceita.filter({ receita_id: id }, "ordem", 200);
      ingredientesPorReceita[id] = ingrs || [];
    } catch {
      ingredientesPorReceita[id] = [];
    }
  }

  return { config, receitaMap, ingredientesPorReceita };
}

// ─── PDF Header (shared by all reports) ───
function drawHeader(doc, planejamento, titulo) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(titulo, margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.text(planejamento.nome || "—", margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  const dataStr = fmtData(planejamento.created_date);
  const tipoStr = planejamento.tipo_planejamento || "—";
  const pessoasStr = String(planejamento.total_pessoas ||
    (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0));
  doc.text(`Data do evento: ${dataStr}   |   Tipo: ${tipoStr}   |   Pessoas: ${pessoasStr}`, margin, y);
  y += 4;

  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  return y;
}

function checkPageBreak(doc, y, minSpace = 10) {
  if (y > 275 - minSpace) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ─── Report 1: Produção ───
export function gerarRelatorioProducao(planejamento, dados) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = drawHeader(doc, planejamento, "Relatório de Produção");

  const { config } = dados;
  const grupos = (config.grupos || []).filter(g => (g.itens || []).length > 0);

  let totalGeralKg = 0;

  grupos.forEach(g => {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text((g.nome || "").toUpperCase(), margin, y);
    y += 5;

    // Column headers
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("Nº Porções", margin, y);
    doc.text("Nome da Receita", margin + 30, y);
    doc.text("Qtd (kg)", pageWidth - margin, y, { align: "right" });
    y += 3;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    let subtotalKg = 0;
    (g.itens || []).forEach(item => {
      y = checkPageBreak(doc, y);
      const porcoes = item.porcoes || 0;
      const qtdKg = item.qtd_kg || 0;
      subtotalKg += qtdKg;

      doc.text(String(porcoes), margin, y);
      doc.text((item.receita_nome || "").substring(0, 60), margin + 30, y);
      doc.text(fmtKgNum(qtdKg), pageWidth - margin, y, { align: "right" });
      y += 4.5;
    });

    y += 1;
    doc.setFont(undefined, "bold");
    doc.text(`Subtotal: ${fmtKg(subtotalKg)}`, pageWidth - margin, y, { align: "right" });
    y += 6;

    if (!g.is_sobremesa) totalGeralKg += subtotalKg;
  });

  // Total geral
  y = checkPageBreak(doc, y, 15);
  y += 2;
  doc.setDrawColor(120);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text(`TOTAL GERAL: ${fmtKg(totalGeralKg)}`, pageWidth - margin, y, { align: "right" });

  // Bloco Doces & Bebidas (fora do total de comida)
  const docesBebidas = config.doces_bebidas || [];
  const totalPessoas = planejamento.total_pessoas ||
    (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0);

  if (docesBebidas.length > 0) {
    y = checkPageBreak(doc, y, 25);
    y += 6;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("DOCES & BEBIDAS", margin, y);
    y += 5;

    doc.setFontSize(7);
    doc.text("Item", margin, y);
    doc.text("Qtd", pageWidth - margin, y, { align: "right" });
    y += 3;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    docesBebidas.forEach(item => {
      y = checkPageBreak(doc, y);
      const total = totalPessoas * (item.percentual || 0) / 100 * (item.media || 0);
      let qtdStr;
      if (item.unidade === "ml") qtdStr = (total / 1000).toFixed(1).replace(".", ",") + " L";
      else if (item.unidade === "un") qtdStr = Math.ceil(total) + " un";
      else qtdStr = (total / 1000).toFixed(1).replace(".", ",") + " kg";

      doc.text((item.item || "").substring(0, 60), margin, y);
      doc.text(qtdStr, pageWidth - margin, y, { align: "right" });
      y += 5;
    });
  }

  doc.save(`relatorio-producao-${(planejamento.nome || "planejamento").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ─── Report 2: Receitas do Planejamento ───
export function gerarRelatorioReceitas(planejamento, dados) {
  const doc = new jsPDF();
  const margin = 14;
  let y = drawHeader(doc, planejamento, "Receitas do Evento");

  const { config } = dados;
  const grupos = (config.grupos || []).filter(g => (g.itens || []).length > 0);

  grupos.forEach(g => {
    y = checkPageBreak(doc, y, 15);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text((g.nome || "").toUpperCase(), margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    (g.itens || []).forEach(item => {
      y = checkPageBreak(doc, y);
      doc.text(`• ${(item.receita_nome || "").substring(0, 65)}`, margin + 3, y);
      y += 5;
    });
    y += 3;
  });

  doc.save(`relatorio-receitas-${(planejamento.nome || "planejamento").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ─── Report 3: Pré-preparos — substituído pela tela de pré-visualização
// (PrePreparosPlanejamento.jsx) + src/lib/prePreparosCalc.js e prePreparosPDF.js.

// ─── Report 4: Ficha de Custos ───
export function gerarRelatorioFichaCustos(planejamento, dados) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = drawHeader(doc, planejamento, "Ficha de Custos");

  const { config, receitaMap, ingredientesPorReceita } = dados;
  const grupos = (config.grupos || []).filter(g => (g.itens || []).length > 0);

  // First pass: calculate all costs to get total
  const gruposCalc = grupos.map(g => {
    const itens = (g.itens || []).map(item => {
      const rec = receitaMap[item.receita_id];
      const custoKg = custoPorKgPronto(rec, ingredientesPorReceita?.[item.receita_id]);
      const custo = custoKg * (item.qtd_kg || 0);
      return { ...item, custo, custoKg, semCusto: custoKg === 0 };
    });
    const subtotal = itens.reduce((s, i) => s + i.custo, 0);
    return { ...g, itens, subtotal };
  });

  const custoTotal = gruposCalc.reduce((s, g) => s + g.subtotal, 0);
  const totalPessoas = planejamento.total_pessoas ||
    (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0);
  const custoPorPessoa = totalPessoas > 0 ? custoTotal / totalPessoas : 0;

  // Render groups
  gruposCalc.forEach(g => {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text((g.nome || "").toUpperCase(), margin, y);
    y += 5;

    // Column headers
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("Nº Porções", margin, y);
    doc.text("Nome da Receita", margin + 22, y);
    doc.text("Qtd (kg)", pageWidth - margin - 75, y, { align: "right" });
    doc.text("Custo (R$)", pageWidth - margin - 35, y, { align: "right" });
    doc.text("%", pageWidth - margin, y, { align: "right" });
    y += 3;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    (g.itens || []).forEach(item => {
      y = checkPageBreak(doc, y);
      const pct = custoTotal > 0 ? (item.custo / custoTotal) * 100 : 0;

      doc.text(String(item.porcoes || 0), margin, y);
      doc.text((item.receita_nome || "").substring(0, 50), margin + 22, y);
      doc.text(fmtKgNum(item.qtd_kg || 0), pageWidth - margin - 75, y, { align: "right" });
      doc.text(item.semCusto ? "—" : fmtRs(item.custo), pageWidth - margin - 35, y, { align: "right" });
      doc.text(item.semCusto ? "—" : fmtPct(pct), pageWidth - margin, y, { align: "right" });
      y += 4.5;
    });

    y += 1;
    doc.setFont(undefined, "bold");
    doc.text(`Subtotal: ${fmtRs(g.subtotal)}`, pageWidth - margin, y, { align: "right" });
    y += 6;
  });

  // Total
  y = checkPageBreak(doc, y, 20);
  y += 2;
  doc.setDrawColor(120);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(`Custo Total do Evento: ${fmtRs(custoTotal)}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.text(`Custo por Pessoa: ${fmtRs(custoPorPessoa)}`, pageWidth - margin, y, { align: "right" });
  y += 5;

  // Verify % sums to 100%
  const somaPct = gruposCalc.reduce((s, g) =>
    s + g.itens.reduce((s2, i) => s2 + (custoTotal > 0 ? i.custo / custoTotal * 100 : 0), 0), 0);
  doc.setFontSize(7);
  doc.setFont(undefined, "normal");
  doc.text(`Soma das %: ${fmtPct(somaPct)}`, margin, y);

  doc.save(`ficha-custos-${(planejamento.nome || "planejamento").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}