import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export default function TrialProgressoBanner({ diasUsados, diasRestantesJanela, janelaAte }) {
  const total = 7;
  const usados = Math.min(Math.max(diasUsados ?? 0, 0), total);
  const pct = Math.round((usados / total) * 100);

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-secondary/60 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Teste grátis · {usados} de {total} dias de uso
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {diasRestantesJanela != null && diasRestantesJanela >= 0
                ? `Janela válida por mais ${diasRestantesJanela} ${diasRestantesJanela === 1 ? "dia" : "dias"}${janelaAte ? ` (até ${janelaAte})` : ""}. `
                : ""}
              Tudo o que você criar fica salvo ao assinar.
            </p>
          </div>
        </div>
        <Link
          to="/planos"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 hover:bg-primary/90 transition-colors"
        >
          Ver planos <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-primary/10 overflow-hidden" role="progressbar" aria-valuenow={usados} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}