import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { REPORT_DEFS } from "@/lib/relatoriosDefs";
import CabecalhoRelatorio from "./CabecalhoRelatorio";

// Menu unificado de Relatórios — mesmas 5 opções, mesma ordem, em Cardápio e Evento.
// `handlers` só precisa conter os ids já implementados; os demais mostram "em breve".
export default function RelatoriosDialog({
  open, onClose, titulo, cabecalho, handlers = {}, loading = false, emptyMessage = null,
}) {
  const [gerando, setGerando] = useState(null);

  const handleClick = async (def) => {
    const handler = handlers[def.id];
    if (!handler) {
      toast.message("Disponível em breve", {
        description: `"${def.titulo}" ainda não foi implementado.`,
      });
      return;
    }
    setGerando(def.id);
    try {
      await handler();
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e?.message || ""));
    } finally {
      setGerando(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{titulo}</DialogTitle>
        </DialogHeader>

        {cabecalho && <CabecalhoRelatorio {...cabecalho} />}

        {emptyMessage ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {REPORT_DEFS.map((def) => {
              const Icon = def.icone;
              const implementado = !!handlers[def.id];
              return (
                <button
                  key={def.id}
                  onClick={() => handleClick(def)}
                  disabled={gerando !== null}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm disabled:opacity-50 ${
                    implementado ? def.cor : "bg-secondary/40 text-muted-foreground border-border"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {def.titulo}
                      {!implementado && (
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          em breve
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{def.descricao}</p>
                  </div>
                  {gerando === def.id && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}