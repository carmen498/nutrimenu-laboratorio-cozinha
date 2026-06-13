import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Camera, Sparkles, Loader2, ChevronDown, Search, Plus, Trash2 } from "lucide-react";
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

export default function NovaReceitaManual({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    nome: "", categoria: "", porcoes_base: 4, rendimento_total: 0,
    unidade_base: "g", modo_preparo: "", foto_url: ""
  });
  const [saving, setSaving] = useState(false);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const [catBusca, setCatBusca] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  // Ingredient section state
  const [ingBusca, setIngBusca] = useState("");
  const [selectedIng, setSelectedIng] = useState(null);
  const [ingQtd, setIngQtd] = useState("");
  const [ingPrePreparo, setIngPrePreparo] = useState("");
  const [addedIngs, setAddedIngs] = useState([]);

  const qc = useQueryClient();

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const filteredIngs = useMemo(() => {
    if (!ingBusca.trim()) return [];
    const term = ingBusca.toLowerCase();
    return ingredientesDB
      .filter(i => i.nome?.toLowerCase().includes(term))
      .slice(0, 20);
  }, [ingBusca, ingredientesDB]);

  const handleAddIng = () => {
    if (!selectedIng) { toast.error("Selecione um ingrediente"); return; }
    const qtd = parseFloat(ingQtd);
    if (!qtd || qtd <= 0) { toast.error("Informe a quantidade por porção"); return; }
    if (addedIngs.some(a => a.ingrediente_id === selectedIng.id)) {
      toast.error("Ingrediente já adicionado");
      return;
    }
    setAddedIngs([...addedIngs, {
      ingrediente_id: selectedIng.id,
      ingrediente_nome: selectedIng.nome,
      quantidade_por_porcao: qtd,
      pre_preparo: ingPrePreparo,
      ordem: addedIngs.length,
    }]);
    setSelectedIng(null);
    setIngBusca("");
    setIngQtd("");
    setIngPrePreparo("");
  };

  const handleRemoveIng = (idx) => {
    setAddedIngs(addedIngs.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome da receita"); return; }
    if (addedIngs.length === 0) { toast.error("Adicione pelo menos um ingrediente"); return; }

    // Validate all ingredients have quantity
    const zeroQtd = addedIngs.some(a => (a.quantidade_por_porcao || 0) === 0);
    if (zeroQtd) { toast.error("Todos os ingredientes precisam ter quantidade"); return; }

    setSaving(true);
    try {
      const passos = formatarModoPreparo(form.modo_preparo);
      // Check for duplicate name
      const existing = await base44.entities.Receita.filter({ nome: form.nome?.toUpperCase() });
      const isDuplicate = existing.length > 0;

      const receita = await base44.entities.Receita.create({
        ...form,
        nome: form.nome?.toUpperCase(),
        modo_preparo: passos.length > 0 ? juntarPassos(passos) : form.modo_preparo,
        custo_total: 0,
        custo_por_porcao: 0,
        revisar: isDuplicate,
      });

      if (isDuplicate) toast.warning("Receita duplicada — marcada para revisão");

      // Create ingredient links
      for (let i = 0; i < addedIngs.length; i++) {
        const ing = addedIngs[i];
        await base44.entities.IngredienteReceita.create({
          receita_id: receita.id,
          ingrediente_id: ing.ingrediente_id,
          ingrediente_nome: ing.ingrediente_nome,
          quantidade_por_porcao: ing.quantidade_por_porcao,
          pre_preparo: ing.pre_preparo || "",
          ordem: i * 10,
        });
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["itens-receita"] });
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
              <Popover open={catOpen} onOpenChange={setCatOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {form.categoria || <span className="text-muted-foreground">&lt;selecionar&gt;</span>}
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="flex items-center border-b px-3">
                    <Search className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Buscar categoria..."
                      value={catBusca}
                      onChange={(e) => setCatBusca(e.target.value)}
                      className="border-0 focus-visible:ring-0 h-9"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {CATEGORIAS.filter((c) => !catBusca || c.toLowerCase().includes(catBusca.toLowerCase())).map((c) => (
                      <button
                        key={c}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => { setForm({ ...form, categoria: c }); setCatOpen(false); setCatBusca(""); }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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
            <Textarea rows={4} value={form.modo_preparo} onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })} placeholder="Descreva ou cole o passo a passo da receita" />
          </div>

          {/* Ingredients section */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-display">Ingredientes</Label>
              <span className="text-xs text-muted-foreground">{addedIngs.length} adicionados</span>
            </div>

            {/* Added ingredients list */}
            {addedIngs.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {addedIngs.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 text-sm">
                    <span className="flex-1 truncate font-medium">{ing.ingrediente_nome}</span>
                    <span className="text-muted-foreground shrink-0">{ing.quantidade_por_porcao}g/porção</span>
                    {ing.pre_preparo && <span className="text-xs text-muted-foreground italic shrink-0">({ing.pre_preparo})</span>}
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveIng(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add ingredient form */}
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal" size="sm">
                    {selectedIng ? selectedIng.nome : <span className="text-muted-foreground">Buscar ingrediente...</span>}
                    <Search className="w-3.5 h-3.5 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Input
                    placeholder="Digite o nome do ingrediente..."
                    value={ingBusca}
                    onChange={(e) => { setIngBusca(e.target.value); setSelectedIng(null); }}
                    className="border-0 focus-visible:ring-0 h-9 px-3"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto border-t">
                    {filteredIngs.length > 0 ? filteredIngs.map((ing) => (
                      <button
                        key={ing.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between"
                        onClick={() => { setSelectedIng(ing); setIngBusca(ing.nome); }}
                      >
                        <span>{ing.nome}</span>
                        {ing.preco_por_g_rs > 0 && (
                          <span className="text-xs text-muted-foreground">R$ {(ing.preco_por_g_rs * 1000).toFixed(2).replace(".", ",")}/kg</span>
                        )}
                      </button>
                    )) : ingBusca.trim() ? (
                      <p className="text-xs text-muted-foreground px-3 py-4 text-center">Nenhum ingrediente encontrado</p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Quant. por porção (g)"
                    value={ingQtd}
                    onChange={(e) => setIngQtd(e.target.value)}
                    className="h-9 text-sm"
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Pré-preparo (opcional)"
                    value={ingPrePreparo}
                    onChange={(e) => setIngPrePreparo(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <Button size="sm" onClick={handleAddIng} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
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