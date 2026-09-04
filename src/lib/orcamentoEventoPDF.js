import { jsPDF } from "jspdf";
import { montarOrcamentoEvento } from "@/lib/orcamentoEventoCalc";

// Orçamento do Evento — documento COMERCIAL para o cliente. Usa
// montarOrcamentoEvento como fonte única de dados (recebe só o preço final
// já definido) — NUNCA desenha custo, PC, margem, kg ou quantidades
// de bebidas neste PDF.

const VERDE_ESCURO = [42, 78, 61];
const VERDE_CLARO_BG = [232, 243, 236];
const MARGIN = 14;
const TOP_START = 20;
const PAGE_BOTTOM = 275;

function slugify(s) {
  return (s || "orcamento-evento")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

export function gerarOrcamentoEventoPDF({ planejamento, dados, precoFinal, validadeDias }) {
  const orc = montarOrcamentoEvento({ planejamento, dados, precoFinal, validadeDias });

  const doc = /** @type {any} */ (new jsPDF());
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = TOP_START;

  function novaPagina() {
    doc.addPage();
    y = TOP_START;
  }

  // 1. Cabeçalho unificado
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Orçamento", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Laboratório de Cozinha · Gastronomia Planejada · emitido em ${orc.dataEmissao} · válido por ${orc.validadeDias} dias`, MARGIN, y);
  y += 10;

  // 2. Identificação — só o total de pessoas, sem detalhamento de per capitas
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(orc.nome, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`${orc.numPessoas} pessoas`, rightX, y, { align: "right" });
  y += 6;
  if (orc.tipoLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(orc.tipoLabel, MARGIN, y);
    y += 6;
  }
  y += 4;

  // 3. Menu — apenas nome + descritivo (sem dado técnico)
  doc.setFont("times", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Menu", MARGIN, y);
  y += 8;

  orc.pratos.forEach((prato) => {
    if (y + 14 > PAGE_BOTTOM) novaPagina();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 30, 30);
    doc.text(prato.nome, MARGIN, y);
    y += 5.5;
    if (prato.descritivo) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      const linhas = doc.splitTextToSize(prato.descritivo, rightX - MARGIN);
      linhas.forEach((linha) => {
        if (y + 5 > PAGE_BOTTOM) novaPagina();
        doc.text(linha, MARGIN, y);
        y += 4.6;
      });
    }
    y += 4;
  });
  y += 2;

  // 4. Bebidas (e doces) — só os nomes, em linha corrida
  if (orc.temBebidas) {
    if (y + 16 > PAGE_BOTTOM) novaPagina();
    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("Bebidas", MARGIN, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const linhas = doc.splitTextToSize(orc.bebidasLinha, rightX - MARGIN);
    linhas.forEach((linha) => {
      if (y + 5 > PAGE_BOTTOM) novaPagina();
      doc.text(linha, MARGIN, y);
      y += 5;
    });
    y += 6;
  }

  // 5. Observações comerciais
  if (orc.observacoesComerciais) {
    if (y + 16 > PAGE_BOTTOM) novaPagina();
    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("Observações", MARGIN, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const linhas = doc.splitTextToSize(orc.observacoesComerciais, rightX - MARGIN);
    linhas.forEach((linha) => {
      if (y + 5 > PAGE_BOTTOM) novaPagina();
      doc.text(linha, MARGIN, y);
      y += 5;
    });
    y += 6;
  }

  // 6. Bloco de preço (faixa verde em destaque) — apenas preços finais
  const blocoAltura = 26;
  if (y + blocoAltura > PAGE_BOTTOM) novaPagina();
  doc.setFillColor(...VERDE_CLARO_BG);
  doc.roundedRect(MARGIN, y, rightX - MARGIN, blocoAltura, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`Preço por pessoa ${orc.precoPorPessoaFmt}`, MARGIN + 6, y + 10);
  doc.setFontSize(12);
  doc.text(`Total · ${orc.numPessoas} pessoas ${orc.totalFmt}`, MARGIN + 6, y + 19);
  y += blocoAltura + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Condições de pagamento a combinar · confirmação mediante aprovação deste orçamento.", MARGIN, y);
  y += 10;

  // 7. Rodapé com identidade + numeração de páginas
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Laboratório de Cozinha · Gastronomia Planejada · por Carmen Reinstein · pág. ${p}/${totalPaginas}`,
      pageWidth / 2,
      292,
      { align: "center" }
    );
  }

  doc.save(`orcamento-${slugify(planejamento.nome)}.pdf`);
}
