import { jsPDF } from "jspdf";
import { CATEGORIAS as CATEGORIAS_ORDER } from "@/components/receita/CategoriaPicker";
import { getCategorias } from "@/lib/categoriasHelper";

const VERDE_ESCURO = [42, 78, 61];
const MARGIN = 14;
const COL_PC_RIGHT = 122;
const COL_REND_RIGHT = 148;
const ROW_H = 6.2;
const TOP_START = 20;
const PAGE_BOTTOM = 283;
const NOME_MAX_WIDTH = 78;

function formatarMoeda(v) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarPC(receita) {
  const pc = receita.per_capita_g;
  return pc != null && pc > 0 ? `${pc.toLocaleString("pt-BR")} g` : "—";
}

function formatarRendimento(receita) {
  const r = receita.rendimento_total;
  if (r == null || r <= 0) return "—";
  return `${(r / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

function formatarCusto(receita) {
  const c = receita.custo_por_porcao;
  return c != null && c > 0 ? `R$ ${formatarMoeda(c)}` : "—";
}

/**
 * Gera o PDF de receitas agrupadas por categoria.
 * @param {Array} receitas Lista completa de receitas
 * @param {string|null} categoriaFiltro Se informado, restringe o relatório a essa categoria
 */
export function exportarReceitasPDF(receitas, categoriaFiltro = null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const colCustoRight = pageWidth - MARGIN;
  let y = TOP_START;

  const lista = categoriaFiltro
    ? receitas.filter((r) => getCategorias(r).includes(categoriaFiltro))
    : receitas;

  const escopoLabel = categoriaFiltro || "Todas as categorias";
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  // Cabeçalho timbrado do documento
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Receitas", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`RECEITAS — ${escopoLabel} · ${lista.length} receitas · emitido em ${dataEmissao}`, MARGIN, y);
  y += 9;

  function drawTableHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("NOME", MARGIN, y);
    doc.text("PC RECOMENDADO", COL_PC_RIGHT, y, { align: "right" });
    doc.text("RENDIMENTO", COL_REND_RIGHT, y, { align: "right" });
    doc.text("CUSTO/PORÇÃO", colCustoRight, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, colCustoRight, y);
    y += 4.5;
  }

  function novaPagina(redrawHeader) {
    doc.addPage();
    y = TOP_START;
    if (redrawHeader) drawTableHeader();
  }

  const grupos = categoriaFiltro ? [categoriaFiltro] : CATEGORIAS_ORDER;

  grupos.forEach((grupo) => {
    const items = lista
      .filter((r) => getCategorias(r).includes(grupo))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
    if (items.length === 0) return;

    // Nunca inicia uma seção se restarem menos de 3 linhas na página
    const espacoMinimo = 14 + Math.min(items.length, 3) * ROW_H;
    if (y + espacoMinimo > PAGE_BOTTOM) novaPagina(false);

    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text(`${grupo} (${items.length})`, MARGIN, y);
    y += 6;

    drawTableHeader();

    doc.setFont("helvetica", "normal");
    items.forEach((receita) => {
      if (y + ROW_H > PAGE_BOTTOM) novaPagina(true);

      let nome = receita.nome || "";
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      if (doc.getTextWidth(nome) > NOME_MAX_WIDTH) {
        while (nome.length > 3 && doc.getTextWidth(nome + "...") > NOME_MAX_WIDTH) {
          nome = nome.slice(0, -1);
        }
        nome += "...";
      }
      doc.text(nome, MARGIN, y);
      doc.text(formatarPC(receita), COL_PC_RIGHT, y, { align: "right" });
      doc.text(formatarRendimento(receita), COL_REND_RIGHT, y, { align: "right" });

      doc.setTextColor(90, 90, 90);
      doc.text(formatarCusto(receita), colCustoRight, y, { align: "right" });

      y += 4;
      doc.setDrawColor(225);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, y, colCustoRight, y);
      y += ROW_H - 4;
    });

    y += 5;
  });

  // Rodapé com numeração de páginas (segunda passada, após saber o total)
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Laboratório de Cozinha · Gastronomia Planejada · valores na data de emissão · pág. ${p}/${totalPaginas}`,
      pageWidth / 2,
      292,
      { align: "center" }
    );
  }

  const slug = categoriaFiltro
    ? categoriaFiltro
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
    : "todas";
  doc.save(`receitas-${slug}.pdf`);
}