import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function AddInsumoBanco({ insumosGlobais, onAdd, onUpdateGlobais }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", categoria: "material", unidade: "unidade", preco_unitario: 0 });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!busca.trim()) return insumosGlobais.slice(0, 20);
    const q = busca.toLowerCase();
    return insumosGlobais.filter(i => (i.nome || "").toLowerCase().includes(q)).slice(0, 20);
  }, [busca, insumosGlobais]);

  const hasExactMatch = insumosGlobais.some(i => (i.nome || "").toLowerCase() === busca.trim().toLowerCase());

  const handleSelect = (ins) => {
    onAdd(ins);
    setOpen(false);
    setBusca("");
  };

  const openForm = () => {
    setForm(f => ({ ...f, nome: busca.trim() }));
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const novo = await base44.entities.Insumo.create({
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade,
        preco_unitario: Number(form.preco_unitario) || 0,
      });
      onAdd(novo);
      onUpdateGlobais();
      setShowForm(false);
      setOpen(false);
      setBusca("");
      setForm({ nome: "", categoria: "material", unidade: "unidade", preco_unitario: 0 });
      toast.success("Insumo cadastrado!");
    } catch (e) {
      toast.error("Erro ao cadastrar insumo");
    }
    setSaving(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBusca(""); }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Package className="w-3.5 h-3.5" /> + Banco
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 text-sm pl-8"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto border-t">
            {filtered.map((ins) => (
              <button
                key={ins.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                onClick={() => handleSelect(ins)}
              >
                <span>{ins.nome}</span>
                <span className="text-xs text-muted-foreground capitalize">{ins.categoria} · {ins.unidade}</span>
              </button>
            ))}
            {busca.trim() && !hasExactMatch && (
              <div className="border-t p-2">
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={openForm}>
                  <Plus className="w-3 h-3 mr-1" /> Cadastrar novo: "{busca.trim()}"
                </Button>
              </div>
            )}
            {!busca.trim() && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">Nenhum insumo cadastrado.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Cadastrar Insumo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="embalagem">Embalagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="unidade, cm, folha, par..." />
            </div>
            <div>
              <Label>Preço unitário (R$)</Label>
              <Input type="number" step="0.01" value={form.preco_unitario} onChange={(e) => setForm({ ...form, preco_unitario: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.nome.trim()}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}