import { jsPDF } from "jspdf";

export const GRUPOS_ORDER = [
  "Carnes e Ovos", "Peixes e Frutos do Mar", "Laticínios",
  "Panificação e Cereais", "Verduras e Hortaliças", "Açúcares e Doces",
  "Óleos e Gorduras", "Temperos", "Frutas", "Diversos", "A Revisar",
];

const VERDE_ESCURO = [42, 78, 61];
const MARGIN = 14;
const COL_PRECO_RIGHT = 148;
const ROW_H = 6.2;
const TOP_START = 20;
const PAGE_BOTTOM = 283;
const NOME_MAX_WIDTH = 88;

function getGrupo(categoria) {
  return GRUPOS_ORDER.includes(categoria) ? categoria : "A Revisar";
}

function formatarMoeda(v) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarPreco(ing) {
  const unidade = (ing.unidade_compra || "").toUpperCase();
  if (unidade === "UN") {
    const v = ing.preco_embalagem_rs || 0;
    return v > 0 ? `R$ ${formatarMoeda(v)}/un` : "—";
  }
  const precoKg = (ing.preco_por_g_rs || 0) * 1000;
  return precoKg > 0 ? `R$ ${formatarMoeda(precoKg)}/kg` : "—";
}

function getUltimaAtualizacao(ing) {
  let data = null;
  if (Array.isArray(ing.historico_precos) && ing.historico_precos.length > 0) {
    const datas = ing.historico_precos.map((h) => h.data).filter(Boolean).map((d) => new Date(d)).filter((d) => !isNaN(d));
    if (datas.length > 0) data = new Date(Math.max(...datas.map((d) => d.getTime())));
  }
  if (!data && ing.preco_atualizado_em) {
    const d = new Date(ing.preco_atualizado_em);
    if (!isNaN(d)) data = d;
  }
  return data;
}

function isAlerta(data) {
  if (!data) return true;
  const dias = Math.floor((Date.now() - data.getTime()) / (1000 * 60 * 60 * 24));
  return dias > 90;
}

function formatarData(data) {
  return data ? data.toLocaleDateString("pt-BR") : "—";
}

/**
 * Gera o PDF de ingredientes e preços.
 * @param {Array} ingredientes Lista completa de ingredientes
 * @param {string|null} categoriaFiltro Se informado, restringe o relatório a essa categoria
 */
export function exportarIngredientesPDF(ingredientes, categoriaFiltro = null) {
  const doc = /** @type {any} */ (new jsPDF());
  const pageWidth = doc.internal.pageSize.getWidth();
  const colDataRight = pageWidth - MARGIN;
  let y = TOP_START;

  const lista = categoriaFiltro
    ? ingredientes.filter((i) => getGrupo(i.categoria) === categoriaFiltro)
    : ingredientes;

  const escopoLabel = categoriaFiltro || "Todas as categorias";
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  // Cabeçalho timbrado do documento
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text("Ingredientes e Preços", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`${escopoLabel} · ${lista.length} ingredientes · emitido em ${dataEmissao}`, MARGIN, y);
  y += 9;

  function drawTableHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...VERDE_ESCURO);
    doc.text("NOME", MARGIN, y);
    doc.text("PREÇO", COL_PRECO_RIGHT, y, { align: "right" });
    doc.text("ÚLT. ATUALIZAÇÃO", colDataRight, y, { align: "right" });
    y += 2.5;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, colDataRight, y);
    y += 4.5;
  }

  function novaPagina(redrawHeader) {
    doc.addPage();
    y = TOP_START;
    if (redrawHeader) drawTableHeader();
  }

  const grupos = categoriaFiltro ? [categoriaFiltro] : GRUPOS_ORDER;

  grupos.forEach((grupo) => {
    const items = lista
      .filter((i) => getGrupo(i.categoria) === grupo)
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
    items.forEach((ing) => {
      if (y + ROW_H > PAGE_BOTTOM) novaPagina(true);

      const dataAtualizacao = getUltimaAtualizacao(ing);
      const alerta = isAlerta(dataAtualizacao);

      let nome = ing.nome || "";
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      if (doc.getTextWidth(nome) > NOME_MAX_WIDTH) {
        while (nome.length > 3 && doc.getTextWidth(nome + "...") > NOME_MAX_WIDTH) {
          nome = nome.slice(0, -1);
        }
        nome += "...";
      }
      doc.text(nome, MARGIN, y);
      doc.text(formatarPreco(ing), COL_PRECO_RIGHT, y, { align: "right" });

      doc.setTextColor(...(alerta ? [180, 45, 30] : [90, 90, 90]));
      doc.text(formatarData(dataAtualizacao), colDataRight, y, { align: "right" });

      y += 4;
      doc.setDrawColor(225);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, y, colDataRight, y);
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
    : "todos";
  doc.save(`ingredientes-${slug}.pdf`);
}