import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const LABELS = {
  normalizar: "Normalização em lote",
  corrigir: "Correção manual",
  separar_pronto: "Separação cru/pronto",
  consolidar_duplicados: "Consolidação de duplicados",
};

export default function HistoricoSaneamentoMedidas() {
  const { data: logs = [] } = useQuery({
    queryKey: ["saneamento-medidas-log"],
    queryFn: () => base44.entities.SaneamentoMedidaCaseiraLog.list("-executado_em", 20),
    staleTime: 15 * 1000,
  });

  if (logs.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Histórico de saneamento</h3>
        <p className="text-xs text-muted-foreground mt-1">Últimas operações administrativas registradas pela Fase 7.1.</p>
      </div>
      <div className="divide-y">
        {logs.map(log => (
          <div key={log.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{LABELS[log.acao] || log.acao}</Badge>
            <span className="text-xs text-muted-foreground">
              {log.executado_em ? new Date(log.executado_em).toLocaleString("pt-BR") : "data não informada"}
            </span>
            {Number(log.ingrediente_receita_atualizados) > 0 && (
              <span className="text-xs">{log.ingrediente_receita_atualizados} vínculo(s) de receita repontado(s)</span>
            )}
            {Array.isArray(log.medidas_removidas_ids) && log.medidas_removidas_ids.length > 0 && (
              <span className="text-xs">{log.medidas_removidas_ids.length} duplicado(s) removido(s)</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
