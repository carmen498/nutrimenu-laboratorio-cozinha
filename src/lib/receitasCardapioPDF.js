import { jsPDF } from "jspdf";

// Relatório "Receitas do Cardápio" — caderno de produção em PDF. Uma receita
// por página (quebra de página entre receitas). Documento de COZINHA: nunca
// inclui custos, %, FC ou markup. Usa o relatório já montado por
// montarReceitasCardapio (mesma fonte exibida na tela de pré-visualização).

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

export function gerarReceitasCardapioPDF(cardapio, relatorio) {
  const doc = /** @type {any} */ (new jsPDF());
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = TOP_START;

  function checkBreak(min) { if (y + min > PAGE_BOTTOM) { doc.addPage(); y = TOP_START; } }

  // ── CAPA ──
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Receitas da Refeição", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Laboratório de Cozinha · RECEITAS DO CARDÁPIO · emitido em ${relatorio.dataEmissao}`, MARGIN, y);
  y += 10;

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
  y += 6;

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("SUMÁRIO", MARGIN, y);
  y += 7;
  relatorio.sumario.forEach((s) => {
    checkBreak(7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(s.nome, MARGIN, y);
    doc.setTextColor(140, 140, 140);
    doc.text(String(s.pagina), rightX, y, { align: "right" });
    y += 6.5;
  });

  const totalPaginasComCapa = () => 1 + relatorio.receitas.length;

  // ── UMA PÁGINA POR RECEITA ──
  relatorio.receitas.forEach((r) => {
    doc.addPage();
    y = TOP_START;

    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 30, 30);
    doc.text(r.nome, MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      r.indisponivel ? `${r.categoria} · receita indisponível` : `${r.categoria} · ${r.porcoesLabel} · PC ${r.pcFmt} · total ${r.totalKgFmt}`,
      MARGIN, y
    );
    y += 8;

    if (r.indisponivel) return;

    // Tabela de ingredientes
    const colNome = MARGIN;
    const colPreparo = MARGIN + 80;
    const colQtd = relatorio.incluirMedidaCaseira ? rightX - 45 : rightX;
    const colMedida = rightX;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("INGREDIENTE", colNome, y);
    doc.text("PRÉ-PREPARO", colPreparo, y);
    doc.text("QUANTIDADE", colQtd, y, { align: "right" });
    if (relatorio.incluirMedidaCaseira) doc.text("MEDIDA CASEIRA", colMedida, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, rightX, y);
    y += 5;

    r.linhas.forEach((linha) => {
      checkBreak(7);
      if (linha.tipo === "grupo") {
        y += 1.5;
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...VERDE_ESCURO);
        doc.text(linha.titulo || "", colNome, y);
        y += 5.5;
        return;
      }
      if (linha.tipo === "subreceita") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...VERDE_ESCURO);
        doc.text(`▸ ${linha.nome}`, colNome, y);
        doc.text(linha.qtdFmt, colQtd, y, { align: "right" });
        y += 4.2;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(linha.nota, colNome + 4, y);
        y += 5;
        return;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(linha.nome, colNome, y);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(linha.prePreparo || "", colPreparo, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(linha.qtdFmt, colQtd, y, { align: "right" });
      if (relatorio.incluirMedidaCaseira) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(linha.medidaTexto || "—", colMedida, y, { align: "right" });
      }
      y += 5.5;
    });

    y += 4;

    // Modo de preparo
    checkBreak(14);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("MODO DE PREPARO", MARGIN, y);
    y += 7;

    r.passos.forEach((passo, i) => {
      const jaNumerado = /^\d+[.\-)]\s/.test(passo);
      const texto = jaNumerado ? passo : `${i + 1}. ${passo}`;
      const linhas = doc.splitTextToSize(texto, rightX - MARGIN);
      checkBreak(linhas.length * 4.6 + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      linhas.forEach((l) => { doc.text(l, MARGIN, y); y += 4.6; });
      y += 2;
    });

    y += 3;
    checkBreak(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(r.rendimentoLinha, MARGIN, y);
  });

  // Rodapé padrão
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`${relatorio.nome} · pág. ${p}/${totalPaginas}`, pageWidth / 2, 292, { align: "center" });
  }

  doc.save(`receitas-${slugify(cardapio.nome)}.pdf`);
}