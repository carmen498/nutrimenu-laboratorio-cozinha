import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const GRUPOS = [
  { key: "restricao", label: "Restrição" },
  { key: "metodo", label: "Método" },
  { key: "perfil", label: "Perfil" },
  { key: "contexto", label: "Contexto" },
  { key: "ingrediente", label: "Ingrediente" },
  { key: "molho", label: "Molho" },
];

const CORES = ["verde", "vermelho", "cinza", "verde-claro"];

const TAGS_INICIAIS = [
  { nome: "Molho base", grupo: "molho", cor: "verde-claro" },
  { nome: "Assado", grupo: "metodo", cor: "vermelho" },
  { nome: "Grelhado", grupo: "metodo", cor: "vermelho" },
  { nome: "Cozido", grupo: "metodo", cor: "vermelho" },
  { nome: "Frito", grupo: "metodo", cor: "vermelho" },
  { nome: "Forno", grupo: "metodo", cor: "vermelho" },
  { nome: "Sem glúten", grupo: "restricao", cor: "vermelho" },
  { nome: "Sem lactose", grupo: "restricao", cor: "vermelho" },
  { nome: "Vegetariano", grupo: "perfil", cor: "verde" },
  { nome: "Festa", grupo: "contexto", cor: "verde-claro" },
];

export default function GerenciarTagsDialog({ open, onClose }) {
  const qc = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novoGrupo, setNovoGrupo] = useState("metodo");
  const [novoCor, setNovoCor] = useState("verde");
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [excluirId, setExcluirId] = useState(null);

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 500),
    staleTime: 0,
  });

  // Auto-seed initial tags if none exist
  const seedMut = useMutation({
    mutationFn: async () => {
      for (const t of TAGS_INICIAIS) {
        await base44.entities.Tag.create(t);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Conjunto inicial de tags criado!");
    },
  });

  useEffect(() => {
    if (open && tags.length === 0 && !seedMut.isPending) {
      seedMut.mutate();
    }
  }, [open, tags.length]);

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Tag.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      setNovoNome("");
      toast.success("Tag criada!");
    },
  });

  const renameMut = useMutation({
    mutationFn: async ({ id, nome }) => {
      await base44.entities.Tag.update(id, { nome });
      // Update cached nome in ReceitaTag
      const rts = await base44.entities.ReceitaTag.filter({ tag_id: id }, "", 5000);
      for (const rt of rts) {
        await base44.entities.ReceitaTag.update(rt.id, { tag_nome: nome });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["all-receita-tags"] });
      toast.success("Tag renomeada!");
    },
    onError: (error) => {
      toast.error("Erro ao renomear tag: " + (error.message || ""));
    },
    onSettled: () => {
      setEditandoId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (tag) => {
      // Remove all ReceitaTag associations (never delete recipes)
      const rts = await base44.entities.ReceitaTag.filter({ tag_id: tag.id }, "", 5000);
      for (const rt of rts) {
        await base44.entities.ReceitaTag.delete(rt.id);
      }
      // Also remove CardapioTag associations
      const cts = await base44.entities.CardapioTag.filter({ tag_id: tag.id }, "", 5000);
      for (const ct of cts) {
        await base44.entities.CardapioTag.delete(ct.id);
      }
      // Delete the tag itself
      await base44.entities.Tag.delete(tag.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["all-receita-tags"] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      setExcluirId(null);
      toast.success("Tag excluída! Receitas permanecem intactas.");
    },
  });

  const handleCreate = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    if (tags.some(t => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Já existe uma tag com esse nome");
      return;
    }
    createMut.mutate({ nome, grupo: novoGrupo, cor: novoCor });
  };

  const handleRename = (tag) => {
    const nome = editNome.trim();
    if (!nome) return;
    if (tags.some(t => t.id !== tag.id && t.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Já existe uma tag com esse nome");
      return;
    }
    renameMut.mutate({ id: tag.id, nome });
  };

  const tagParaExcluir = tags.find(t => t.id === excluirId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="font-display">Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {/* Create new tag */}
          <div className="p-3 rounded-lg border border-dashed space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nova tag</Label>
            <Input placeholder="Nome da tag..." value={novoNome}
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
              <Select value={novoCor} onValueChange={setNovoCor}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CORES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 px-3" onClick={handleCreate} disabled={!novoNome.trim() || createMut.isPending}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Tags by group */}
          {GRUPOS.map(g => {
            const groupTags = tags.filter(t => t.grupo === g.key);
            if (groupTags.length === 0) return null;
            return (
              <div key={g.key}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{g.label}</p>
                <div className="space-y-1">
                  {groupTags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                      {editandoId === tag.id ? (
                        <>
                          <Input value={editNome} onChange={e => setEditNome(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleRename(tag); if (e.key === "Escape") setEditandoId(null); }}
                            className="h-7 text-sm flex-1" autoFocus />
                          <Button size="icon" className="h-7 w-7" onClick={() => handleRename(tag)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditandoId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm flex-1 truncate">{tag.nome}</span>
                          <span className="text-[10px] text-muted-foreground">{tag.cor}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setEditandoId(tag.id); setEditNome(tag.nome); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => setExcluirId(tag.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {tags.length === 0 && seedMut.isPending && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 animate-pulse" /> Criando conjunto inicial de tags...
            </div>
          )}

          {tags.length > 0 && (
            <p className="text-xs text-muted-foreground pb-2">
              {tags.length} tag{tags.length !== 1 ? "s" : ""} no total. Excluir uma tag remove apenas o vínculo das receitas — nenhuma receita é excluída.
            </p>
          )}
        </div>

        {/* Delete confirmation */}
        {tagParaExcluir && (
          <div className="px-6 py-3 border-t bg-destructive/5 shrink-0">
            <p className="text-sm font-medium mb-2">Excluir tag "{tagParaExcluir.nome}"?</p>
            <p className="text-xs text-muted-foreground mb-3">A tag será removida de todas as receitas e cardápios vinculados. As receitas não serão excluídas.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setExcluirId(null)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(tagParaExcluir)} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? "Excluindo..." : "Excluir tag"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end px-6 py-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}