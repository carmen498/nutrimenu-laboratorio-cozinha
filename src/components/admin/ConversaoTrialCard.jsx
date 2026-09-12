import { TrendingUp } from "lucide-react";

const META_PCT = 10;

export default function ConversaoTrialCard({ trials, convertidos, emTrial, vencidosSemPagar, taxa }) {
  const abaixoMeta = trials > 0 && taxa < META_PCT;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Conversão trial → pagante</p>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className={`font-display text-3xl font-bold ${abaixoMeta ? "text-amber-700" : "text-primary"}`}>
            {taxa.toFixed(1).replace(".", ",")}%
          </p>
          <p className="text-xs text-muted-foreground">
            {convertidos} de {trials} trials iniciados · meta {META_PCT}%
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 text-xs sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Em trial</dt><dd className="font-semibold">{emTrial}</dd></div>
          <div><dt className="text-muted-foreground">Pagantes</dt><dd className="font-semibold">{convertidos}</dd></div>
          <div><dt className="text-muted-foreground">Vencidos sem pagar</dt><dd className="font-semibold">{vencidosSemPagar}</dd></div>
        </dl>
      </div>
    </div>
  );
}