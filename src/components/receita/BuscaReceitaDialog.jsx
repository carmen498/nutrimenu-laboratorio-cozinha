import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { CATEGORIAS as CATS } from "@/components/receita/CategoriaPicker";
import { normalizarNome } from "@/lib/normalizarNome";

export default function BuscaReceitaDialog({
  open, onClose, onSelect, excludeIds = [], title = "Adicionar receita", receitas: propReceitas = null,
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");

  const { data: queryReceitas = [] } = useQuery({
    queryKey: ["receitas-busca"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
    enabled: !propReceitas && open,
  });
  const receitas = propReceitas || queryReceitas;

  const filtradas = useMemo(() => {
    let result = receitas;
    if (categoria !== "Todas") {
      result = result.filter(r => (r.categorias || []).includes(categoria));
    }
    if (busca.trim()) {
      const terms = normalizarNome(busca).split(/\s+/).filter(Boolean);
      result = result.filter(r => {
        const nome = normalizarNome(r.nome);
        return terms.every(t => nome.includes(t));
      });
    }
    return result.slice(0, 100);
  }, [receitas, busca, categoria]);

  const handleClose = () => { setBusca(""); setCategoria("Todas"); onClose(); };
  const handleSelect = (r) => { setBusca(""); setCategoria("Todas"); onSelect(r); };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." className="pl-10" value={busca}
              onChange={e => setBusca(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setCategoria("Todas")}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${categoria === "Todas" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
              Todas
            </button>
            {CATS.map(c => (
              <button key={c} type="button" onClick={() => setCategoria(c)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${categoria === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground px-1">
            {filtradas.length} {filtradas.length === 1 ? "receita encontrada" : "receitas encontradas"}
          </p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filtradas.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhuma receita encontrada.</p>
            ) : (
              filtradas.map(r => {
                const excluded = excludeIds.includes(r.id);
                return (
                  <button key={r.id} type="button" disabled={excluded}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${excluded ? "bg-primary/5 text-muted-foreground cursor-not-allowed" : "hover:bg-accent"}`}
                    onClick={() => !excluded && handleSelect(r)}>
                    <span className="font-medium">{r.nome}</span>
                    {excluded
                      ? <Badge variant="secondary" className="text-xs">Adicionada</Badge>
                      : r.categorias?.[0] && <Badge variant="outline" className="text-xs">{r.categorias[0]}</Badge>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}