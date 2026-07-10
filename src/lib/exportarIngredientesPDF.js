import { jsPDF } from "jspdf";

const GRUPOS_ORDER = [
  "Carnes e Ovos", "Peixes e Frutos do Mar", "Laticínios",
  "Panificação e Cereais", "Verduras e Hortaliças", "Açúcares e Doces",
  "Óleos e Gorduras", "Temperos", "Frutas",
  "Conservas e Enlatados", "Receitas Básicas", "Diversos", "A Revisar"
];

const GRUPO_MATCH = {
  "Carnes e Ovos": ["Carnes e Ovos"],
  "Peixes e Frutos do Mar": ["Peixes e Frutos do Mar"],
  "Laticínios": ["LATICÍNIOS"],
  "Panificação e Cereais": ["Panificação e Cereais"],
  "Verduras e Hortaliças": ["Verduras e Hortaliças"],
  "Açúcares e Doces": ["Açúcares e Doces"],
  "Óleos e Gorduras": ["Óleos e Gorduras"],
  "Temperos": ["TEMPEROS"],
  "Frutas": ["Frutas"],
  "Conservas e Enlatados": ["ENLATADOS", "Conservas e Enlatados"],
  "Receitas Básicas": ["Receitas Básicas"],
  "Diversos": ["DIVERSOS"],
  "A Revisar": ["A Revisar"],
};

function getGrupo(cat) {
  if (!cat) return "A Revisar";
  for (const [grupo, matches] of Object.entries(GRUPO_MATCH)) {
    if (matches.includes(cat)) return grupo;
  }
  return "Diversos";
}

export function exportarIngredientesPDF(ingredientes) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Ingredientes por Categoria", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`${ingredientes.length} ingredientes · ${new Date().toLocaleDateString("pt-BR")}`, margin, y);
  y += 8;

  const grouped = {};
  ingredientes.forEach(ing => {
    const g = getGrupo(ing.categoria);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(ing);
  });

  GRUPOS_ORDER.forEach(grupo => {
    const items = (grouped[grupo] || []).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (items.length === 0) return;

    if (y > 270) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(`${grupo} (${items.length})`, margin, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Nome", margin, y);
    doc.text("Preço/kg", pageWidth - margin - 45, y, { align: "right" });
    doc.text("Embalagem", pageWidth - margin, y, { align: "right" });
    y += 3;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont(undefined, "normal");
    items.forEach(ing => {
      if (y > 280) { doc.addPage(); y = 20; }
      const precoKg = (ing.preco_por_g_rs || 0) * 1000;
      const peso = ing.peso_embalagem_g || 0;
      const unidade = ing.unidade_compra || "";
      const embStr = peso > 0 ? `${peso}g ${unidade}` : unidade;

      doc.text((ing.nome || "").substring(0, 65), margin, y);
      doc.text(precoKg > 0 ? `R$ ${precoKg.toFixed(2)}` : "—", pageWidth - margin - 45, y, { align: "right" });
      doc.text(embStr, pageWidth - margin, y, { align: "right" });
      y += 4;
    });
    y += 4;
  });

  doc.save("ingredientes-categorias.pdf");
}