import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";

export default function HistoricoAtualizacoesDialog({ open, onClose, logs }) {
  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    }) + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatSegundos = (s) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return m > 0 ? `${m}min ${seg}s` : `${seg}s`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Histórico de atualizações automáticas</DialogTitle>
        </DialogHeader>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma atualização automática registrada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatDate(log.data_execucao)}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {log.tipo === "automático" ? "🤖 Automático" : "👤 Manual"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <p className="font-bold text-base">{log.total_processado || 0}</p>
                    <p className="text-muted-foreground">Processados</p>
                  </div>
                  <div className="bg-green-50 rounded p-2 text-center">
                    <p className="font-bold text-base text-green-700">{log.total_atualizado || 0}</p>
                    <p className="text-green-600">Atualizados</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="font-bold text-base text-gray-600">{log.total_mantido || 0}</p>
                    <p className="text-gray-500">Mantidos</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>⏱ {formatSegundos(log.duracao_segundos)}</span>
                  {log.categorias_processadas?.length > 0 && (
                    <span className="truncate">
                      📂 {log.categorias_processadas.slice(0, 3).join(", ")}
                      {log.categorias_processadas.length > 3 ? " +" + (log.categorias_processadas.length - 3) : ""}
                    </span>
                  )}
                </div>

                {(log.maiores_altas?.length > 0 || log.maiores_baixas?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                    {log.maiores_altas?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-red-600 flex items-center gap-1 mb-1">
                          <TrendingUp className="w-3 h-3" /> Maiores altas
                        </p>
                        {log.maiores_altas.map((item, i) => (
                          <p key={i} className="text-[10px] text-red-700 truncate">
                            {item.nome} +{item.variacao}%
                          </p>
                        ))}
                      </div>
                    )}
                    {log.maiores_baixas?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-green-600 flex items-center gap-1 mb-1">
                          <TrendingDown className="w-3 h-3" /> Maiores baixas
                        </p>
                        {log.maiores_baixas.map((item, i) => (
                          <p key={i} className="text-[10px] text-green-700 truncate">
                            {item.nome} {item.variacao}%
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}