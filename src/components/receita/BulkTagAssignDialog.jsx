import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ORDEM_GRUPOS = [
  { key: "restricao", label: "RESTRIÇÃO", cor: "#C62828", bg: "#FFEBEE" },
  { key: "metodo", label: "MÉTODO", cor: "#1565C0", bg: "#E3F2FD" },
  { key: "perfil", label: "PERFIL", cor: "#2E7D32", bg: "#E8F5E9" },
  { key: "contexto", label: "CONTEXTO", cor: "#6A1B9A", bg: "#F3E5F5" },
  { key: "ingrediente", label: "INGREDIENTE", cor: "#E65100", bg: "#FFF3E0" },
  { key: "molho", label: "MOLHO", cor: "#880E4F", bg: "#FCE4EC" },
];

export default function BulkTagAssignDialog({ open, onClose, receitaIds, tags, allReceitaTags, onApplied }) {
  const [applyingTagId, setApplyingTagId] = useState(null);

  const handleApply = async (tag) => {
    setApplyingTagId(tag.id);
    try {
      const jaTem = new Set(
        allReceitaTags.filter(rt => rt.tag_id === tag.id).map(rt => rt.receita_id)
      );
      const toCreate = receitaIds.filter(rid => !jaTem.has(rid));
      if (toCreate.length > 0) {
        await base44.entities.ReceitaTag.bulkCreate(
          toCreate.map(rid => ({
            receita_id: rid,
            tag_id: tag.id,
            tag_nome: tag.nome,
            tag_grupo: tag.grupo,
            tag_cor: tag.cor,
          }))
        );
      }
      toast.success(`Tag "${tag.nome}" aplicada a ${receitaIds.length} receita(s)!`);
      onApplied();
    } catch (err) {
      toast.error("Erro ao aplicar tag: " + (err.message || ""));
    } finally {
      setApplyingTagId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Aplicar tag a {receitaIds.length} receita(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {ORDEM_GRUPOS.map(g => {
            const groupTags = tags.filter(t => t.grupo === g.key);
            if (groupTags.length === 0) return null;
            return (
              <div key={g.key}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: g.cor }}>{g.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupTags.map(tag => (
                    <button
                      key={tag.id}
                      disabled={!!applyingTagId}
                      className="text-xs px-2.5 py-1 rounded-full border transition-all disabled:opacity-50"
                      style={{ backgroundColor: g.bg, color: g.cor, borderColor: "transparent", fontWeight: 500 }}
                      onClick={() => handleApply(tag)}
                    >
                      {applyingTagId === tag.id ? "Aplicando..." : tag.nome}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag cadastrada.</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}