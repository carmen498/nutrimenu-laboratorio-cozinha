import { jsPDF } from "jspdf";
import { montarOrcamento } from "@/lib/orcamentoCalc";

// Orçamento — documento COMERCIAL para o cliente. Usa montarOrcamento como fonte
// única de dados (recebe só o preço de venda já calculado) — NUNCA desenha custo,
// custo por pessoa, markup, % ou kg de produção neste PDF.

const VERDE_ESCURO = [42, 78, 61];
const VERDE_CLARO_BG = [232, 243, 236];
const MARGIN = 14;
const TOP_START = 20;
const PAGE_BOTTOM = 275;

function slugify(s) {
  return (s || "orcamento")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

export function gerarOrcamentoPDF({ cardapio, num, receitasView, receitaMap, precoPorUnidade, totalVenda, validadeDias }) {
  const orc = montarOrcamento({ cardapio, num, receitasView, receitaMap, precoPorUnidade, totalVenda, validadeDias });

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  let y = TOP_START;

  function novaPagina() {
    doc.addPage();
    y = TOP_START;
  }

  // 1. Cabeçalho timbrado
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

  // 2. Identificação
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(orc.nome, MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`${orc.numPessoas} ${orc.unidadeLabel}`, rightX, y, { align: "right" });
  y += 6;
  if (orc.dataEvento) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(orc.dataEvento, MARGIN, y);
    y += 6;
  }
  y += 4;

  // 3. Cardápio — apenas nome + descritivo (sem dado técnico)
  doc.setFont("times", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Cardápio", MARGIN, y);
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

  // 4. Observações comerciais
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

  // 5. Bloco de preço (faixa verde em destaque) — apenas preços finais de venda
  const blocoAltura = 26;
  if (y + blocoAltura > PAGE_BOTTOM) novaPagina();
  doc.setFillColor(...VERDE_CLARO_BG);
  doc.roundedRect(MARGIN, y, rightX - MARGIN, blocoAltura, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`Preço por pessoa ${orc.precoPorPessoaFmt}`, MARGIN + 6, y + 10);
  doc.setFontSize(12);
  doc.text(`Total · ${orc.numPessoas} ${orc.unidadeLabel} ${orc.totalFmt}`, MARGIN + 6, y + 19);
  y += blocoAltura + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Condições de pagamento a combinar · confirmação mediante aprovação deste orçamento.", MARGIN, y);
  y += 10;

  // 6. Rodapé com numeração de páginas
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

  doc.save(`orcamento-${slugify(cardapio.nome)}.pdf`);
}