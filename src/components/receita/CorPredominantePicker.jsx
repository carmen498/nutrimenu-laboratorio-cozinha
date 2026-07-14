import { FAMILIAS_CORES_LIST, TONS_LIST, parseCorKey, buildCorKey } from "@/lib/coresReceita";
import { X } from "lucide-react";

export default function CorPredominantePicker({ value, onChange }) {
  const parsed = parseCorKey(value);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FAMILIAS_CORES_LIST.map((familia) => (
          <div key={familia.key} className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground truncate">{familia.label}</p>
            <div className="flex gap-1">
              {TONS_LIST.map((tom) => {
                const key = buildCorKey(familia.key, tom.key);
                const selected = parsed?.familia === familia.key && parsed?.tom === tom.key;
                return (
                  <button
                    key={tom.key}
                    type="button"
                    onClick={() => onChange(selected ? "" : key)}
                    className={`w-7 h-7 rounded-full border shrink-0 transition-all ${
                      selected ? "ring-2 ring-primary ring-offset-1 border-primary" : "border-black/10 hover:scale-110"
                    }`}
                    style={{ backgroundColor: familia.tons[tom.key] }}
                    title={`${familia.label} ${tom.label}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive hover:underline mt-2.5"
        >
          <X className="w-3 h-3" /> Remover cor
        </button>
      )}
    </div>
  );
}