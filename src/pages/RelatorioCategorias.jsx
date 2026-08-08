import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ChefHat } from "lucide-react";
import { getCategorias } from "@/lib/categoriasHelper";
import { CATEGORIAS, ICONE_CATEGORIA } from "@/components/receita/CategoriaPicker";
import { fetchAllPages } from "@/lib/fetchAllPages";

const CORES_CATEGORIA = {
  "Carne Bovina":                  { bg: "#FFEBEE", texto: "#C62828" },
  "Aves":                          { bg: "#FFF3E0", texto: "#E65100" },
  "Peixes e Frutos do Mar":        { bg: "#E3F2FD", texto: "#1565C0" },
  "Ovos":                          { bg: "#FFF8E1", texto: "#F57F17" },
  "Massas, Pastelão e Quiches":    { bg: "#FBE9E7", texto: "#BF360C" },
  "Arroz e Risotos":               { bg: "#EFEBE9", texto: "#4E342E" },
  "Sopas e Caldos":                { bg: "#E0F2F1", texto: "#00695C" },
  "Leguminosas":                   { bg: "#E8F5E9", texto: "#2E7D32" },
  "Salgadinhos":                   { bg: "#FCE4EC", texto: "#AD1457" },
  "Pães e Bolos":                  { bg: "#FFFDE7", texto: "#F9A825" },
  "Sobremesas":                    { bg: "#F3E5F5", texto: "#6A1B9A" },
  "Molhos":                        { bg: "#EDE7F6", texto: "#4527A0" },
  "Acompanhamentos":               { bg: "#F1F8E9", texto: "#558B2F" },
  "Pratos Principais":             { bg: "#FFEBEE", texto: "#B71C1C" },
  "Prato Único":                   { bg: "#FFF8E1", texto: "#E65100" },
  "Entradas":                      { bg: "#ECEFF1", texto: "#455A64" },
  "Lanche":                        { bg: "#F9FBE7", texto: "#827717" },
  "Receitas Base":                 { bg: "#EFEBE9", texto: "#5D4037" },
};

export default function RelatorioCategorias() {
  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const agrupado = useMemo(() => {
    const mapa = {};
    for (const cat of CATEGORIAS) {
      mapa[cat] = [];
    }
    const semCategoria = [];
    for (const r of receitas) {
      const cats = getCategorias(r);
      if (cats.length === 0) {
        semCategoria.push(r);
      } else {
        for (const c of cats) {
          if (mapa[c]) mapa[c].push(r);
        }
      }
    }
    // Filter to only categories with recipes + sort by count desc
    const entries = Object.entries(mapa)
      .filter(([, recipes]) => recipes.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
    if (semCategoria.length > 0) {
      entries.push(["Sem categoria", semCategoria]);
    }
    return entries;
  }, [receitas]);

  const totalReceitas = receitas.length;

  const handleExportCsv = () => {
    const rows = [["Categoria", "Qtd. Receitas", "Receitas"]];
    for (const [cat, recipes] of agrupado) {
      rows.push([cat, String(recipes.length), recipes.map(r => r.nome).join("; ")]);
    }
    const csv = rows.map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_categorias.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">
          Relatório por Categoria
          <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{totalReceitas}</Badge>
        </h1>
        <Button onClick={handleExportCsv} size="sm" variant="outline">
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {agrupado.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Nenhuma receita cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agrupado.map(([cat, recipes]) => {
            const icone = ICONE_CATEGORIA[cat] || "📋";
            const cores = CORES_CATEGORIA[cat] || { bg: "#F5F5F5", texto: "#424242" };
            return (
              <Card key={cat} className="overflow-hidden">
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: cores.bg }}
                >
                  <span className="text-xl">{icone}</span>
                  <span className="flex-1 font-semibold text-sm" style={{ color: cores.texto }}>
                    {cat}
                  </span>
                  <Badge
                    className="text-xs font-bold border-0"
                    style={{ backgroundColor: cores.texto + "18", color: cores.texto }}
                  >
                    {recipes.length} receita{recipes.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="px-4 py-2.5">
                  <ul className="space-y-0.5">
                    {recipes
                      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
                      .map((r) => (
                        <li key={r.id} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {r.nome}
                        </li>
                      ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}