import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Camera, Sparkles, Loader2, Search, Plus, Trash2, X, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import CategoriaPicker from "@/components/receita/CategoriaPicker";
import NovoIngredienteRapido from "@/components/receita/NovoIngredienteRapido";
import { normalizarNome } from "@/lib/normalizarNome";

export default function NovaReceitaManual({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    nome: "", categoria: "", porcoes_base: "", rendimento_total: 0,
    unidade_base: "g", modo_preparo: "", foto_url: ""
  });
  const [saving, setSaving] = useState(false);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  // Ingredient section state
  const [ingBusca, setIngBusca] = useState("");
  const [selectedIng, setSelectedIng] = useState(null);
  const [ingQtd, setIngQtd] = useState("");
  const [ingPrePreparo, setIngPrePreparo] = useState("");
  const [addedIngs, setAddedIngs] = useState([]);
  const [showNovoIng, setShowNovoIng] = useState(false);
  const [novoIngNome, setNovoIngNome] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showAddGrupo, setShowAddGrupo] = useState(false);
  const [novoGrupoTitulo, setNovoGrupoTitulo] = useState("");

  const navigate = useNavigate();
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

  const handleAddGrupo = () => {
    if (!novoGrupoTitulo.trim()) return;
    setAddedIngs([...addedIngs, {
      tipo: "grupo",
      titulo_grupo: novoGrupoTitulo.trim().toUpperCase(),
      ordem: addedIngs.length,
    }]);
    setNovoGrupoTitulo("");
    setShowAddGrupo(false);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const passos = formatarModoPreparo(form.modo_preparo);
      const receita = await base44.entities.Receita.create({
        ...form,
        nome: form.nome?.toUpperCase(),
        modo_preparo: passos.length > 0 ? juntarPassos(passos) : form.modo_preparo,
        custo_total: 0,
        custo_por_porcao: 0,
        revisar: duplicateWarning != null,
      });

      for (let i = 0; i < addedIngs.length; i++) {
        const ing = addedIngs[i];
        if (ing.tipo === "grupo") {
          await base44.entities.IngredienteReceita.create({
            receita_id: receita.id,
            tipo: "grupo",
            titulo_grupo: ing.titulo_grupo,
            ordem: i * 10,
          });
        } else {
          await base44.entities.IngredienteReceita.create({
            receita_id: receita.id,
            ingrediente_id: ing.ingrediente_id,
            ingrediente_nome: ing.ingrediente_nome,
            quantidade_por_porcao: ing.quantidade_por_porcao,
            pre_preparo: ing.pre_preparo || "",
            ordem: i * 10,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["itens-receita"] });
      if (duplicateWarning) toast.warning("Receita salva com nome similar — marcada para revisão");
      else toast.success("Receita criada!");
      onCreated(receita.id);
    } catch (err) {
      toast.error("Erro ao criar receita");
    } finally {
      setSaving(false);
      setDuplicateWarning(null);
    }
  };

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome da receita"); return; }
    const ingsReais = addedIngs.filter(a => a.tipo !== "grupo");
    if (ingsReais.length === 0) { toast.error("Adicione pelo menos um ingrediente"); return; }
    const zeroQtd = ingsReais.some(a => (a.quantidade_por_porcao || 0) === 0);
    if (zeroQtd) { toast.error("Todos os ingredientes precisam ter quantidade"); return; }

    // Busca similar por nome normalizado
    const todas = await base44.entities.Receita.list("-nome", 500);
    const normForm = normalizarNome(form.nome);
    const similar = todas.find(r => normalizarNome(r.nome) === normForm);

    if (similar) {
      setDuplicateWarning(similar);
    } else {
      doSave();
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
              <CategoriaPicker value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} />
            </div>
            <div>
              <Label>Porções base</Label>
              <Input type="number" min={0} value={form.porcoes_base} onChange={(e) => setForm({ ...form, porcoes_base: e.target.value })} placeholder="&lt;opcional&gt;" />
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
          {/* Ingredients section */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-display">Ingredientes</Label>
              <span className="text-xs text-muted-foreground">{addedIngs.length} adicionados</span>
            </div>

            {/* Added ingredients list */}
            {addedIngs.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {addedIngs.map((ing, idx) => ing.tipo === "grupo" ? (
                  <div key={idx} className="flex items-center gap-2 bg-primary/5 border border-primary/20 border-dashed rounded-lg p-2 text-sm">
                    <span className="flex-1 font-bold text-xs text-primary uppercase tracking-wide">{ing.titulo_grupo}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveIng(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
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

            {/* Add group header */}
            <div className="flex items-center gap-2 mb-2">
              {showAddGrupo ? (
                <>
                  <Input
                    placeholder="Nome do grupo (ex: MOLHO PROVOLONE)"
                    value={novoGrupoTitulo}
                    onChange={(e) => setNovoGrupoTitulo(e.target.value)}
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddGrupo(); if (e.key === "Escape") { setShowAddGrupo(false); setNovoGrupoTitulo(""); } }}
                  />
                  <Button size="sm" onClick={handleAddGrupo} disabled={!novoGrupoTitulo.trim()}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddGrupo(false); setNovoGrupoTitulo(""); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowAddGrupo(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar sub-título de grupo
                </Button>
              )}
            </div>

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
                      <div className="px-3 py-3 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">Ingrediente não localizado na lista.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => { setNovoIngNome(ingBusca); setShowNovoIng(true); }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Cadastrar "{ingBusca}"
                        </Button>
                      </div>
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

          <div>
            <Label>Modo de preparo</Label>
            <Textarea rows={4} value={form.modo_preparo} onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })} placeholder="Descreva ou cole o passo a passo da receita" />
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
        <div className="mt-3 p-3 bg-accent/50 rounded-lg text-xs text-muted-foreground text-center">
          Após salvar a receita, você poderá: adicionar/reordenar ingredientes e enviar uma foto.
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Criando..." : "Criar Receita"}</Button>
        </div>
      </DialogContent>

      {showNovoIng && (
        <NovoIngredienteRapido
          open={true}
          onClose={() => setShowNovoIng(false)}
          nomeSugerido={novoIngNome}
          onCreated={(ing) => {
            setSelectedIng(ing);
            setIngBusca(ing.nome);
            setShowNovoIng(false);
          }}
        />
      )}

      {duplicateWarning && (
        <Dialog open={true} onOpenChange={() => setDuplicateWarning(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Receita similar encontrada</DialogTitle>
              <DialogDescription className="text-sm">
                Já existe uma receita cadastrada com este nome: <strong>"{duplicateWarning.nome}"</strong>.
                Deseja mesmo salvar como uma nova receita, ou prefere editar a receita existente?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => {
                setDuplicateWarning(null);
                onClose();
                navigate(`/receita/${duplicateWarning.id}`);
              }}>
                Editar existente
              </Button>
              <Button onClick={doSave}>
                Salvar mesmo assim
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}