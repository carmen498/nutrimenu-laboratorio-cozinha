import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, X } from "lucide-react";

const GRUPO_LABELS = {
  molho: "Molhos",
  ingrediente: "Ingrediente principal",
  perfil: "Perfil",
  restricao: "Restrições alimentares",
  metodo: "Método de cocção",
  contexto: "Contexto de uso",
  outras: "Outras",
};

const GRUPO_ORDER = ["molho", "ingrediente", "perfil", "metodo", "restricao", "contexto", "outras"];

export default function TagSelector({ selectedIds, onToggle, triggerLabel = "Adicionar tag" }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [novaTag, setNovaTag] = useState("");
  const [criando, setCriando] = useState(false);
  const queryClient = useQueryClient();

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 200),
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    const filtered = allTags.filter(t =>
      !busca.trim() || t.nome.toLowerCase().includes(busca.toLowerCase())
    );
    const map = {};
    for (const t of filtered) {
      const g = t.grupo || "outro";
      if (!map[g]) map[g] = [];
      map[g].push(t);
    }
    return map;
  }, [allTags, busca]);

  const selectedTags = useMemo(() => {
    return allTags.filter(t => selectedIds.includes(t.id));
  }, [allTags, selectedIds]);

  const criarTag = async () => {
    const nome = novaTag.trim();
    if (!nome || criando) return;
    setCriando(true);
    try {
      const criada = await base44.entities.Tag.create({ nome, grupo: "outras" });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      onToggle(criada);
      setNovaTag("");
    } catch (e) {
      // ignora duplicatas
    } finally {
      setCriando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      criarTag();
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) setBusca(""); }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="w-3.5 h-3.5" /> {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
            <Input
              placeholder="Buscar tag..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="border-0 focus-visible:ring-0 h-9"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {GRUPO_ORDER.map(grupo => {
              const tags = grouped[grupo];
              if (!tags || tags.length === 0) return null;
              return (
                <div key={grupo} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">
                    {GRUPO_LABELS[grupo] || grupo}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => {
                      const selected = selectedIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-accent border-border"
                          }`}
                          onClick={() => onToggle(tag)}
                        >
                          {tag.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.keys(grouped).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tag encontrada</p>
            )}
            <div className="border-t pt-2 mt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">
                Outras (digite livremente)
              </p>
              <div className="flex gap-1">
                <Input
                  placeholder="Nova tag..."
                  value={novaTag}
                  onChange={e => setNovaTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 text-xs"
                  disabled={criando}
                />
                <Button size="sm" className="h-8 text-xs shrink-0" onClick={criarTag} disabled={!novaTag.trim() || criando}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}