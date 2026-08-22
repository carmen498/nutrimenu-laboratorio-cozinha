import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, DatabaseZap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import {
  diagnosticarIngredienteReceita,
  resolverNomeIngredienteReceita,
} from "@/lib/ingredienteReceitaModel";

export default function AuditoriaComposicaoReceita() {
  const [normalizando, setNormalizando] = useState(false);
  const qc = useQueryClient();

  const { data: itens = [], isLoading: l1 } = useQuery({
    queryKey: ["auditoria-composicao-itens"],
    queryFn: () => fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
  });
  const { data: ingredientes = [], isLoading: l2 } = useQuery({
    queryKey: ["auditoria-composicao-ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "nome"),
  });
  const { data: receitas = [], isLoading: l3 } = useQuery({
    queryKey: ["auditoria-composicao-receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "nome"),
  });

  const ingredienteMap = useMemo(() => Object.fromEntries(ingredientes.map((i) => [i.id, i])), [ingredientes]);
  const receitaMap = useMemo(() => Object.fromEntries(receitas.map((r) => [r.id, r])), [receitas]);

  const diagnostico = useMemo(() => {
    const rows = itens.map((item) => {
      const d = diagnosticarIngredienteReceita(item);
      const referenciaExiste = d.tipo === "ingrediente"
        ? !!ingredienteMap[item.ingrediente_id]
        : d.tipo === "subreceita"
          ? !!receitaMap[item.subreceita_id]
          : true;
      const problemas = [...d.problemas];
      if (!referenciaExiste && d.tipo === "ingrediente" && item.ingrediente_id) problemas.push("ingrediente_id_nao_encontrado");
      if (!referenciaExiste && d.tipo === "subreceita" && item.subreceita_id) problemas.push("subreceita_id_nao_encontrado");
      return {
        item,
        ...d,
        problemas,
        validoReal: problemas.length === 0,
        nome: resolverNomeIngredienteReceita(item, ingredienteMap, receitaMap),
        receitaNome: receitaMap[item.receita_id]?.nome || item.receita_id || "Receita não encontrada",
      };
    });
    return {
      rows,
      total: rows.length,
      v2: rows.filter((r) => r.modeloVersao >= 2).length,
      legados: rows.filter((r) => r.legado).length,
      revisar: rows.filter((r) => !r.validoReal).length,
    };
  }, [itens, ingredienteMap, receitaMap]);

  const pendencias = useMemo(
    () => diagnostico.rows.filter((r) => r.legado || !r.validoReal).slice(0, 250),
    [diagnostico]
  );

  const handleNormalizar = async () => {
    setNormalizando(true);
    try {
      const res = await base44.functions.invoke("normalizarIngredienteReceita", {});
      const dados = res?.data || {};
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["auditoria-composicao-itens"] }),
        qc.invalidateQueries({ queryKey: ["itens-receita"] }),
      ]);
      toast.success(
        `${dados.total_normalizado || 0} item(ns) normalizado(s); ${dados.total_a_revisar || 0} mantido(s) para revisão manual.`
      );
    } catch (error) {
      toast.error("Erro ao normalizar composição: " + (error?.message || "erro desconhecido"));
    } finally {
      setNormalizando(false);
    }
  };

  if (l1 || l2 || l3) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Composição das Receitas</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Audita IngredienteReceita. A identidade canônica é feita por IDs; nomes livres permanecem apenas como cache legado.
            A normalização não inventa referências ausentes e não exclui registros.
          </p>
        </div>
        <Button onClick={handleNormalizar} disabled={normalizando} className="gap-2">
          {normalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
          Normalizar registros seguros
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{diagnostico.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Modelo v2</p><p className="text-xl font-bold text-primary">{diagnostico.v2}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Legados</p><p className="text-xl font-bold text-amber-600">{diagnostico.legados}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">A revisar</p><p className="text-xl font-bold text-destructive">{diagnostico.revisar}</p></Card>
      </div>

      {pendencias.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-medium">Nenhuma pendência de composição encontrada.</p>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1.2fr_100px_90px_1.5fr] gap-2 px-3 py-2 bg-secondary/50 text-[10px] uppercase font-semibold text-muted-foreground">
            <div>Receita</div><div>Item</div><div>Tipo</div><div>Modelo</div><div>Diagnóstico</div>
          </div>
          {pendencias.map((row) => (
            <div key={row.item.id} className="grid md:grid-cols-[1.4fr_1.2fr_100px_90px_1.5fr] gap-2 px-3 py-2.5 border-t border-border text-sm items-center">
              <div className="min-w-0 truncate" title={row.receitaNome}>{row.receitaNome}</div>
              <div className="min-w-0 truncate font-medium" title={row.nome}>{row.nome}</div>
              <div><Badge variant="outline" className="text-[10px]">{row.tipo}</Badge></div>
              <div><Badge variant={row.legado ? "secondary" : "outline"} className="text-[10px]">v{row.modeloVersao}</Badge></div>
              <div className="text-xs">
                {row.problemas.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="w-3 h-3" /> {row.problemas.join(", ")}</span>
                ) : (
                  <span className="text-amber-700">Legado normalizável</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {diagnostico.rows.filter((r) => r.legado || !r.validoReal).length > 250 && (
        <p className="text-xs text-muted-foreground">Exibindo as primeiras 250 pendências. Os totais acima consideram todos os registros carregados.</p>
      )}
    </div>
  );
}
