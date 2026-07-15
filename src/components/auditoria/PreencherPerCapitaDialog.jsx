import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2 } from "lucide-react";

export default function PreencherPerCapitaDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const queryClient = useQueryClient();

  const handleExecutar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("preencherPerCapitaCategoria", {});
      setResultado(res.data);
      queryClient.invalidateQueries({ queryKey: ["receitas"] });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (v) => {
    if (!v) setResultado(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Preencher PC por categoria
          </DialogTitle>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preenche automaticamente o per_capita_g de todas as receitas com PC nulo ou zero,
              usando um valor padrão conforme a categoria principal. Receitas que já têm PC não
              são alteradas.
            </p>
            <Button onClick={handleExecutar} disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Executar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{resultado.total_processado} sem PC encontradas</Badge>
              <Badge className="bg-green-100 text-green-800 border-green-300">{resultado.total_aplicado} atualizadas</Badge>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">{resultado.total_sem_categoria_definida} sem categoria definida</Badge>
            </div>

            {resultado.resumo_por_categoria.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Total aplicado por categoria</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  {resultado.resumo_por_categoria.map((c) => (
                    <div key={c.categoria} className="flex items-center justify-between px-3 py-2 text-sm border-t border-border first:border-t-0 bg-white">
                      <span>{c.categoria}</span>
                      <span className="text-muted-foreground">PC {c.pc_aplicado}g · {c.quantidade} receita(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.sem_categoria_definida.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Categoria sem PC definido (decisão manual)</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  {resultado.sem_categoria_definida.map((r) => (
                    <div key={r.receita_id} className="flex items-center justify-between px-3 py-2 text-sm border-t border-border first:border-t-0 bg-white">
                      <span>{r.receita_nome}</span>
                      <span className="text-muted-foreground">{r.categoria}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}