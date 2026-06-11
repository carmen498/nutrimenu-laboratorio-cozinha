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

const CATEGORIAS = ["Carnes", "Massas", "Molhos", "Vegetais", "Aves", "Peixes", "Sopas", "Sobremesas", "Salgadinhos", "Empanados", "Complementos"];

export default function NovaReceitaManual({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    nome: "", categoria: "Carnes", porcoes_base: 4, rendimento_total: 0,
    unidade_base: "g", modo_preparo: "", foto_url: ""
  });
  const [saving, setSaving] = useState(false);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const qc = useQueryClient();

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome da receita"); return; }
    setSaving(true);
    try {
      const passos = formatarModoPreparo(form.modo_preparo);
      const receita = await base44.entities.Receita.create({
        ...form,
        modo_preparo: passos.length > 0 ? juntarPassos(passos) : form.modo_preparo,
        custo_total: 0,
        custo_por_porcao: 0,
      });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita criada!");
      onCreated(receita.id);
    } catch (err) {
      toast.error("Erro ao criar receita");
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
    if (!form.nome?.trim()) { toast.error("Informe o nome da receita primeiro"); return; }
    setGeneratingPhoto(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional food photography of "${form.nome}", Brazilian cuisine, beautifully plated, natural lighting, top-down view, warm colors, appetizing, high quality`
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
          <DialogTitle className="font-display">Nova Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da receita</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Bolo de Cenoura" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Porções base</Label>
              <Input type="number" min={1} value={form.porcoes_base} onChange={(e) => setForm({ ...form, porcoes_base: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rendimento total</Label>
              <Input type="number" value={form.rendimento_total || ""} onChange={(e) => setForm({ ...form, rendimento_total: parseFloat(e.target.value) || 0 })} placeholder="Opcional" />
            </div>
            <div>
              <Label>Unidade base</Label>
              <Select value={form.unidade_base} onValueChange={(v) => setForm({ ...form, unidade_base: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Gramas (sólidos)</SelectItem>
                  <SelectItem value="ml">Mililitros (líquidos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Modo de preparo</Label>
            <Textarea rows={4} value={form.modo_preparo} onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })} placeholder="Descreva o passo a passo..." />
          </div>

          {/* Photo */}
          <div>
            <Label>Foto da receita</Label>
            {form.foto_url && (
              <img src={form.foto_url} alt="Foto" className="w-full h-40 object-cover rounded-lg mb-2" />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="relative" asChild>
                <label className="cursor-pointer">
                  <Camera className="w-4 h-4 mr-1" /> Enviar foto
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
                </label>
              </Button>
              <Button variant="outline" size="sm" onClick={handleGeneratePhoto} disabled={generatingPhoto}>
                {generatingPhoto ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Gerar com IA
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Criando..." : "Criar Receita"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}