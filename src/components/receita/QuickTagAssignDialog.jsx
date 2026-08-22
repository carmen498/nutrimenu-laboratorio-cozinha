import { criarReceitaTag } from '@/lib/secureChildEntities';
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check } from "lucide-react";
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";

const GRUPOS = [
  { key: "restricao", label: "Restrição" },
  { key: "metodo", label: "Método" },
  { key: "perfil", label: "Perfil" },
  { key: "contexto", label: "Contexto" },
  { key: "ingrediente", label: "Ingrediente" },
  { key: "molho", label: "Molho" },
];

export default function QuickTagAssignDialog({ open, onClose, receita }) {
  const qc = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novoGrupo, setNovoGrupo] = useState("metodo");

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 500),
    staleTime: 0,
  });

  const { data: receitaTags = [] } = useQuery({
    queryKey: ["receita-tags-single", receita?.id],
    queryFn: () => base44.entities.ReceitaTag.filter({ receita_id: receita?.id }, "", 200),
    enabled: !!receita?.id,
    staleTime: 0,
  });

  const toggleMut = useMutation({
    mutationFn: async ({ tag, assigned }) => {
      if (assigned) {
        const existing = receitaTags.find(rt => rt.tag_id === tag.id);
        if (existing) await base44.entities.ReceitaTag.delete(existing.id);
      } else {
        await criarReceitaTag({
          receita_id: receita.id,
          tag_id: tag.id,
          tag_nome: tag.nome,
          tag_grupo: tag.grupo,
          tag_cor: tag.cor,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receita-tags-single", receita?.id] });
      qc.invalidateQueries({ queryKey: ["all-receita-tags"] });
    },
  });

  const createMut = useMutation({
    mutationFn: async (data) => base44.entities.Tag.create(data),
    onSuccess: (newTag) => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      // Auto-assign to this recipe
      criarReceitaTag({
        receita_id: receita.id,
        tag_id: newTag.id,
        tag_nome: newTag.nome,
        tag_grupo: newTag.grupo,
        tag_cor: newTag.cor,
      }).then(() => {
        qc.invalidateQueries({ queryKey: ["receita-tags-single", receita?.id] });
        qc.invalidateQueries({ queryKey: ["all-receita-tags"] });
      });
      setNovoNome("");
      toast.success("Tag criada e atribuída!");
    },
  });

  const handleCreate = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    if (tags.some(t => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Já existe uma tag com esse nome");
      return;
    }
    createMut.mutate({ nome, grupo: novoGrupo, cor: "verde" });
  };

  if (!receita) return null;

  const assignedTagIds = receitaTags.map(rt => rt.tag_id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="font-display text-base">Tags — {receita.nome}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {/* Assigned tags */}
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {receitaTags.length === 0 && (
              <span className="text-xs text-muted-foreground">Nenhuma tag atribuída.</span>
            )}
            {receitaTags.map(rt => {
              const tag = tags.find(t => t.id === rt.tag_id);
              if (!tag) return null;
              return (
                <TagBadge
                  key={rt.id}
                  nome={tag.nome}
                  cor={tag.cor}
                  grupo={tag.grupo}
                  onClick={() => toggleMut.mutate({ tag, assigned: true })}
                />
              );
            })}
          </div>

          {/* Available tags */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Atribuir tags</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.filter(t => !assignedTagIds.includes(t.id)).map(tag => (
                <TagBadge
                  key={tag.id}
                  nome={tag.nome}
                  cor={tag.cor}
                  grupo={tag.grupo}
                  onClick={() => toggleMut.mutate({ tag, assigned: false })}
                />
              ))}
              {tags.filter(t => !assignedTagIds.includes(t.id)).length === 0 && (
                <span className="text-xs text-muted-foreground">Todas as tags já atribuídas.</span>
              )}
            </div>
          </div>

          {/* Quick create */}
          <div className="p-2 rounded-lg border border-dashed space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criar nova tag</p>
            <Input placeholder="Nome..." value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              className="h-8 text-sm" />
            <div className="flex gap-2">
              <Select value={novoGrupo} onValueChange={setNovoGrupo}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRUPOS.map(g => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 px-3" onClick={handleCreate} disabled={!novoNome.trim() || createMut.isPending}>
                <Plus className="w-3.5 h-3.5" /> Criar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Concluir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}