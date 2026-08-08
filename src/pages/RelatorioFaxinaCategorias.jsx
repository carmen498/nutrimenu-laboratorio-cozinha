import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RelatorioFaxinaCategorias() {
  const [rodando, setRodando] = useState(false);
  const qc = useQueryClient();

  const { data: relatorios = [], isLoading } = useQuery({
    queryKey: ["relatorios-faxina-categorias"],
    queryFn: () => base44.entities.RelatorioFaxinaCategoriasReceitas.list("-data_execucao", 10),
  });

  const ultimo = relatorios[0];

  const handleExecutar = async () => {
    setRodando(true);
    try {
      await base44.functions.invoke("faxinaCategoriasReceitas", {});
      toast.success("Faxina de categorias concluída!");
      qc.invalidateQueries({ queryKey: ["relatorios-faxina-categorias"] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
    } catch (e) {
      toast.error("Erro ao executar faxina: " + (e.message || ""));
    } finally {
      setRodando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Faxina de Categorias de Receitas</h2>
          <p className="text-sm text-muted-foreground">
            Renomeia "Petiscos" → "Entradas", ajusta plurais e migra as receitas. Idempotente: pode rodar de novo com segurança.
          </p>
        </div>
        <Button onClick={handleExecutar} disabled={rodando} className="gap-2">
          <Sparkles className="w-4 h-4" /> {rodando ? "Executando..." : "Executar Faxina"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !ultimo ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Nenhuma execução registrada ainda.
        </Card>
      ) : (
        <div className="space-y-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              Última execução: {new Date(ultimo.data_execucao).toLocaleString("pt-BR")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-2xl font-bold text-primary">{ultimo.total_receitas_processadas}</p>
                <p className="text-[11px] text-muted-foreground">Receitas analisadas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-2xl font-bold text-primary">{ultimo.total_receitas_alteradas}</p>
                <p className="text-[11px] text-muted-foreground">Receitas migradas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-2xl font-bold text-primary">{ultimo.total_cardapio_receita_alteradas}</p>
                <p className="text-[11px] text-muted-foreground">Caches de cardápio atualizados</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-2xl font-bold text-primary">{ultimo.total_secoes_evento_renomeadas}</p>
                <p className="text-[11px] text-muted-foreground">Seções de evento migradas</p>
              </div>
            </div>

            {(ultimo.regras || []).length > 0 && (
              <div className="space-y-1.5 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regras aplicadas</p>
                {ultimo.regras.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-secondary/40 rounded-lg px-3 py-1.5">
                    <Badge variant="outline">{r.categoria_antes}</Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <Badge>{r.categoria_depois}</Badge>
                    <span className="ml-auto text-muted-foreground text-xs">{r.receitas_migradas} receita(s)</span>
                  </div>
                ))}
              </div>
            )}

            {(ultimo.receitas_com_ovos || []).length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Categoria "Ovos" não excluída — {ultimo.receitas_com_ovos.length} receita(s) vinculada(s) (decisão manual)
                </p>
                <ul className="text-xs text-amber-800/80 space-y-0.5 pl-1">
                  {ultimo.receitas_com_ovos.map((r) => (
                    <li key={r.id}>• {r.nome}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {relatorios.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Execuções anteriores</p>
              {relatorios.slice(1).map((r) => (
                <Card key={r.id} className="p-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{new Date(r.data_execucao).toLocaleString("pt-BR")}</span>
                  <span className="text-xs text-muted-foreground">{r.total_receitas_alteradas} migradas</span>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}