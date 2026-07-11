import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIAS_ING = [
  "Carnes e Ovos", "Verduras e Hortaliças", "Temperos", "Laticínios", "Panificação e Cereais",
  "Conservas e Enlatados", "Açúcares e Doces", "Diversos", "A Revisar",
  "Peixes e Frutos do Mar", "Frutas", "Óleos e Gorduras"
];

const UNIDADES = ["G", "KG", "LT", "ML", "UN", "MOLHO", "CX", "PACOTE", "BANDEJA", "BALDE", "LATA", "SACHÊ", "PC", "DÚZIA"];

export default function NovoIngredienteRapido({ open, onClose, nomeSugerido, onCreated }) {
  const [form, setForm] = useState({
    nome: nomeSugerido || "",
    categoria: "A Revisar",
    unidade_compra: "KG",
    peso_embalagem_g: "",
    preco_embalagem_rs: "",
    fator_correcao: "1",
  });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do ingrediente"); return; }
    setSaving(true);
    try {
      const peso = parseFloat(form.peso_embalagem_g) || 0;
      const preco = parseFloat(form.preco_embalagem_rs) || 0;
      const fc = parseFloat(form.fator_correcao) || 1;
      const preco_por_g = peso > 0 ? preco / peso : 0;

      const existing = await base44.entities.Ingrediente.filter({ nome: form.nome });
      const ing = await base44.entities.Ingrediente.create({
        nome: form.nome,
        categoria: form.categoria,
        unidade_compra: form.unidade_compra,
        peso_embalagem_g: peso,
        preco_embalagem_rs: preco,
        preco_por_g_rs: preco_por_g,
        fator_correcao: fc,
        revisar: existing.length > 0,
        ...(preco_por_g > 0 ? { preco_atualizado_em: new Date().toISOString(), fonte_preco: "Manual" } : {}),
      });

      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success(`${form.nome} cadastrado!`);
      onCreated(ing);
    } catch {
      toast.error("Erro ao cadastrar ingrediente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Novo Ingrediente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ING.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unidade_compra} onValueChange={(v) => setForm({ ...form, unidade_compra: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Peso emb. (g/ml)</Label>
              <Input type="number" value={form.peso_embalagem_g} onChange={(e) => setForm({ ...form, peso_embalagem_g: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Preço emb. (R$)</Label>
              <Input type="number" step="0.01" value={form.preco_embalagem_rs} onChange={(e) => setForm({ ...form, preco_embalagem_rs: e.target.value })} placeholder="0,00" />
            </div>
          </div>
          <div>
            <Label>Fator de correção</Label>
            <Input type="number" step="0.01" value={form.fator_correcao} onChange={(e) => setForm({ ...form, fator_correcao: e.target.value })} placeholder="1.0" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}