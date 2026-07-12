import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const TIPOS = [
  { value: "bebida", label: "Bebida" },
  { value: "coquetel", label: "Coquetel" },
  { value: "doce", label: "Doce" },
];

const UNIDADES = ["ml", "un", "g"];

export default function GerenciarReferenciaDialog({ open, onClose, onChanged }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(null); // null | "novo" | id
  const [form, setForm] = useState({ tipo: "bebida", item: "", percentual_padrao: "", media_padrao: "", unidade: "ml", sem_padrao: false });

  const { data: referencias = [] } = useQuery({
    queryKey: ["referencia-evento"],
    queryFn: () => base44.entities.ReferenciaEvento.list("tipo", 100),
    enabled: open,
  });

  const grouped = useMemo(() => {
    const groups = {};
    referencias.forEach(r => {
      if (!groups[r.tipo]) groups[r.tipo] = [];
      groups[r.tipo].push(r);
    });
    return groups;
  }, [referencias]);

  const resetForm = () => {
    setForm({ tipo: "bebida", item: "", percentual_padrao: "", media_padrao: "", unidade: "ml", sem_padrao: false });
    setEditando(null);
  };

  const handleNovo = () => {
    resetForm();
    setEditando("novo");
  };

  const handleEditar = (ref) => {
    setForm({
      tipo: ref.tipo,
      item: ref.item,
      percentual_padrao: ref.percentual_padrao ?? "",
      media_padrao: ref.media_padrao ?? "",
      unidade: ref.unidade,
      sem_padrao: ref.sem_padrao || false,
    });
    setEditando(ref.id);
  };

  const handleSalvar = async () => {
    if (!form.item.trim()) {
      toast.error("Informe o nome do item");
      return;
    }
    try {
      const dados = {
        tipo: form.tipo,
        item: form.item.trim(),
        unidade: form.unidade,
        percentual_padrao: form.sem_padrao ? null : (form.percentual_padrao === "" ? null : parseFloat(form.percentual_padrao)),
        media_padrao: form.sem_padrao ? null : (form.media_padrao === "" ? null : parseFloat(form.media_padrao)),
        sem_padrao: form.sem_padrao,
      };
      if (editando === "novo") {
        await base44.entities.ReferenciaEvento.create(dados);
        toast.success("Item criado!");
      } else {
        await base44.entities.ReferenciaEvento.update(editando, dados);
        toast.success("Item atualizado!");
      }
      queryClient.invalidateQueries({ queryKey: ["referencia-evento"] });
      resetForm();
      onChanged?.();
    } catch (e) {
      toast.error("Erro ao salvar item");
    }
  };

  const handleExcluir = async (id) => {
    try {
      await base44.entities.ReferenciaEvento.delete(id);
      toast.success("Item excluído!");
      queryClient.invalidateQueries({ queryKey: ["referencia-evento"] });
      onChanged?.();
    } catch (e) {
      toast.error("Erro ao excluir item");
    }
  };

  const tipoLabel = (t) => TIPOS.find(x => x.value === t)?.label || t;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Referências — Doces & Bebidas</DialogTitle>
        </DialogHeader>

        {/* Form */}
        {editando && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Item</Label>
              <Input value={form.item} onChange={e => setForm({ ...form, item: e.target.value })}
                className="h-8 text-sm" placeholder="Ex: Espumante" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Unidade</Label>
              <Select value={form.unidade} onValueChange={v => setForm({ ...form, unidade: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">% padrão</Label>
              <Input type="number" step="0.5" value={form.percentual_padrao}
                disabled={form.sem_padrao}
                onChange={e => setForm({ ...form, percentual_padrao: e.target.value })}
                className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Média padrão</Label>
              <Input type="number" step="1" value={form.media_padrao}
                disabled={form.sem_padrao}
                onChange={e => setForm({ ...form, media_padrao: e.target.value })}
                className="h-8 text-sm" placeholder="0" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.sem_padrao}
                  onChange={e => setForm({ ...form, sem_padrao: e.target.checked })}
                  className="w-4 h-4 rounded border-input" />
                Sem padrão
              </label>
            </div>
            <div className="col-span-2 sm:col-span-3 flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>
              <Button size="sm" onClick={handleSalvar}>Salvar</Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 space-y-3">
          {["bebida", "coquetel", "doce"].map(tipo => {
            const items = grouped[tipo] || [];
            if (items.length === 0) return null;
            return (
              <div key={tipo}>
                <Badge variant="secondary" className="mb-2">{tipoLabel(tipo)}</Badge>
                <div className="space-y-1">
                  {items.map(ref => (
                    <div key={ref.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ref.item}</p>
                        <p className="text-xs text-muted-foreground">
                          {ref.sem_padrao ? "sem padrão" : `${ref.percentual_padrao}% · ${ref.media_padrao} ${ref.unidade}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleEditar(ref)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => handleExcluir(ref.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!editando && (
          <Button onClick={handleNovo} className="gap-1">
            <Plus className="w-4 h-4" /> Novo item
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}