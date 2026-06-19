import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";

export const CATEGORIAS = [
  "Carne Bovina", "Aves", "Peixes e Frutos do Mar", "Ovos",
  "Massas, Pastelão e Quiches", "Arroz e Risoto", "Sopas e Caldos", "Leguminosas",
  "Salgadinhos", "Pães e Bolos", "Sobremesas", "Molhos",
  "Acompanhamento", "Prato Principal", "Prato Único",
  "Entradas", "Petiscos", "Lanche", "Receitas Base"
];

export const ICONE_CATEGORIA = {
  "Carne Bovina": "🥩", "Aves": "🍗", "Peixes e Frutos do Mar": "🐟", "Ovos": "🥚",
  "Massas, Pastelão e Quiches": "🍝", "Arroz e Risoto": "🍚", "Sopas e Caldos": "🥣", "Leguminosas": "🫘",
  "Salgadinhos": "🥟", "Pães e Bolos": "🍞", "Sobremesas": "🍰", "Molhos": "🫙",
  "Acompanhamento": "🥗", "Prato Principal": "🍽️", "Prato Único": "🍲",
  "Entradas": "🥄", "Petiscos": "🍢", "Lanche": "🥪", "Receitas Base": "📖"
};

export default function CategoriaPicker({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const selected = Array.isArray(value) ? value : [];

  const toggle = (cat) => {
    if (selected.includes(cat)) {
      onChange(selected.filter(c => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  const filtered = busca
    ? CATEGORIAS.filter(c => c.toLowerCase().includes(busca.toLowerCase()))
    : CATEGORIAS;

  const selectedLabel = selected.length === 0
    ? <span className="text-muted-foreground">Selecionar categorias</span>
    : <span className="truncate">{selected.join(", ")}</span>;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBusca(""); }}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-9 py-1.5">
            <span className="truncate text-left flex-1 text-sm">{selectedLabel}</span>
            {selected.length > 0 && (
              <Badge className="ml-2 shrink-0 text-[10px] h-5 px-1.5">{selected.length}</Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-1 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
            <Input
              placeholder="Buscar categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="border-0 focus-visible:ring-0 h-9"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {filtered.length > 0 ? filtered.map(cat => {
              const active = selected.includes(cat);
              return (
                <button
                  key={cat}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                  }`}
                  onClick={() => toggle(cat)}
                >
                  <span className="text-base">{ICONE_CATEGORIA[cat] || "📋"}</span>
                  <span className="flex-1">{cat}</span>
                  {active && <span className="text-primary font-bold text-xs">✓</span>}
                </button>
              );
            }) : (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">Nenhuma categoria encontrada</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(cat => (
            <Badge key={cat} variant="secondary" className="text-xs gap-1 cursor-pointer hover:opacity-80" onClick={() => toggle(cat)}>
              {ICONE_CATEGORIA[cat]} {cat} <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}