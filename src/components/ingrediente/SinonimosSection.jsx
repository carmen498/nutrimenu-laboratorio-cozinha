import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Tag } from "lucide-react";
import { toast } from "sonner";

export default function SinonimosSection({ ingredienteId, localSinonimos, onLocalChange }) {
  const isLocal = !ingredienteId;
  const [novoSinonimo, setNovoSinonimo] = useState("");
  const qc = useQueryClient();

  const { data: sinonimosDb = [] } = useQuery({
    queryKey: ["sinonimos", ingredienteId],
    queryFn: () => base44.entities.SinonimosIngredientes.filter({ ingrediente_id: ingredienteId }, "created_date", 500),
    enabled: !!ingredienteId,
  });

  const sinonimos = isLocal ? (localSinonimos || []).map((s) => ({ id: s, sinonimo: s })) : sinonimosDb;

  const addMut = useMutation({
    mutationFn: async ({ sinonimo }) => {
      const sinTrim = sinonimo.trim();
      // Check uniqueness across ALL synonyms (case-insensitive)
      const todos = await base44.entities.SinonimosIngredientes.list("-created_date", 1000);
      const existe = todos.some(s => s.sinonimo?.toLowerCase().trim() === sinTrim.toLowerCase());
      if (existe) {
        throw new Error("Este sinônimo já existe para outro ingrediente");
      }
      return base44.entities.SinonimosIngredientes.create({
        ingrediente_id: ingredienteId,
        sinonimo: sinTrim,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sinonimos", ingredienteId] });
      setNovoSinonimo("");
      toast.success("Sinônimo adicionado!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao adicionar sinônimo");
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => base44.entities.SinonimosIngredientes.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sinonimos", ingredienteId] });
      toast.success("Sinônimo removido!");
    },
  });

  const handleAdd = async () => {
    const sin = novoSinonimo.trim();
    if (!sin) return;
    const existeLocal = sinonimos.some(s => s.sinonimo?.toLowerCase().trim() === sin.toLowerCase());
    if (existeLocal) {
      toast.error("Este sinônimo já existe neste ingrediente");
      return;
    }
    if (isLocal) {
      const todos = await base44.entities.SinonimosIngredientes.list("-created_date", 1000);
      const existe = todos.some(s => s.sinonimo?.toLowerCase().trim() === sin.toLowerCase());
      if (existe) {
        toast.error("Este sinônimo já existe para outro ingrediente");
        return;
      }
      onLocalChange([...(localSinonimos || []), sin]);
      setNovoSinonimo("");
      return;
    }
    addMut.mutate({ sinonimo: sin });
  };

  const handleRemove = (s) => {
    if (isLocal) {
      onLocalChange((localSinonimos || []).filter(x => x !== s.id));
    } else {
      delMut.mutate(s.id);
    }
  };

  if (!ingredienteId && !onLocalChange) return null;

  return (
    <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-1">
        <Tag className="w-3.5 h-3.5" /> Sinônimos
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {sinonimos.length === 0 && (
          <span className="text-xs text-muted-foreground">Nenhum sinônimo cadastrado.</span>
        )}
        {sinonimos.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs"
          >
            {s.sinonimo}
            <button
              onClick={() => handleRemove(s)}
              className="hover:text-destructive"
              disabled={!isLocal && delMut.isPending}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={novoSinonimo}
          onChange={(e) => setNovoSinonimo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="Novo sinônimo..."
          className="h-8 text-xs"
        />
        <Button size="sm" className="h-8 px-2" onClick={handleAdd} disabled={addMut.isPending || !novoSinonimo.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}