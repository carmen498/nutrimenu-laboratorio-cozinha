import { jsPDF } from "jspdf";

// Relatório de Pré-preparos — PDF. Usa o objeto já montado por montarPrePreparos
// (mesma fonte de dados exibida na tela de pré-visualização).

const VERDE_ESCURO = [42, 78, 61];
const MARGIN = 14;
const TOP_START = 20;
const PAGE_BOTTOM = 275;

function slugify(s) {
  return (s || "pre-preparos")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

export function gerarPrePreparosPDF(planejamento, relatorio, opts = {}) {
  const doc = opts.doc || new jsPDF();
  if (opts.doc) doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = TOP_START;

  function novaPagina() {
    doc.addPage();
    y = TOP_START;
  }

  // Cabeçalho
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Pré-preparos", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Laboratório de Cozinha · Gastronomia Planejada · emitido em ${relatorio.dataEmissao}`, MARGIN, y);
  y += 10;

  // Identificação
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(planejamento.nome || "—", MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`${relatorio.totalPessoas} pessoas`, rightX, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`${relatorio.numReceitas} receita${relatorio.numReceitas !== 1 ? "s" : ""} · quantidades já escaladas para o evento`, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  const diagLinhas = doc.splitTextToSize(relatorio.diagnosticoTexto, rightX - MARGIN);
  diagLinhas.forEach((l) => { doc.text(l, MARGIN, y); y += 4; });
  y += 4;

  if (relatorio.vazio) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Nenhum pré-preparo encontrado nas receitas deste cardápio.", MARGIN, y);
    if (opts.doc) return doc;
    doc.save(`pre-preparos-${slugify(planejamento.nome)}.pdf`);
    return;
  }

  // Seção 1 — Sub-receitas
  if (relatorio.subReceitas.length > 0) {
    if (y + 16 > PAGE_BOTTOM) novaPagina();
    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("Sub-receitas (preparar antes)", MARGIN, y);
    y += 7;

    relatorio.subReceitas.forEach((s) => {
      if (y + 10 > PAGE_BOTTOM) novaPagina();
      doc.setDrawColor(80);
      doc.setLineWidth(0.3);
      doc.rect(MARGIN, y - 3.2, 3.2, 3.2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text(s.nome, MARGIN + 6, y);
      doc.setFont("helvetica", "bold");
      doc.text(s.totalFmt, rightX, y, { align: "right" });
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      const usoLinhas = doc.splitTextToSize(s.usadoEmTexto, rightX - MARGIN - 6);
      usoLinhas.forEach((l) => { doc.text(l, MARGIN + 6, y); y += 3.8; });
      y += 2.5;
    });
    y += 4;
  }

  // Seção 2 — Ingredientes com pré-preparo
  if (relatorio.ingredientes.length > 0) {
    if (y + 16 > PAGE_BOTTOM) novaPagina();
    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("Ingredientes com pré-preparo", MARGIN, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("INGREDIENTE", MARGIN + 6, y);
    doc.text("RECEITA", MARGIN + 90, y);
    doc.text("QTD. TOTAL", rightX, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, rightX, y);
    y += 5;

    relatorio.ingredientes.forEach((item) => {
      if (y + 14 > PAGE_BOTTOM) novaPagina();
      doc.setDrawColor(80);
      doc.setLineWidth(0.3);
      doc.rect(MARGIN, y - 3.2, 3.2, 3.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(item.nome, MARGIN + 6, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(item.receitaLabel, MARGIN + 90, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(item.totalFmt, rightX, y, { align: "right" });
      y += 4.2;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(item.prePreparo, MARGIN + 6, y);
      if (item.brutoTexto) {
        doc.setFont("helvetica", "normal");
        doc.text(item.brutoTexto, rightX, y, { align: "right" });
      }
      y += 4;
      if (item.usadoEmTexto) {
        doc.setFontSize(7.5);
        const linhas = doc.splitTextToSize(item.usadoEmTexto, rightX - MARGIN - 90);
        linhas.forEach((l) => { doc.text(l, MARGIN + 90, y); y += 3.5; });
      }
      y += 2.5;
      doc.setDrawColor(230);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, y, rightX, y);
      y += 3;
    });
  }

  // Rodapé com numeração de páginas — apenas quando gerado isoladamente; quando
  // anexado ao Dossiê, o rodapé único é aplicado pelo gerador do Dossiê.
  if (!opts.doc) {
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `quantidades em peso líquido escalado · bruto indicado quando há fator de correção · pág. ${p}/${totalPaginas}`,
        pageWidth / 2,
        292,
        { align: "center" }
      );
    }
  }

  if (opts.doc) return doc;
  doc.save(`pre-preparos-${slugify(planejamento.nome)}.pdf`);
}