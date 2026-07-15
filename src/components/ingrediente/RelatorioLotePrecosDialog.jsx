import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function RelatorioLotePrecosDialog({ open, onClose }) {
  const { data: log, isLoading } = useQuery({
    queryKey: ["relatorio-lote-precos"],
    queryFn: async () => {
      const logs = await base44.entities.AtualizacaoLotePrecosLog.list("-data_execucao", 1);
      return logs[0] || null;
    },
    enabled: open,
  });

  const formatPrice = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Relatório — Atualização em Lote de Preços</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !log ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma execução registrada ainda.</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="text-xs text-muted-foreground">
              Executado em {new Date(log.data_execucao).toLocaleDateString("pt-BR")} às{" "}
              {new Date(log.data_execucao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-green-100 text-green-700 border-green-300">{log.total_atualizado} atualizados</Badge>
              <Badge className="bg-amber-100 text-amber-700 border-amber-300">{log.total_pulado} pulados</Badge>
              <Badge className="bg-red-100 text-red-700 border-red-300">{log.total_nao_localizado} não localizados</Badge>
            </div>

            {(log.atualizados || []).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1.5">Atualizados</p>
                <div className="space-y-1">
                  {log.atualizados.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded p-1.5">
                      <span>{a.nome}</span>
                      <span className="text-muted-foreground">
                        {formatPrice(a.preco_embalagem_antes)} → <strong>{formatPrice(a.preco_embalagem_depois)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(log.pulados || []).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1.5">Pulados</p>
                <div className="space-y-1">
                  {log.pulados.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-amber-50 rounded p-1.5">
                      <span>{p.nome}</span>
                      <span className="text-amber-700">{p.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(log.nao_localizados || []).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1.5">Não localizados</p>
                <div className="flex flex-wrap gap-1.5">
                  {log.nao_localizados.map((n, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>
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