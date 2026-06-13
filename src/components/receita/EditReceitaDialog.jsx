import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";

const CATEGORIAS = [
  "Acompanhamentos, Arroz e Risotos",
  "Acompanhamentos, Complementos",
  "Acompanhamentos, Grãos e Leguminosas",
  "Carnes, Aves",
  "Carnes, Bacalhau",
  "Carnes, Bovina",
  "Carnes, Frutos do mar",
  "Carnes, Peixes",
  "Carnes, Suína",
  "Confeitaria, Doces e Docinhos",
  "Confeitaria, Sobremesas",
  "Confeitaria, Tortas",
  "Entradas, Frias",
  "Molhos",
  "Saladas",
  "Tortas e Quiches",
  "A Revisar",
];

export default function EditReceitaDialog({ open, onClose, receita }) {
  const [form, setForm] = useState({ ...receita });
  const [saving, setSaving] = useState(false);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const qc = useQueryClient();

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = form;
      rest.nome = rest.nome?.toUpperCase();
      const passos = formatarModoPreparo(rest.modo_preparo);
      if (passos.length > 0) rest.modo_preparo = juntarPassos(passos);
      await base44.entities.Receita.update(receita.id, rest);
      qc.invalidateQueries({ queryKey: ["receita", receita.id] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita atualizada!");
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, foto_url: file_url });
    } catch {
      toast.error("Erro ao enviar foto");
    }
  };

  const handleGeneratePhoto = async () => {
    setGeneratingPhoto(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional food photography of "${form.nome}", Brazilian cuisine, beautifully plated, natural lighting, top-down view, warm colors`
      });
      setForm({ ...form, foto_url: url });
    } catch {
      toast.error("Erro ao gerar foto");
    } finally {
      setGeneratingPhoto(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria || ""} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Porções base</Label>
              <Input type="number" min={1} value={form.porcoes_base || ""} onChange={(e) => setForm({ ...form, porcoes_base: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rendimento total</Label>
              <Input type="number" value={form.rendimento_total || ""} onChange={(e) => setForm({ ...form, rendimento_total: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unidade_base || "g"} onValueChange={(v) => setForm({ ...form, unidade_base: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Gramas</SelectItem>
                  <SelectItem value="ml">Mililitros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Modo de preparo</Label>
            <Textarea rows={5} value={form.modo_preparo || ""} onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })} />
          </div>
          <div>
            <Label>Foto</Label>
            {form.foto_url && <img src={form.foto_url} alt="" className="w-full h-36 object-cover rounded-lg mb-2" />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Camera className="w-4 h-4 mr-1" /> Enviar
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
                </label>
              </Button>
              <Button variant="outline" size="sm" onClick={handleGeneratePhoto} disabled={generatingPhoto}>
                {generatingPhoto ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Gerar IA
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}