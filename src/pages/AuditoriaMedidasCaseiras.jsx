import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, DatabaseZap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { diagnosticarMedidaCaseira } from "@/lib/medidaCaseiraModel";

export default function AuditoriaMedidasCaseiras() {
  const [normalizando, setNormalizando] = useState(false);
  const qc = useQueryClient();

  const { data: medidas = [], isLoading: l1 } = useQuery({
    queryKey: ["auditoria-medidas-caseiras"],
    queryFn: () => fetchAllPages(base44.entities.MedidaCaseira, "-created_date"),
  });
  const { data: ingredientes = [], isLoading: l2 } = useQuery({
    queryKey: ["auditoria-medidas-ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "nome"),
  });
  const { data: utensilios = [], isLoading: l3 } = useQuery({
    queryKey: ["auditoria-medidas-utensilios"],
    queryFn: () => fetchAllPages(base44.entities.UtensilioPadrao, "simbolo"),
  });

  const ingredienteMap = useMemo(() => Object.fromEntries(ingredientes.map(i => [i.id, i])), [ingredientes]);
  const utensilioMap = useMemo(() => Object.fromEntries(utensilios.map(u => [u.id, u])), [utensilios]);

  const diagnostico = useMemo(() => {
    const baseRows = medidas.map(mc => {
      const d = diagnosticarMedidaCaseira(mc);
      const problemas = [...d.problemas];
      if (d.ingredienteId && !ingredienteMap[d.ingredienteId]) problemas.push("ingrediente_id_nao_encontrado");
      if (d.utensilioId && !utensilioMap[d.utensilioId]) problemas.push("utensilio_id_nao_encontrado");
      return { mc, ...d, problemas };
    });

    const contagemChaves = new Map();
    baseRows.forEach(r => contagemChaves.set(r.chaveCanonica, (contagemChaves.get(r.chaveCanonica) || 0) + 1));
    const rows = baseRows.map(r => ({
      ...r,
      problemas: (contagemChaves.get(r.chaveCanonica) || 0) > 1
        ? [...r.problemas, "chave_canonica_duplicada"]
        : r.problemas,
    }));

    return {
      rows,
      total: rows.length,
      v2: rows.filter(r => r.modeloVersao >= 2).length,
      legados: rows.filter(r => r.legado).length,
      revisar: rows.filter(r => r.problemas.length > 0).length,
      duplicados: rows.filter(r => r.problemas.includes("chave_canonica_duplicada")).length,
    };
  }, [medidas, ingredienteMap, utensilioMap]);

  const pendencias = useMemo(
    () => diagnostico.rows.filter(r => r.legado || r.problemas.length > 0).slice(0, 250),
    [diagnostico]
  );

  const handleNormalizar = async () => {
    setNormalizando(true);
    try {
      const res = await base44.functions.invoke("normalizarMedidasCaseiras", {});
      const dados = res?.data || {};
      await qc.invalidateQueries({ queryKey: ["auditoria-medidas-caseiras"] });
      await qc.invalidateQueries({ queryKey: ["medidas-caseiras"] });
      toast.success(`${dados.total_normalizado || 0} medida(s) normalizada(s); ${dados.total_a_revisar || 0} mantida(s) para revisão.`);
    } catch (error) {
      toast.error("Erro ao normalizar medidas: " + (error?.message || "erro desconhecido"));
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
          <h2 className="font-display text-xl font-bold">Medidas Caseiras</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Audita ingrediente, utensílio, estado e equivalência física. Registros antigos com medida de alimento pronto no mesmo campo são preservados para revisão manual.
          </p>
        </div>
        <Button onClick={handleNormalizar} disabled={normalizando} className="gap-2">
          {normalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
          Normalizar registros seguros
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{diagnostico.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Modelo v2</p><p className="text-xl font-bold text-primary">{diagnostico.v2}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Legados</p><p className="text-xl font-bold text-amber-600">{diagnostico.legados}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Duplicados</p><p className="text-xl font-bold text-amber-700">{diagnostico.duplicados}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">A revisar</p><p className="text-xl font-bold text-destructive">{diagnostico.revisar}</p></Card>
      </div>

      {pendencias.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-medium">Nenhuma pendência de medida caseira encontrada.</p>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1.2fr_1fr_90px_1.7fr] gap-2 px-3 py-2 bg-secondary/50 text-[10px] uppercase font-semibold text-muted-foreground">
            <div>Ingrediente</div><div>Utensílio</div><div>Estado</div><div>Modelo</div><div>Diagnóstico</div>
          </div>
          {pendencias.map(row => {
            const ingNome = ingredienteMap[row.ingredienteId]?.nome || row.mc.ingrediente_especifico || row.mc.nome || "—";
            const ute = utensilioMap[row.utensilioId];
            const uteNome = ute?.descricao_singular || ute?.nome || ute?.simbolo || row.utensilioId || "—";
            return (
              <div key={row.mc.id} className="grid md:grid-cols-[1.4fr_1.2fr_1fr_90px_1.7fr] gap-2 px-3 py-2.5 border-t border-border text-sm items-center">
                <div className="min-w-0 truncate" title={ingNome}>{ingNome}</div>
                <div className="min-w-0 truncate" title={uteNome}>{uteNome}</div>
                <div><Badge variant="outline" className="text-[10px]">{row.mc.estado_alimento || "não informado"}</Badge></div>
                <div><Badge variant={row.legado ? "secondary" : "outline"} className="text-[10px]">v{row.modeloVersao}</Badge></div>
                <div className="text-xs">
                  {row.problemas.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="w-3 h-3" /> {row.problemas.join(", ")}</span>
                  ) : (
                    <span className="text-amber-700">Legado normalizável</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
