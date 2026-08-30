import { AlertTriangle, CircleCheck } from "lucide-react";

export default function SaudeMetricCard({ titulo, valor, detalhe, status }) {
  const alerta = status === "alerta";
  const Icon = alerta ? AlertTriangle : CircleCheck;
  return (
    <div className={`rounded-xl border p-4 ${alerta ? "border-destructive/30 bg-destructive/10" : "border-border bg-secondary/50"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{titulo}</p>
        <Icon className={`h-4 w-4 ${alerta ? "text-destructive" : "text-primary"}`} />
      </div>
      <p className="font-display text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}