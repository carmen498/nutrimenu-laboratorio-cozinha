// PDF do Dossiê do Evento — capa executiva + anexos opcionais (cada anexo é
// gerado pelo seu próprio gerador já existente, anexado como páginas extras
// no mesmo arquivo). NÃO recalcula nada — apenas desenha os valores já
// derivados por montarDossie (src/lib/dossieEventoCalc.js).
import { jsPDF } from "jspdf";
import { gerarRelatorioProducao } from "@/lib/relatoriosPlanejamentoPDF";
import { gerarPrePreparosPDF } from "@/lib/prePreparosPDF";
import { carregarDadosPrePreparos, montarPrePreparos } from "@/lib/prePreparosCalc";

const MARGIN = 14;

function fmtKg(v) { return (v || 0).toFixed(1).replace(".", ",") + " kg"; }
function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
function fmtPct(v) { return (v || 0).toFixed(1).replace(".", ",") + "%"; }
function slugify(s) {
  return (s || "dossie").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}

function checkPageBreak(doc, y, minSpace = 12) {
  if (y > 275 - minSpace) { doc.addPage(); return 20; }
  return y;
}

function drawCapa(doc, dossie) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = 18;

  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("DOSSIÊ DO EVENTO", MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.text(`Laboratório de Cozinha · emitido em ${new Date().toLocaleDateString("pt-BR")}`, MARGIN, y);
  y += 7;

  // 1. Identificação
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(dossie.cabecalho.nome, MARGIN, y);
  doc.text(`${dossie.cabecalho.totalPessoas} pessoas`, rightX, y, { align: "right" });
  y += 5.5;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  const partesId = [
    dossie.cabecalho.tipo,
    dossie.cabecalho.tipoServico,
    dossie.cabecalho.horarioInicio ? `início ${dossie.cabecalho.horarioInicio}` : null,
    dossie.cabecalho.duracaoHoras ? `${dossie.cabecalho.duracaoHoras}h de duração` : null,
  ].filter(Boolean);
  doc.text(partesId.join(" · ") || "—", MARGIN, y);
  y += 5;
  doc.setDrawColor(180);
  doc.line(MARGIN, y, rightX, y);
  y += 7;

  // 2. Clientes e per capitas
  if (dossie.clientes.length > 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("CLIENTES E PER CAPITAS", MARGIN, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    dossie.clientes.forEach(c => {
      doc.text(`${c.label}: ${c.n} × ${c.pc}g = ${fmtKg(c.kg)}`, MARGIN + 2, y);
      y += 4.5;
    });
    y += 3;
  }

  // 3. Planejamento de comida
  y = checkPageBreak(doc, y, 16);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("PLANEJAMENTO DE COMIDA", MARGIN, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  const pc = dossie.planejamentoComida;
  doc.text(`Base: ${fmtKg(pc.baseKg)}   |   Margem: ${fmtPct(pc.margemPct)} (${fmtKg(pc.margemKg)})   |   Planejado: ${fmtKg(pc.planejadoKg)}`, MARGIN + 2, y);
  y += 4.5;
  doc.text(`No cardápio: ${fmtKg(pc.cardapioKg)}${pc.alertaPlanejado ? "  ⚠ diverge do planejado em mais de 5%" : ""}`, MARGIN + 2, y);
  y += 7;

  // 4. Tabela cardápio
  y = checkPageBreak(doc, y, 24);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("CARDÁPIO", MARGIN, y);
  y += 5;
  doc.setFontSize(7);
  doc.text("Receita", MARGIN, y);
  doc.text("PC local", MARGIN + 88, y);
  doc.text("Qtd (kg)", MARGIN + 118, y, { align: "right" });
  doc.text("Custo (R$)", MARGIN + 148, y, { align: "right" });
  doc.text("%", rightX, y, { align: "right" });
  y += 2.5;
  doc.setDrawColor(200);
  doc.line(MARGIN, y, rightX, y);
  y += 4;
  doc.setFontSize(8);
  dossie.itensCardapio.forEach(item => {
    y = checkPageBreak(doc, y);
    const destaque = dossie.maxPct > 0 && item.pct === dossie.maxPct;
    doc.setFont(undefined, destaque ? "bold" : "normal");
    doc.text((item.nome || "").substring(0, 42), MARGIN, y);
    doc.text(`${item.pcG}g`, MARGIN + 88, y);
    doc.text(fmtKg(item.qtdKg), MARGIN + 118, y, { align: "right" });
    doc.text(item.semCusto ? "sem custo" : fmtRs(item.custo), MARGIN + 148, y, { align: "right" });
    doc.text(fmtPct(item.pct), rightX, y, { align: "right" });
    y += 4.5;
  });
  y += 1;
  doc.setDrawColor(140);
  doc.line(MARGIN, y, rightX, y);
  y += 4.5;
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.text(`Total comida: ${fmtKg(dossie.totalKgComida)}   ·   ${fmtRs(dossie.custoTotalComida)}`, rightX, y, { align: "right" });
  y += 8;

  // 5. Doces & Bebidas
  if (dossie.temDoces) {
    y = checkPageBreak(doc, y, 24);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("DOCES & BEBIDAS", MARGIN, y);
    y += 5;
    doc.setFontSize(7);
    doc.text("Item", MARGIN, y);
    doc.text("PC médio", MARGIN + 90, y);
    doc.text("Qtd total", MARGIN + 130, y, { align: "right" });
    doc.text("R$ total", rightX, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(200);
    doc.line(MARGIN, y, rightX, y);
    y += 4;
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    dossie.itensDoces.forEach(item => {
      y = checkPageBreak(doc, y);
      doc.text((item.nome || "").substring(0, 42), MARGIN, y);
      doc.text(item.pcMedio != null ? `${item.pcMedio} ${item.unidade || ""}` : "—", MARGIN + 90, y);
      doc.text(item.qtd != null ? `${item.qtd} ${item.unidadeQtd}` : "—", MARGIN + 130, y, { align: "right" });
      doc.text(item.semCusto ? "sem custo informado" : fmtRs(item.rs), rightX, y, { align: "right" });
      y += 4.5;
    });
    y += 1;
    doc.setDrawColor(140);
    doc.line(MARGIN, y, rightX, y);
    y += 4.5;
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.text(`Total Doces & Bebidas: ${fmtRs(dossie.custoTotalDoces)}`, rightX, y, { align: "right" });
    y += 8;
  }

  // 6. Indicadores finais
  y = checkPageBreak(doc, y, 22);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("INDICADORES", MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(`Custo comida: ${fmtRs(dossie.custoTotalComida)}${dossie.temPratoSemCusto ? " ⚠ inclui pratos sem custo" : ""}`, MARGIN, y);
  y += 5;
  doc.text(`Custo Doces & Bebidas: ${fmtRs(dossie.custoTotalDoces)}`, MARGIN, y);
  y += 5;
  doc.text(`Custo por pessoa (comida): ${dossie.totalPessoas > 0 ? fmtRs(dossie.custoPorPessoa) : "— ⚠ sem pessoas informadas"}`, MARGIN, y);
}

function drawRodapePadrao(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(140, 140, 140);
    doc.text(`Uso interno · Laboratório de Cozinha · pág. ${p}/${totalPaginas}`, pageWidth / 2, 292, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }
}

// anexos = { ficha_cardapio: bool, pre_preparos: bool }
export async function gerarDossiePDF(planejamento, dossie, anexos = {}, dadosCardapio = null) {
  const doc = new jsPDF();
  drawCapa(doc, dossie);

  if (anexos.ficha_cardapio && dadosCardapio) {
    gerarRelatorioProducao(planejamento, dadosCardapio, { doc });
  }
  if (anexos.pre_preparos && dadosCardapio) {
    const dadosPrePreparos = await carregarDadosPrePreparos(planejamento);
    const relatorioPrePreparos = montarPrePreparos(planejamento, dadosPrePreparos);
    gerarPrePreparosPDF(planejamento, relatorioPrePreparos, { doc });
  }

  drawRodapePadrao(doc);
  doc.save(`dossie-evento-${slugify(planejamento.nome)}.pdf`);
}