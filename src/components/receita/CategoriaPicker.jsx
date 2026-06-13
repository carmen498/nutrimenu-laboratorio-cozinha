import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, ChevronDown } from "lucide-react";

const CATEGORIAS = [
  "Acompanhamentos, Arroz e Risotos",
  "Acompanhamentos, Complementos",
  "Acompanhamentos, Grãos e Leguminosas",
  "Carnes, Aves",
  "Carnes, Bacalhau",
  "Carnes, Bovina",
  "Carnes, Frutos do mar",
  "Carnes, Peixes",
  "Carnes, Suína",
  "Confeitaria, Doces e Docinhos",
  "Confeitaria, Sobremesas",
  "Confeitaria, Tortas",
  "Entradas, Frias",
  "Molhos",
  "Saladas",
  "Tortas e Quiches",
  "A Revisar",
];

export { CATEGORIAS };

export default function CategoriaPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const filtered = CATEGORIAS.filter(
    (c) => !busca || c.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBusca(""); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">&lt;selecionar&gt;</span>}
          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
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
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((c) => (
            <button
              key={c}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onChange(c); setOpen(false); setBusca(""); }}
            >
              {c}
            </button>
          )) : (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">Nenhuma categoria encontrada</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}