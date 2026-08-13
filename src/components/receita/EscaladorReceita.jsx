import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, RotateCcw } from "lucide-react";

function useSyncedText(value, formatFn) {
  const [text, setText] = useState(formatFn(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(formatFn(value));
  }, [value]);
  return [text, setText, focused];
}

function StepCard({ label, value, unit, suffix, step, onStep, onCommit, formatDisplay, parseInput, highlight }) {
  const [text, setText, focused] = useSyncedText(value, formatDisplay);

  const commit = () => {
    const v = parseInput(text);
    if (v != null) onCommit(v);
    else setText(formatDisplay(value));
  };

  return (
    <div className={`flex-1 rounded-lg border p-3 ${highlight ? "bg-accent/60 border-primary/30" : "bg-background border-border"}`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-2">{label}</p>
      <div className="flex items-center gap-1.5 justify-center">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => onStep(-step)}>
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <div className="flex items-baseline gap-1">
          <Input
            type="text"
            inputMode="decimal"
            value={text}
            onFocus={() => { focused.current = true; }}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { focused.current = false; commit(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commit(); e.target.blur(); }
              if (e.key === "Escape") { setText(formatDisplay(value)); e.target.blur(); }
            }}
            className="text-center text-lg font-bold h-10 w-20"
          />
          {unit && <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{unit}</span>}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => onStep(step)}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {suffix && <p className="text-xs text-muted-foreground text-center mt-1">{suffix}</p>}
    </div>
  );
}

const parseDecimal = (t) => {
  const n = parseFloat(String(t).replace(",", "."));
  return isNaN(n) ? null : n;
};

export default function EscaladorReceita({ pc, porcoes, quantidadeTotalG, onChangePC, onChangePorcoes, onChangeTotalG, isEscalado, onRestore }) {
  const totalKg = (quantidadeTotalG || 0) / 1000;

  return (
    <div className="rounded-xl border bg-card p-4">
      {isEscalado && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onRestore}
            className="text-xs text-muted-foreground hover:text-primary underline flex items-center gap-1"
            title="Descartar a escala e voltar aos valores cadastrados da receita"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar original
          </button>
        </div>
      )}
      <div className="flex items-stretch gap-2">
        <StepCard
          label="PC recomendado"
          value={pc || 0}
          unit="g/porção"
          step={10}
          onStep={(delta) => onChangePC(Math.max(1, (pc || 0) + delta))}
          onCommit={(v) => onChangePC(Math.max(1, Math.round(v)))}
          formatDisplay={(v) => (v > 0 ? String(Math.round(v)) : "")}
          parseInput={parseDecimal}
        />
        <div className="flex items-center justify-center px-1 text-xl font-bold text-muted-foreground">×</div>
        <div className="flex-1 rounded-lg border p-3 bg-background border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-2">Nº porções</p>
          <div className="flex items-center justify-center h-10">
            <span className="text-lg font-bold">
              {porcoes > 0 ? (Number.isInteger(porcoes) ? String(porcoes) : porcoes.toFixed(2).replace(".", ",")) : "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">Calculado: Total ÷ PC</p>
        </div>
        <div className="flex items-center justify-center px-1 text-xl font-bold text-muted-foreground">=</div>
        <StepCard
          label="Quantidade Total (kg)"
          value={totalKg}
          unit="kg"
          suffix={quantidadeTotalG ? `${Math.round(quantidadeTotalG).toLocaleString("pt-BR")} g` : null}
          step={0.5}
          highlight
          onStep={(delta) => onChangeTotalG(Math.max(0, (quantidadeTotalG || 0) + delta * 1000))}
          onCommit={(v) => onChangeTotalG(Math.max(0, Math.round(v * 1000)))}
          formatDisplay={(v) => (v > 0 ? (v < 1 ? v.toFixed(2).replace(".", ",") : v.toFixed(1).replace(".", ",")) : "")}
          parseInput={parseDecimal}
        />
      </div>
    </div>
  );
}