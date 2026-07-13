import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtKg(v) { return (v || 0).toFixed(2).replace(".", ",") + " kg"; }
function fmtPct(v) { return (v || 0).toFixed(1).replace(".", ",") + "%"; }

export default function CardapioSecaoLinha({ nome, kg, pct, onAddItem }) {
  return (
    <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 border-y border-border/60">
      <span className="flex-1 text-xs font-bold uppercase tracking-wide text-muted-foreground truncate">{nome}</span>
      <span className="text-xs font-semibold text-muted-foreground w-20 text-right">{fmtKg(kg)}</span>
      <span className="text-xs font-semibold text-muted-foreground w-14 text-right">{fmtPct(pct)}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary no-print"
        onClick={onAddItem} title="Adicionar item nesta seção">
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}