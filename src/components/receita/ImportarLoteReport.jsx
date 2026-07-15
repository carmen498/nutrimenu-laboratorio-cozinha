import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function ImportarLoteReport({ report, onClose }) {
  const { created, updated, skipped, ambiguos, substituicoesCategoria } = report;
  const ambMsg = ambiguos > 0 ? ` · ${ambiguos} ambíguo(s) (X ou Y) — defina manualmente depois` : "";

  return (
    <div className="space-y-3">
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-800">
          Importação concluída! <strong>{created}</strong> criadas, <strong>{updated}</strong> atualizadas, {skipped} ignoradas.{ambMsg}
        </p>
      </div>

      {substituicoesCategoria.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {substituicoesCategoria.length} categoria(s) ajustada(s) para o valor válido mais próximo:
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {substituicoesCategoria.map((s, i) => (
              <div key={i} className="text-xs p-2 bg-muted/50 rounded">
                <span className="font-medium">{s.receita}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                  <span className="line-through">{s.original}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="text-foreground">{s.usada}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}