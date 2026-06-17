import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function HistoricoAtualizacoesDialog({ open, onClose, logs }) {
  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }) + "h";
  };

  const formatSegundos = (s) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return m > 0 ? `${m}min ${seg}s` : `${seg}s`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Histórico de atualizações automáticas</DialogTitle>
        </DialogHeader>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma atualização automática registrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium">Data</th>
                  <th className="text-center py-2 px-2 font-medium">Processados</th>
                  <th className="text-center py-2 px-2 font-medium">Atualizados</th>
                  <th className="text-center py-2 px-2 font-medium">Mantidos</th>
                  <th className="text-right py-2 pl-3 font-medium">Duração</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 pr-3">{formatDate(log.data_execucao)}</td>
                    <td className="text-center py-2.5 px-2">{log.total_processado || 0}</td>
                    <td className="text-center py-2.5 px-2 text-green-700 font-medium">{log.total_atualizado || 0}</td>
                    <td className="text-center py-2.5 px-2 text-muted-foreground">{log.total_mantido || 0}</td>
                    <td className="text-right py-2.5 pl-3 text-muted-foreground">{formatSegundos(log.duracao_segundos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}