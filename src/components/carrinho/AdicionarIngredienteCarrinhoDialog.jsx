import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";

const CATS = [
  "Carnes e Ovos", "Verduras e Hortaliças", "Temperos", "Laticínios",
  "Panificação e Cereais", "Açúcares e Doces", "Peixes e Frutos do Mar",
  "Frutas", "Óleos e Gorduras", "Diversos", "A Revisar",
];

export default function AdicionarIngredienteCarrinhoDialog({ open, onClose, onAdd }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
    enabled: open,
  });

  const filtrados = useMemo(() => {
    let result = ingredientes;
    if (categoria !== "Todas") {
      result = result.filter((i) => i.categoria === categoria);
    }
    if (busca.trim()) {
      const terms = busca.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((i) => {
        const nome = (i.nome || "").toLowerCase();
        return terms.every((t) => nome.includes(t));
      });
    }
    return result.slice(0, 100);
  }, [ingredientes, busca, categoria]);

  const handleClose = () => { setBusca(""); setCategoria("Todas"); onClose(); };
  const handleAdd = (ing) => onAdd(ing);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar ingrediente</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." className="pl-10" value={busca}
              onChange={(e) => setBusca(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setCategoria("Todas")}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${categoria === "Todas" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
              Todas
            </button>
            {CATS.map((c) => (
              <button key={c} type="button" onClick={() => setCategoria(c)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${categoria === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filtrados.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum ingrediente encontrado.</p>
            ) : (
              filtrados.map((ing) => (
                <button key={ing.id} type="button"
                  className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 hover:bg-accent transition-colors"
                  onClick={() => handleAdd(ing)}>
                  <span className="font-medium">{ing.nome}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/10 text-primary shrink-0">
                    <Plus className="w-4 h-4" />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}