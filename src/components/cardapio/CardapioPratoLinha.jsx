import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

function fmtKg(v) { return (v || 0).toFixed(2).replace(".", ",") + " kg"; }
function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
function fmtPct(v) { return (v || 0).toFixed(1).replace(".", ",") + "%"; }

export default function CardapioPratoLinha({
  rec, descritivo, pcSuffix, kg, pct, selected, onSelect,
  onUpdatePC, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  temDias, diasOptions, refeicoesOptions, onUpdateField, semCusto,
}) {
  return (
    <div
      className={`transition-colors cursor-pointer ${selected ? "bg-accent" : "hover:bg-secondary/30"}`}
      onClick={() => onSelect(rec.id)}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <Link
            to={`/receita/${rec.receita_id}`}
            onClick={e => e.stopPropagation()}
            className="text-sm font-medium text-primary hover:underline truncate block"
          >
            {rec.receita_nome?.toUpperCase?.() || rec.receita_nome}
          </Link>
          {descritivo && <p className="text-xs text-muted-foreground italic truncate">{descritivo}</p>}
        </div>
        <div className="shrink-0 w-20 text-center" onClick={e => e.stopPropagation()}>
          <Input
            className="h-7 text-xs text-center"
            value={rec.per_capita_g || ""}
            onChange={e => onUpdatePC(Number(e.target.value) || 0)}
            placeholder={pcSuffix}
          />
        </div>
        <span className="text-sm text-muted-foreground w-20 text-right shrink-0">{fmtKg(kg)}</span>
        <span className={`text-sm font-semibold w-20 text-right shrink-0 ${semCusto ? "text-amber-600" : ""}`}>
          {semCusto ? "—" : fmtRs(rec.custo_total)}
        </span>
        <span className="text-xs text-muted-foreground w-14 text-right shrink-0">{fmtPct(pct)}</span>
      </div>

      {selected && (
        <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-secondary/60 border-t border-border/60 no-print"
          onClick={e => e.stopPropagation()}>
          {temDias && (
            <>
              <Select value={rec.dia_semana || ""} onValueChange={v => onUpdateField("dia_semana", v)}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="Dia" /></SelectTrigger>
                <SelectContent>
                  {diasOptions.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={rec.refeicao || ""} onValueChange={v => onUpdateField("refeicao", v)}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Refeição" /></SelectTrigger>
                <SelectContent>
                  {refeicoesOptions.map(rf => <SelectItem key={rf.key} value={rf.key}>{rf.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveUp} onClick={onMoveUp}>
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveDown} onClick={onMoveDown}>
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}