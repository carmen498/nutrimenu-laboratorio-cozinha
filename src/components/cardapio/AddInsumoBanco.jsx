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
  const [form, setForm] = useState({ nome: "", categoria: "material", unidade: "Unidade", preco_embalagem: "", quantidade_embalagem: "" });
  const [saving, setSaving] = useState(false);

  const precoUnitarioCalc = (() => {
    const preco = parseFloat(String(form.preco_embalagem).replace(",", "."));
    const qtd = parseFloat(String(form.quantidade_embalagem).replace(",", "."));
    if (!isNaN(preco) && !isNaN(qtd) && qtd > 0) return preco / qtd;
    return null;
  })();

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
      const preco_embalagem = form.preco_embalagem !== "" ? parseFloat(String(form.preco_embalagem).replace(",", ".")) : null;
      const quantidade_embalagem = form.quantidade_embalagem !== "" ? parseFloat(String(form.quantidade_embalagem).replace(",", ".")) : null;
      const preco_unitario = preco_embalagem != null && quantidade_embalagem > 0 ? parseFloat((preco_embalagem / quantidade_embalagem).toFixed(4)) : 0;
      const novo = await base44.entities.Insumo.create({
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade,
        preco_embalagem,
        quantidade_embalagem,
        preco_unitario,
      });
      onAdd(novo);
      onUpdateGlobais();
      setShowForm(false);
      setOpen(false);
      setBusca("");
      setForm({ nome: "", categoria: "material", unidade: "Unidade", preco_embalagem: "", quantidade_embalagem: "" });
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
                <span className="text-xs text-muted-foreground">
                  {ins.unidade} · {ins.preco_unitario > 0 ? `R$ ${Number(ins.preco_unitario).toFixed(2).replace(".", ",")}` : "sem preço"}
                </span>
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
              <Label>Unidade de medida</Label>
              <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Folha", "Cm", "Metro", "Unidade", "Pacote"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Preço da embalagem (R$)</Label>
                <Input type="text" inputMode="decimal" value={form.preco_embalagem} onChange={(e) => setForm({ ...form, preco_embalagem: e.target.value })} placeholder="ex: 12,00" />
              </div>
              <div>
                <Label>Qtd. na embalagem</Label>
                <Input type="text" inputMode="decimal" value={form.quantidade_embalagem} onChange={(e) => setForm({ ...form, quantidade_embalagem: e.target.value })} placeholder="ex: 50" />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">Preço por unidade (automático)</span>
              <span className="font-semibold text-primary">
                {precoUnitarioCalc != null ? `R$ ${precoUnitarioCalc.toFixed(2).replace(".", ",")}` : "—"}
              </span>
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