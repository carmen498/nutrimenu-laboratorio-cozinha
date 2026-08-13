import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";

// Relatório somente leitura: receitas com 3 ingredientes reais ou menos
// (ignora sub-títulos/grupos). Não altera nenhum dado.
export default function RelatorioPoucosIngredientes() {
  const [loading, setLoading] = useState(true);
  const [linhas, setLinhas] = useState([]);

  useEffect(() => {
    (async () => {
      const [receitas, itensAll] = await Promise.all([
        fetchAllPages(base44.entities.Receita, "-nome"),
        fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
      ]);

      const itensByReceita = {};
      itensAll.forEach((i) => {
        if (!itensByReceita[i.receita_id]) itensByReceita[i.receita_id] = [];
        itensByReceita[i.receita_id].push(i);
      });

      const resultado = [];
      receitas.forEach((r) => {
        const itens = (itensByReceita[r.id] || []).filter((i) => i.tipo !== "grupo");
        if (itens.length <= 3) {
          const categoria = r.categorias?.length > 0 ? r.categorias.join(", ") : (r.categoria || "(sem categoria)");
          const nomes = itens.map((i) =>
            i.tipo === "subreceita" ? (i.subreceita_nome || "(sub-receita sem nome)") : (i.ingrediente_nome || "(sem nome)")
          );
          resultado.push({ id: r.id, nome: r.nome, categoria, qtd: itens.length, ingredientes: nomes.join("; ") });
        }
      });

      resultado.sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
      setLinhas(resultado);
      setLoading(false);
    })();
  }, []);

  const totalPorQtd = useMemo(() => {
    const map = { 0: 0, 1: 0, 2: 0, 3: 0 };
    linhas.forEach((l) => { map[l.qtd] = (map[l.qtd] || 0) + 1; });
    return map;
  }, [linhas]);

  const handleExport = () => {
    downloadCsv(
      "receitas_poucos_ingredientes.csv",
      ["Categoria", "Receita", "Qtd Ingredientes", "Ingredientes"],
      linhas.map((l) => [l.categoria, l.nome, l.qtd, l.ingredientes])
    );
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Card className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm space-x-4">
              <span className="font-bold">{linhas.length} receitas encontradas</span>
              <span className="text-muted-foreground">0 ing: {totalPorQtd[0]}</span>
              <span className="text-muted-foreground">1 ing: {totalPorQtd[1]}</span>
              <span className="text-muted-foreground">2 ing: {totalPorQtd[2]}</span>
              <span className="text-muted-foreground">3 ing: {totalPorQtd[3]}</span>
            </div>
            <Button size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Exportar CSV
            </Button>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Categoria</th>
                  <th className="text-left p-2 font-medium">Receita</th>
                  <th className="text-center p-2 font-medium">Qtd</th>
                  <th className="text-left p-2 font-medium">Ingredientes</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 text-muted-foreground">{l.categoria}</td>
                    <td className="p-2 font-medium">
                      <Link to={`/receita/${l.id}`} className="text-primary hover:underline">
                        {l.nome}
                      </Link>
                    </td>
                    <td className="p-2 text-center">{l.qtd}</td>
                    <td className="p-2 text-muted-foreground">{l.ingredientes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}