import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Package, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { COMPORTAMENTO_CUSTO_LABELS, normalizarComportamentoCusto } from "@/lib/escalonamentoCustos";

const UNIDADES = ["Folha", "Cm", "Metro", "Unidade", "Pacote"];

const emptyForm = { nome: "", categoria: "embalagem", unidade: "Unidade", preco_embalagem: "", quantidade_embalagem: "", comportamento_custo_padrao: "por_lote" };

export default function InsumosEmbalagens() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: insumos = [] } = useQuery({
    queryKey: ["insumos-db"],
    queryFn: () => base44.entities.Insumo.list("nome", 500),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return insumos;
    const s = search.toLowerCase();
    return insumos.filter((i) => (i.nome || "").toLowerCase().includes(s));
  }, [insumos, search]);

  const precoUnitarioCalc = useMemo(() => {
    const preco = parseFloat(String(form.preco_embalagem).replace(",", "."));
    const qtd = parseFloat(String(form.quantidade_embalagem).replace(",", "."));
    if (!isNaN(preco) && !isNaN(qtd) && qtd > 0) return preco / qtd;
    return null;
  }, [form.preco_embalagem, form.quantidade_embalagem]);

  const startNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (i) => {
    setEditing(i);
    setForm({
      nome: i.nome || "",
      categoria: i.categoria || "embalagem",
      unidade: i.unidade || "Unidade",
      preco_embalagem: i.preco_embalagem != null ? String(i.preco_embalagem) : "",
      quantidade_embalagem: i.quantidade_embalagem != null ? String(i.quantidade_embalagem) : "",
      comportamento_custo_padrao: normalizarComportamentoCusto(i.comportamento_custo_padrao),
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const preco_embalagem = form.preco_embalagem !== "" ? parseFloat(String(form.preco_embalagem).replace(",", ".")) : null;
    const quantidade_embalagem = form.quantidade_embalagem !== "" ? parseFloat(String(form.quantidade_embalagem).replace(",", ".")) : null;
    const preco_unitario = preco_embalagem != null && quantidade_embalagem > 0 ? parseFloat((preco_embalagem / quantidade_embalagem).toFixed(4)) : 0;
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      unidade: form.unidade,
      preco_embalagem,
      quantidade_embalagem,
      preco_unitario,
      comportamento_custo_padrao: normalizarComportamentoCusto(form.comportamento_custo_padrao),
    };
    try {
      if (editing) {
        await base44.entities.Insumo.update(editing.id, payload);
        toast.success("Insumo atualizado");
      } else {
        await base44.entities.Insumo.create(payload);
        toast.success("Insumo cadastrado");
      }
      queryClient.invalidateQueries({ queryKey: ["insumos-db"] });
      setShowForm(false);
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  const remove = async (i) => {
    if (!confirm(`Excluir "${i.nome}"?`)) return;
    try {
      await base44.entities.Insumo.delete(i.id);
      queryClient.invalidateQueries({ queryKey: ["insumos-db"] });
      toast.success("Insumo excluído");
    } catch (err) {
      toast.error("Erro ao excluir: " + (err.message || ""));
    }
  };

  const fmtPreco = (i) => i.preco_unitario > 0 ? `R$ ${Number(i.preco_unitario).toFixed(2).replace(".", ",")}` : "—";

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Package className="w-5 h-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Insumos e Embalagens</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar insumo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={startNew} className="gap-1">
          <Plus className="w-4 h-4" /> Novo Insumo
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b-2 border-border">
              <th className="text-left px-3 py-2 font-semibold text-xs">Nome</th>
              <th className="text-left px-3 py-2 font-semibold text-xs">Unidade</th>
              <th className="text-left px-3 py-2 font-semibold text-xs">Escala padrão</th>
              <th className="text-right px-2 py-2 font-semibold text-xs">Preço por unidade</th>
              <th className="px-2 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i, idx) => (
              <tr key={i.id} className={`border-b border-border/40 ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-muted/40`}>
                <td className="px-3 py-2 font-medium">{i.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">{i.unidade || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{COMPORTAMENTO_CUSTO_LABELS[normalizarComportamentoCusto(i.comportamento_custo_padrao)]}</td>
                <td className={`px-2 py-2 text-right tabular-nums font-semibold ${i.preco_unitario > 0 ? "" : "text-muted-foreground font-normal"}`} style={i.preco_unitario > 0 ? { color: "#1B4332" } : {}}>
                  {fmtPreco(i)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <button className="p-1 rounded hover:bg-muted" onClick={() => startEdit(i)} title="Editar">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                    </button>
                    <button className="p-1 rounded hover:bg-red-50" onClick={() => remove(i)} title="Excluir">
                      <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum insumo encontrado. Clique em "Novo Insumo".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="ex: Papel manteiga" className="mt-1" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Unidade de medida *</Label>
              <Select value={form.unidade} onValueChange={(v) => setForm(f => ({ ...f, unidade: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Comportamento de custo padrão</Label>
              <Select value={form.comportamento_custo_padrao} onValueChange={(v) => setForm(f => ({ ...f, comportamento_custo_padrao: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPORTAMENTO_CUSTO_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Pode ser alterado em cada receita ou cardápio sem mudar o cadastro mestre.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Preço da embalagem (R$)</Label>
                <Input type="text" inputMode="decimal" value={form.preco_embalagem} onChange={(e) => setForm(f => ({ ...f, preco_embalagem: e.target.value }))} placeholder="ex: 12,00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Qtd. total na embalagem</Label>
                <Input type="text" inputMode="decimal" value={form.quantidade_embalagem} onChange={(e) => setForm(f => ({ ...f, quantidade_embalagem: e.target.value }))} placeholder="ex: 50" className="mt-1" />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Preço por unidade (automático)</span>
              <span className="font-semibold text-primary">
                {precoUnitarioCalc != null ? `R$ ${precoUnitarioCalc.toFixed(2).replace(".", ",")}` : "—"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={save}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}