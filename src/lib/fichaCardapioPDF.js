import { jsPDF } from "jspdf";

// Ficha do Cardápio — PDF de PRODUÇÃO (sem valores comerciais).
// Usado pelo botão "PDF" e pelo relatório "Ficha do Cardápio (produção)"
// no Cardápio aberto. NUNCA inclui custos, %, markup ou cores.

const VERDE_ESCURO = [42, 78, 61];
const MARGIN = 14;
const TOP_START = 20;
const PAGE_BOTTOM = 275;
const ROW_H = 7;

function fmtKg(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtG(v) {
  return Math.round(v || 0).toLocaleString("pt-BR");
}
function slugify(s) {
  return (s || "cardapio")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

export function gerarFichaCardapioPDF({ cardapio, num, receitasView, insumos, tagNomes = [] }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = TOP_START;
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  const colReceita = MARGIN + 8;
  const colQtd = rightX;
  const colPorcoes = rightX - 28;
  const colPC = rightX - 55;

  // 1. Cabeçalho timbrado
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Ficha do Cardápio", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Laboratório de Cozinha · Gastronomia Planejada · emitida em ${dataEmissao}`, MARGIN, y);
  y += 10;

  // 2. Identificação
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(cardapio.nome?.toUpperCase?.() || cardapio.nome || "", MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`${num} pessoas`, rightX, y, { align: "right" });
  y += 6;

  const dataCardapio = cardapio.data ? cardapio.data.split("-").reverse().join("/") : null;
  const linhaDiscreta = [dataCardapio, tagNomes.length ? tagNomes.join(", ") : null].filter(Boolean).join(" · ");
  if (linhaDiscreta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(linhaDiscreta, MARGIN, y);
    y += 6;
  }
  y += 3;

  function drawHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("RECEITA", colReceita, y);
    doc.text("PC (g/p)", colPC, y, { align: "right" });
    doc.text("PORÇÕES", colPorcoes, y, { align: "right" });
    doc.text("QUANTIDADE", colQtd, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, rightX, y);
    y += 5;
  }

  function novaPagina(redraw) {
    doc.addPage();
    y = TOP_START;
    if (redraw) drawHeader();
  }

  // 3. Tabela de produção
  drawHeader();
  doc.setFont("helvetica", "normal");
  let totalG = 0;
  (receitasView || []).forEach((r) => {
    if (y + ROW_H > PAGE_BOTTOM) novaPagina(true);
    const qtdG = Number(r.quantidade_total_g) || 0;
    totalG += qtdG;
    const pcG = num > 0 ? qtdG / num : 0;

    doc.setDrawColor(80);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y - 3.2, 3.2, 3.2);

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    let nome = r.receita_nome || "";
    const maxW = colPC - colReceita - 4;
    if (doc.getTextWidth(nome) > maxW) {
      while (nome.length > 3 && doc.getTextWidth(nome + "...") > maxW) nome = nome.slice(0, -1);
      nome += "...";
    }
    doc.text(nome, colReceita, y);
    doc.text(`${fmtG(pcG)} g`, colPC, y, { align: "right" });
    doc.text(`${num}`, colPorcoes, y, { align: "right" });
    doc.text(`${fmtKg(qtdG / 1000)} kg`, colQtd, y, { align: "right" });

    y += 5;
    doc.setDrawColor(230);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, rightX, y);
    y += ROW_H - 5;
  });

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`Total de comida ${fmtKg(totalG / 1000)} kg`, rightX, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(130, 130, 130);
  const gPorPessoa = num > 0 ? totalG / num : 0;
  doc.text(`≈ ${fmtG(gPorPessoa)} g de comida por pessoa`, rightX, y, { align: "right" });
  y += 10;

  // 4. Insumos e embalagens (omitido se vazio)
  if (insumos && insumos.length > 0) {
    if (y + 16 > PAGE_BOTTOM) novaPagina(false);
    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("Insumos e Embalagens", MARGIN, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    insumos.forEach((ins) => {
      if (y + 6 > PAGE_BOTTOM) novaPagina(false);
      doc.setDrawColor(80);
      doc.setLineWidth(0.3);
      doc.rect(MARGIN, y - 3.2, 3.2, 3.2);
      const qtdLabel = `${ins.quantidade || 0} ${ins.unidade || "un"}`;
      doc.text(`${ins.nome || ""} (${qtdLabel})`, MARGIN + 6, y);
      y += 6;
    });
    y += 4;
  }

  // 5. Observações + linhas pautadas
  if (y + 30 > PAGE_BOTTOM) novaPagina(false);
  doc.setFont("times", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Observações", MARGIN, y);
  y += 7;
  if (cardapio.observacoes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const linhas = doc.splitTextToSize(cardapio.observacoes, rightX - MARGIN);
    linhas.forEach((linha) => {
      if (y + 5 > PAGE_BOTTOM) novaPagina(false);
      doc.text(linha, MARGIN, y);
      y += 5;
    });
    y += 2;
  }
  for (let i = 0; i < 2; i++) {
    if (y + 8 > PAGE_BOTTOM) novaPagina(false);
    y += 8;
    doc.setDrawColor(190);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, rightX, y);
  }

  // 6. Rodapé com numeração de páginas
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Laboratório de Cozinha · Gastronomia Planejada · ficha de produção — sem valores comerciais · pág. ${p}/${totalPaginas}`,
      pageWidth / 2,
      292,
      { align: "center" }
    );
  }

  doc.save(`ficha-cardapio-${slugify(cardapio.nome)}.pdf`);
}