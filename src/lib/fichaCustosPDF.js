import { jsPDF } from "jspdf";

// Ficha de Custos do Cardápio — PDF de USO INTERNO. Usa o relatório já montado
// por montarFichaCustos (mesma fonte de dados exibida na tela de pré-visualização).
// NUNCA exibe markup ou preço de venda.

const VERDE_ESCURO = [42, 78, 61];
const MARGIN = 14;
const TOP_START = 20;
const PAGE_BOTTOM = 275;

function slugify(s) {
  return (s || "cardapio")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

export function gerarFichaCustosPDF(cardapio, relatorio) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = TOP_START;

  const colReceita = MARGIN + 8;
  const colPorcoes = rightX - 80;
  const colKg = rightX - 55;
  const colCusto = rightX - 20;
  const colPct = rightX;

  function novaPagina() { doc.addPage(); y = TOP_START; }
  function checkBreak(min = 10) { if (y + min > PAGE_BOTTOM) novaPagina(); }

  // 1. Cabeçalho timbrado
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Ficha de Custos", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Laboratório de Cozinha · FICHA DE CUSTOS · CARDÁPIO · emitida em ${relatorio.dataEmissao} · uso interno`, MARGIN, y);
  y += 10;

  // 2. Identificação
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(relatorio.nome, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`${relatorio.numPessoas} pessoas`, rightX, y, { align: "right" });
  y += 6;
  if (relatorio.dataEvento) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(relatorio.dataEvento, MARGIN, y);
    y += 6;
  }
  y += 3;

  // 3. Indicadores
  const cardW = (rightX - MARGIN - 8) / 3;
  const cards = [
    { label: "Total de comida", valor: `${relatorio.totalComidaKgFmt} kg` },
    { label: "Custo total", valor: relatorio.custoTotalFmt },
    { label: "Custo por pessoa", valor: relatorio.custoPorPessoaFmt, destaque: true },
  ];
  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + 4);
    doc.setDrawColor(210);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, 16, 1.5, 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(c.label, x + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(c.destaque ? 12 : 10.5);
    doc.setTextColor(...(c.destaque ? VERDE_ESCURO : [30, 30, 30]));
    doc.text(c.valor, x + 3, y + 13);
  });
  y += 22;

  // 4. Tabela agrupada por categoria
  function drawColHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("RECEITA", colReceita, y);
    doc.text("PORÇÕES", colPorcoes, y, { align: "right" });
    doc.text("QTD. (KG)", colKg, y, { align: "right" });
    doc.text("CUSTO", colCusto, y, { align: "right" });
    doc.text("%", colPct, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, rightX, y);
    y += 5;
  }

  relatorio.grupos.forEach((g) => {
    checkBreak(16);
    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 30, 30);
    doc.text((g.categoria || "").toUpperCase(), MARGIN, y);
    y += 5;
    drawColHeader();

    g.itens.forEach((item) => {
      checkBreak(item.destaque ? 8 : 6);
      if (item.destaque) {
        doc.setFillColor(255, 248, 225);
        doc.rect(MARGIN - 2, y - 4, rightX - MARGIN + 4, 6, "F");
      }
      doc.setFont("helvetica", item.destaque ? "bold" : "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(item.nome, colReceita, y);
      doc.text(String(item.porcoes), colPorcoes, y, { align: "right" });
      doc.text(item.qtdKgFmt, colKg, y, { align: "right" });
      doc.text(item.custoFmt, colCusto, y, { align: "right" });
      doc.setTextColor(...(item.destaque ? VERDE_ESCURO : [30, 30, 30]));
      doc.text(item.pctFmt, colPct, y, { align: "right" });
      y += 5;

      if (item.ingredientes) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        item.ingredientes.mostrados.forEach((ing) => {
          checkBreak(4.5);
          doc.text(`↳ ${ing.nome} · ${ing.qtdFmt} · ${ing.custoFmt}`, colReceita + 4, y);
          y += 4;
        });
        if (item.ingredientes.resumoRestante) {
          checkBreak(4.5);
          doc.text(`(+ ${item.ingredientes.resumoRestante.qtd} ingredientes menores · ${item.ingredientes.resumoRestante.custoFmt})`, colReceita + 4, y);
          y += 4;
        }
      }
    });

    if (g.mostrarSubtotal) {
      checkBreak(6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Subtotal: ${g.subtotalKgFmt} kg · ${g.subtotalCustoFmt}`, rightX, y, { align: "right" });
      y += 5;
    }
    y += 3;
  });

  // Linha Total
  checkBreak(16);
  doc.setDrawColor(120);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, rightX, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("TOTAL", colReceita, y);
  doc.text(String(relatorio.totalPorcoes), colPorcoes, y, { align: "right" });
  doc.text(`${relatorio.totalKgFmt} kg`, colKg, y, { align: "right" });
  doc.text(relatorio.totalCustoFmt, colCusto, y, { align: "right" });
  doc.text("100,0%", colPct, y, { align: "right" });
  y += 8;

  // 5. Insumos e embalagens (omitido se zero)
  if (relatorio.temInsumos) {
    checkBreak(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Insumos e embalagens ${relatorio.custoInsumosFmt}`, MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE_ESCURO);
    doc.text(`Custo total de produção ${relatorio.custoProducaoTotalFmt}`, MARGIN, y);
    y += 8;
  }

  // 6. Caixa de leitura
  if (relatorio.leitura) {
    checkBreak(14);
    doc.setFillColor(247, 247, 245);
    const linhas = doc.splitTextToSize(relatorio.leitura, rightX - MARGIN - 8);
    const boxH = linhas.length * 4.2 + 5;
    doc.roundedRect(MARGIN, y, rightX - MARGIN, boxH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    let ly = y + 5.5;
    linhas.forEach((l) => { doc.text(l, MARGIN + 4, ly); ly += 4.2; });
    y += boxH + 4;
  }

  // Rodapé
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Laboratório de Cozinha · documento de uso interno — não enviar ao cliente · pág. ${p}/${totalPaginas}`,
      pageWidth / 2,
      292,
      { align: "center" }
    );
  }

  doc.save(`ficha-custos-${slugify(cardapio.nome)}.pdf`);
}