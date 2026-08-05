import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck, Link as LinkIcon, Download, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { auditarReceitas, TIPOS_PROBLEMA } from "@/lib/auditoriaReceitas";
import { downloadCsv } from "@/lib/exportCsv";
import PreencherPerCapitaDialog from "@/components/auditoria/PreencherPerCapitaDialog";
import { fetchAllPages } from "@/lib/fetchAllPages";

export default function AuditoriaReceitas() {
  const [filtro, setFiltro] = useState("todos");
  const [pcDialogOpen, setPcDialogOpen] = useState(false);

  const { data: receitas = [], isLoading: l1 } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });
  const { data: itens = [], isLoading: l2 } = useQuery({
    queryKey: ["ingredientesReceitaTodos"],
    queryFn: () => fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
  });
  const { data: ingredientes = [], isLoading: l3 } = useQuery({
    queryKey: ["ingredientesTodos"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });
  const { data: sinonimos = [], isLoading: l4 } = useQuery({
    queryKey: ["sinonimosIngredientesTodos"],
    queryFn: () => fetchAllPages(base44.entities.SinonimosIngredientes, "-created_date"),
  });

  const isLoading = l1 || l2 || l3 || l4;

  const auditoria = useMemo(() => {
    if (isLoading) return [];
    return auditarReceitas(receitas, itens, ingredientes, sinonimos);
  }, [receitas, itens, ingredientes, sinonimos, isLoading]);

  const filtrada = useMemo(() => {
    if (filtro === "todos") return auditoria;
    return auditoria.filter((r) => r.problemas.some((p) => p.tipo === filtro));
  }, [auditoria, filtro]);

  const handleExportCsv = () => {
    const headers = ["Receita", "Categoria", "Problemas", "Nº ingredientes", "Rendimento (g)", "Custo total (R$)"];
    const rows = filtrada.map((r) => [
      r.nome,
      r.categoria,
      r.problemas.map((p) => p.label).join("; "),
      r.nIngredientes,
      r.rendimento,
      r.custoTotal.toFixed(2),
    ]);
    downloadCsv("auditoria-receitas.csv", headers, rows);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-amber-500" />
            Auditoria de Receitas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Relatório de sanidade, somente leitura — nenhum dado é alterado aqui.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPcDialogOpen(true)} variant="outline" className="gap-2">
            <Wand2 className="w-4 h-4" /> Preencher PC por categoria
          </Button>
          <Button onClick={handleExportCsv} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <PreencherPerCapitaDialog open={pcDialogOpen} onOpenChange={setPcDialogOpen} />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por problema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os problemas</SelectItem>
            {TIPOS_PROBLEMA.map((t) => (
              <SelectItem key={t.tipo} value={t.tipo}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {filtrada.length} receita{filtrada.length !== 1 ? "s" : ""} com problema{filtrada.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {filtrada.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma receita com problema encontrado.</Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50 min-w-[720px]">
            <div className="flex-1 min-w-[160px]">Receita</div>
            <div className="w-32">Categoria</div>
            <div className="flex-1 min-w-[220px]">Problemas</div>
            <div className="w-20 text-right">Ingr.</div>
            <div className="w-24 text-right">Rendimento</div>
            <div className="w-24 text-right">Custo</div>
          </div>
          {filtrada.map((r) => (
            <div key={r.id} className="flex flex-wrap sm:flex-nowrap items-start gap-3 px-3 py-2.5 border-t border-border min-w-[720px]">
              <div className="flex-1 min-w-[160px]">
                <Link to={`/receita/${r.id}`} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                  {r.nome} <LinkIcon className="w-3 h-3" />
                </Link>
              </div>
              <div className="w-32 text-xs text-muted-foreground truncate" title={r.categoria}>{r.categoria || "—"}</div>
              <div className="flex-1 min-w-[220px] flex flex-wrap gap-1">
                {r.problemas.map((p, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                    {p.label}
                  </Badge>
                ))}
              </div>
              <div className="w-full sm:w-20 text-right text-sm font-medium">{r.nIngredientes}</div>
              <div className="w-full sm:w-24 text-right text-sm text-muted-foreground">{r.rendimento ? `${r.rendimento.toLocaleString("pt-BR")} g` : "—"}</div>
              <div className="w-full sm:w-24 text-right text-sm font-medium">R$ {r.custoTotal.toFixed(2).replace(".", ",")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}