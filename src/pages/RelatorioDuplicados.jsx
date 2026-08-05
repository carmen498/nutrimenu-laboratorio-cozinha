import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/exportCsv";
import { agruparDuplicados, grupoTemNomeExato } from "@/lib/duplicados";

const formatPrecoKg = (precoPorG) => {
  if (!precoPorG) return "—";
  return `R$ ${(precoPorG * 1000).toFixed(2).replace(".", ",")}/kg`;
};

const formatData = (data) => (data ? new Date(data).toLocaleDateString("pt-BR") : "—");

export default function RelatorioDuplicados() {
  const { data: ingredientes = [], isLoading: loadingIng } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 5000),
  });

  const { data: receitas = [], isLoading: loadingRec } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-nome", 5000),
  });

  const { data: itensReceita = [] } = useQuery({
    queryKey: ["all-itens-receita"],
    queryFn: () => base44.entities.IngredienteReceita.list("-created_date", 5000),
  });

  const contagemIngredientesPorReceita = useMemo(() => {
    const map = new Map();
    itensReceita.forEach((it) => {
      if (it.tipo === "grupo") return;
      map.set(it.receita_id, (map.get(it.receita_id) || 0) + 1);
    });
    return map;
  }, [itensReceita]);

  const gruposIngredientes = useMemo(
    () => agruparDuplicados(ingredientes, (i) => i.nome),
    [ingredientes]
  );

  const gruposReceitas = useMemo(
    () => agruparDuplicados(receitas, (r) => r.nome),
    [receitas]
  );

  const exportarIngredientesCsv = () => {
    const rows = [];
    gruposIngredientes.forEach((grupo, idx) => {
      grupo.forEach((ing) => {
        rows.push([
          idx + 1,
          ing.nome,
          ing.categoria || "",
          formatPrecoKg(ing.preco_por_g_rs),
          formatData(ing.preco_atualizado_em),
        ]);
      });
    });
    downloadCsv(
      "ingredientes_duplicados.csv",
      ["Grupo", "Nome", "Categoria", "Preço/kg", "Atualizado em"],
      rows
    );
  };

  const exportarReceitasCsv = () => {
    const rows = [];
    gruposReceitas.forEach((grupo, idx) => {
      const exato = grupoTemNomeExato(grupo, (r) => r.nome);
      grupo.forEach((rec) => {
        rows.push([
          idx + 1,
          rec.nome,
          (rec.categorias || []).join("; "),
          rec.porcoes_base || "",
          contagemIngredientesPorReceita.get(rec.id) || 0,
          formatData(rec.created_date),
          exato ? "Sim" : "Não",
        ]);
      });
    });
    downloadCsv(
      "receitas_duplicadas.csv",
      ["Grupo", "Nome", "Categorias", "Porções Base", "Qtd Ingredientes", "Criado em", "Nome Exato Repetido"],
      rows
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display text-lg font-bold" style={{ color: "#2A4E3D" }}>
            Ingredientes possivelmente duplicados
            <Badge className="ml-2" variant="secondary">{gruposIngredientes.length} grupos</Badge>
          </h2>
          <Button variant="outline" size="sm" onClick={exportarIngredientesCsv} disabled={gruposIngredientes.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
          </Button>
        </div>

        {loadingIng ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : gruposIngredientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ingrediente duplicado encontrado.</p>
        ) : (
          <div className="space-y-3">
            {gruposIngredientes.map((grupo, idx) => (
              <div key={idx} className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 flex items-center gap-2">
                  <span className="text-sm font-semibold">Grupo {idx + 1}</span>
                  <Badge variant="secondary">{grupo.length} variantes</Badge>
                </div>
                <div className="divide-y divide-border/60">
                  {grupo.map((ing) => (
                    <Link
                      key={ing.id}
                      to={`/ingrediente/${ing.id}`}
                      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/30"
                    >
                      <span className="flex-1 min-w-0 font-medium truncate">{ing.nome}</span>
                      <span className="text-xs text-muted-foreground w-40 truncate">{ing.categoria || "—"}</span>
                      <span className="text-xs w-24 text-right whitespace-nowrap">{formatPrecoKg(ing.preco_por_g_rs)}</span>
                      <span className="text-xs text-muted-foreground w-24 text-right whitespace-nowrap">{formatData(ing.preco_atualizado_em)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display text-lg font-bold" style={{ color: "#2A4E3D" }}>
            Receitas possivelmente duplicadas
            <Badge className="ml-2" variant="secondary">{gruposReceitas.length} grupos</Badge>
          </h2>
          <Button variant="outline" size="sm" onClick={exportarReceitasCsv} disabled={gruposReceitas.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
          </Button>
        </div>

        {loadingRec ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : gruposReceitas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma receita duplicada encontrada.</p>
        ) : (
          <div className="space-y-3">
            {gruposReceitas.map((grupo, idx) => {
              const exato = grupoTemNomeExato(grupo, (r) => r.nome);
              return (
                <div key={idx} className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/50 flex items-center gap-2">
                    <span className="text-sm font-semibold">Grupo {idx + 1}</span>
                    <Badge variant="secondary">{grupo.length} variantes</Badge>
                    {exato && <Badge variant="destructive">Nome exato repetido</Badge>}
                  </div>
                  <div className="divide-y divide-border/60">
                    {grupo.map((rec) => (
                      <Link
                        key={rec.id}
                        to={`/receita/${rec.id}`}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/30"
                      >
                        <span className="flex-1 min-w-0 font-medium truncate">{rec.nome}</span>
                        <span className="text-xs text-muted-foreground w-40 truncate">{(rec.categorias || []).join(", ") || "—"}</span>
                        <span className="text-xs text-muted-foreground w-20 text-right whitespace-nowrap">{rec.porcoes_base ? `${rec.porcoes_base} porç.` : "—"}</span>
                        <span className="text-xs text-muted-foreground w-24 text-right whitespace-nowrap">{contagemIngredientesPorReceita.get(rec.id) || 0} ingr.</span>
                        <span className="text-xs text-muted-foreground w-24 text-right whitespace-nowrap">{formatData(rec.created_date)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}