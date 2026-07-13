import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmtKg(v) { return (v || 0).toFixed(2).replace(".", ",") + " kg"; }
function fmtPct(v) { return (v || 0).toFixed(1).replace(".", ",") + "%"; }

// nome/pct read-only por padrão (usado pelo Cardápio simples).
// Passe onChangeNome / editablePct+onChangePct / onRemoveSection para habilitar edição (usado na Etapa Cardápio do Evento).
export default function CardapioSecaoLinha({
  nome, kg, pct, onAddItem,
  onChangeNome, editablePct, onChangePct, onRemoveSection,
}) {
  const [editingPct, setEditingPct] = useState(false);
  const [pctVal, setPctVal] = useState(pct);

  const startEditPct = () => { setPctVal(pct); setEditingPct(true); };
  const commitPct = () => {
    setEditingPct(false);
    const num = parseFloat(String(pctVal).replace(",", ".")) || 0;
    if (onChangePct) onChangePct(num);
  };

  return (
    <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 border-y border-border/60">
      {onChangeNome ? (
        <Input
          value={nome}
          onChange={e => onChangeNome(e.target.value)}
          className="h-6 flex-1 text-xs font-bold uppercase tracking-wide bg-transparent border-none focus-visible:ring-0 px-0"
        />
      ) : (
        <span className="flex-1 text-xs font-bold uppercase tracking-wide text-muted-foreground truncate">{nome}</span>
      )}
      <span className="text-xs font-semibold text-muted-foreground w-20 text-right">{fmtKg(kg)}</span>
      {editablePct ? (
        editingPct ? (
          <Input
            type="number"
            autoFocus
            value={pctVal}
            onChange={e => setPctVal(e.target.value)}
            onBlur={commitPct}
            onKeyDown={e => { if (e.key === "Enter") commitPct(); }}
            className="h-6 w-14 text-xs text-right px-1"
          />
        ) : (
          <button onClick={startEditPct}
            className="text-xs font-semibold text-muted-foreground w-14 text-right hover:text-primary underline decoration-dotted decoration-muted-foreground/50">
            {fmtPct(pct)}
          </button>
        )
      ) : (
        <span className="text-xs font-semibold text-muted-foreground w-14 text-right">{fmtPct(pct)}</span>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary no-print"
        onClick={onAddItem} title="Adicionar item nesta seção">
        <Plus className="w-3.5 h-3.5" />
      </Button>
      {onRemoveSection && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive"
          onClick={onRemoveSection} title="Remover seção">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}