import { CORES_RECEITA_LIST } from "@/lib/coresReceita";
import { X } from "lucide-react";

export default function CorPredominantePicker({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {CORES_RECEITA_LIST.map((cor) => {
          const selected = value === cor.key;
          return (
            <button
              key={cor.key}
              type="button"
              onClick={() => onChange(selected ? "" : cor.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                selected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
              title={cor.label}
            >
              <span
                className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: cor.hex }}
              />
              <span className="text-xs font-medium">{cor.label}</span>
            </button>
          );
        })}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive hover:underline mt-1.5"
        >
          <X className="w-3 h-3" /> Remover cor
        </button>
      )}
    </div>
  );
}