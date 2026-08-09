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
import { Sparkles, Search, Plus, Minus, Trash2, X, Check, AlertCircle, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import CategoriaPicker from "@/components/receita/CategoriaPicker";
import NovoIngredienteRapido from "@/components/receita/NovoIngredienteRapido";
import TagSelector from "@/components/tags/TagSelector";
import { normalizarNome, buscarFuzzy, buscarIngredientesRanqueado, buscarReceitasMultiPalavra } from "@/lib/normalizarNome";
import { explodeSubreceita } from "@/lib/subreceitaUtils";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { fetchAllPages } from "@/lib/fetchAllPages";

export default function NovaReceitaManual({ open, onClose, onCreated, receitasExistentes = [] }) {
  const [form, setForm] = useState({
    nome: "", categorias: [], porcoes_base: "", rendimento_total: 0,
    unidade_base: "g", modo_preparo: "", descritivo_menu: "", foto_url: ""
  });
  const [saving, setSaving] = useState(false);
  // Ingredient section state
  const [ingBusca, setIngBusca] = useState("");
  const [selectedIng, setSelectedIng] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // "ingrediente" | "subreceita"
  const [ingQtd, setIngQtd] = useState("");
  const [ingPrePreparo, setIngPrePreparo] = useState("");
  const [addedIngs, setAddedIngs] = useState([]);
  const [showNovoIng, setShowNovoIng] = useState(false);
  const [novoIngNome, setNovoIngNome] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showAddGrupo, setShowAddGrupo] = useState(false);
  const [novoGrupoTitulo, setNovoGrupoTitulo] = useState("");
  const [editingGrupoIdx, setEditingGrupoIdx] = useState(null);
  const [editingGrupoText, setEditingGrupoText] = useState("");
  const [showDiscard, setShowDiscard] = useState(false);

  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const filteredIngs = useMemo(() => {
    if (!ingBusca.trim()) return { ings: [], recs: [] };
    const ings = buscarIngredientesRanqueado(ingBusca, ingredientesDB, 20);
    const recs = buscarReceitasMultiPalavra(ingBusca, receitasBasicas, null, 10);
    return { ings, recs };
  }, [ingBusca, ingredientesDB, receitasBasicas]);

  const handleAddIng = async () => {
    if (!selectedIng) { toast.error("Selecione um ingrediente"); return; }
    const qtd = parseFloat(ingQtd);
    if (!qtd || qtd <= 0) { toast.error("Informe a quantidade por porção"); return; }

    if (selectedType === "subreceita") {
      if (addedIngs.some(a => a.tipo === "subreceita" && !a._isChild && a.subreceita_id === selectedIng.id)) {
        toast.error("Sub-receita já adicionada");
        return;
      }
      try {
        const { children, rendimentoEfetivo, rendimentoEstimado } = await explodeSubreceita(selectedIng, qtd);
        const marker = {
          tipo: "subreceita",
          subreceita_id: selectedIng.id,
          subreceita_nome: selectedIng.nome,
          quantidade_por_porcao: qtd,
          ordem: addedIngs.length,
          _isMarker: true,
        };
        const childItems = children.map((c, i) => ({
          ...c,
          ordem: addedIngs.length + 1 + i,
          _isChild: true,
        }));
        setAddedIngs([...addedIngs, marker, ...childItems]);
        const rendMsg = rendimentoEstimado
          ? ` — Rendimento não cadastrado, usando soma dos ingredientes: ${rendimentoEfetivo}g. Ajuste na ficha da receita se necessário.`
          : "";
        toast.success(`${selectedIng.nome} adicionada com ${children.length} ingredientes${rendMsg}`);
      } catch (err) {
        toast.error("Erro ao buscar ingredientes da sub-receita: " + (err.message || err));
        return;
      }
    } else {
      if (addedIngs.some(a => a.tipo !== "subreceita" && a.tipo !== "grupo" && !a._isChild && a.ingrediente_id === selectedIng.id)) {
        toast.error("Ingrediente já adicionado");
        return;
      }
      setAddedIngs([...addedIngs, {
        tipo: "ingrediente",
        ingrediente_id: selectedIng.id,
        ingrediente_nome: selectedIng.nome,
        quantidade_por_porcao: qtd,
        pre_preparo: ingPrePreparo,
        ordem: addedIngs.length,
      }]);
    }
    setSelectedIng(null);
    setSelectedType(null);
    setIngBusca("");
    setIngQtd("");
    setIngPrePreparo("");
  };

  const handleRemoveIng = (idx) => {
    const item = addedIngs[idx];
    if (item._isMarker) {
      const newList = [...addedIngs];
      newList.splice(idx, 1);
      while (idx < newList.length && newList[idx]._isChild) {
        newList.splice(idx, 1);
      }
      setAddedIngs(newList);
    } else {
      setAddedIngs(addedIngs.filter((_, i) => i !== idx));
    }
  };

  const handleMoveIng = (idx, dir) => {
    const item = addedIngs[idx];
    if (item._isChild) {
      let parentIdx = idx - 1;
      while (parentIdx >= 0 && addedIngs[parentIdx]._isChild) parentIdx--;
      if (parentIdx >= 0 && addedIngs[parentIdx]._isMarker) {
        return handleMoveIng(parentIdx, dir);
      }
      return;
    }
    const blocks = [];
    let i = 0;
    while (i < addedIngs.length) {
      if (addedIngs[i]._isMarker) {
        const block = [addedIngs[i]];
        let j = i + 1;
        while (j < addedIngs.length && addedIngs[j]._isChild) { block.push(addedIngs[j]); j++; }
        blocks.push(block);
        i = j;
      } else {
        blocks.push([addedIngs[i]]);
        i++;
      }
    }
    let blockIdx = -1;
    let itemIdx = 0;
    for (let b = 0; b < blocks.length; b++) {
      if (itemIdx === idx) { blockIdx = b; break; }
      itemIdx += blocks[b].length;
    }
    if (blockIdx === -1) return;
    const newBlockIdx = blockIdx + dir;
    if (newBlockIdx < 0 || newBlockIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[blockIdx], newBlocks[newBlockIdx]] = [newBlocks[newBlockIdx], newBlocks[blockIdx]];
    setAddedIngs(newBlocks.flat());
  };

  const handleMoveChild = (idx, dir) => {
    const item = addedIngs[idx];
    if (!item._isChild) return;
    let markerIdx = idx - 1;
    while (markerIdx >= 0 && addedIngs[markerIdx]._isChild) markerIdx--;
    if (markerIdx < 0 || !addedIngs[markerIdx]._isMarker) return;
    const childIdxs = [];
    let j = markerIdx + 1;
    while (j < addedIngs.length && addedIngs[j]._isChild) { childIdxs.push(j); j++; }
    const localIdx = childIdxs.indexOf(idx);
    const targetLocalIdx = localIdx + dir;
    if (targetLocalIdx < 0 || targetLocalIdx >= childIdxs.length) return;
    const targetIdx = childIdxs[targetLocalIdx];
    const list = [...addedIngs];
    [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
    setAddedIngs(list);
  };

  const handleUpdateGrupo = (idx) => {
    if (!editingGrupoText.trim()) { setEditingGrupoIdx(null); return; }
    const list = [...addedIngs];
    list[idx] = { ...list[idx], titulo_grupo: editingGrupoText.trim().toUpperCase() };
    setAddedIngs(list);
    setEditingGrupoIdx(null);
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

  const doSave = async (isDuplicate = false) => {
    setSaving(true);
    try {
      const passos = formatarModoPreparo(form.modo_preparo);
      const receita = await base44.entities.Receita.create({
        ...form,
        nome: form.nome?.toUpperCase(),
        porcoes_base: form.porcoes_base || null,
        modo_preparo: passos.length > 0 ? juntarPassos(passos) : form.modo_preparo,
        custo_total: 0,
        custo_por_porcao: 0,
        revisar: isDuplicate,
      });

      // Save tags
      for (const tagId of selectedTagIds) {
        const tag = await base44.entities.Tag.get(tagId);
        if (tag) {
          await base44.entities.ReceitaTag.create({
            receita_id: receita.id,
            tag_id: tag.id,
            tag_nome: tag.nome,
            tag_grupo: tag.grupo,
            tag_cor: tag.cor,
          });
        }
      }

      let currentParentId = "";
      for (let i = 0; i < addedIngs.length; i++) {
        const ing = addedIngs[i];
        if (ing.tipo === "grupo") {
          currentParentId = "";
          await base44.entities.IngredienteReceita.create({
            receita_id: receita.id,
            tipo: "grupo",
            titulo_grupo: ing.titulo_grupo,
            ordem: i * 10,
          });
        } else if (ing.tipo === "subreceita" && !ing._isChild) {
          const marker = await base44.entities.IngredienteReceita.create({
            receita_id: receita.id,
            tipo: "subreceita",
            subreceita_id: ing.subreceita_id,
            subreceita_nome: ing.subreceita_nome,
            quantidade_por_porcao: ing.quantidade_por_porcao,
            ordem: i * 10,
          });
          currentParentId = marker.id;
        } else {
          const isChild = !!ing._isChild;
          await base44.entities.IngredienteReceita.create({
            receita_id: receita.id,
            tipo: ing.tipo === "subreceita" ? "subreceita" : "ingrediente",
            ingrediente_id: ing.ingrediente_id || "",
            ingrediente_nome: ing.ingrediente_nome || "",
            subreceita_id: ing.subreceita_id || "",
            subreceita_nome: ing.subreceita_nome || "",
            pre_preparo: ing.pre_preparo || "",
            quantidade_por_porcao: ing.quantidade_por_porcao,
            ordem: i * 10,
            subreceita_parent_id: isChild ? currentParentId : "",
          });
          if (!isChild) currentParentId = "";
        }
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      qc.invalidateQueries({ queryKey: ["itens-receita"] });
      const isBaseSemPDP = (form.categorias || []).includes("Receitas Base") && (!form.rendimento_total || form.rendimento_total <= 0);
      if (isDuplicate) {
        toast.warning("Receita salva com nome similar — marcada para revisão");
      } else if (isBaseSemPDP) {
        toast.warning("Receita Base criada sem PDP — preencha o rendimento na ficha");
      } else {
        toast.success("Receita criada!");
      }
      onCreated(receita.id);
    } catch (err) {
      toast.error("Erro ao criar receita: " + (err.message || err));
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

    setSaving(true);
    try {
      // Usa lista em cache da página pai — evita busca desnecessária e rate limit
      const fuzzy = buscarFuzzy(form.nome, receitasExistentes);

      if (fuzzy) {
        setDuplicateWarning(fuzzy.receita);
      } else {
        await doSave(false);
      }
    } catch (err) {
      toast.error("Erro ao verificar duplicidade: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const hasData = !!form.nome?.trim() || addedIngs.length > 0 || !!form.modo_preparo?.trim() || !!form.foto_url || selectedTagIds.length > 0;
  const handleAttemptClose = () => { if (hasData) setShowDiscard(true); else onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleAttemptClose(); }}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { e.preventDefault(); handleAttemptClose(); }}>
        <DialogHeader>
          <DialogTitle className="font-display">Nova Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da receita</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })} placeholder="Ex: BOLO DE CENOURA" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Categoria</Label>
              <CategoriaPicker value={form.categorias || []} onChange={(v) => setForm({ ...form, categorias: v })} />
            </div>
            <div>
              <Label>Tags</Label>
              <TagSelector
                selectedIds={selectedTagIds}
                onToggle={(tag) => {
                  setSelectedTagIds(prev =>
                    prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                  );
                }}
              />
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
            <div>
              <Label>PC recomendado</Label>
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setForm((f) => ({ ...f, per_capita_g: Math.max(0, (f.per_capita_g || 0) - 10) }))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Input
                  type="number"
                  className="h-9 text-center px-1 flex-1 min-w-0"
                  value={form.per_capita_g || ""}
                  onChange={(e) => setForm({ ...form, per_capita_g: parseFloat(e.target.value) || null })}
                  placeholder="g/porção"
                />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setForm((f) => ({ ...f, per_capita_g: (f.per_capita_g || 0) + 10 }))}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
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
                  editingGrupoIdx === idx ? (
                    <div key={idx} className="flex items-center gap-2 bg-primary/5 border border-primary/20 border-dashed rounded-lg p-2">
                      <Input
                        className="h-7 text-sm font-bold flex-1"
                        value={editingGrupoText}
                        onChange={(e) => setEditingGrupoText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleUpdateGrupo(idx); if (e.key === "Escape") setEditingGrupoIdx(null); }}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateGrupo(idx)}>
                        <Check className="w-3 h-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingGrupoIdx(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div key={idx} className="flex items-center gap-1 bg-primary/10 border border-primary/30 border-dashed rounded-lg p-2 text-sm">
                      <span className="flex-1 font-bold text-xs text-primary uppercase tracking-wide">{ing.titulo_grupo}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleMoveIng(idx, -1)} title="Mover bloco (divisor + ingredientes)">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleMoveIng(idx, 1)} title="Mover bloco (divisor + ingredientes)">
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setEditingGrupoIdx(idx); setEditingGrupoText(ing.titulo_grupo); }} title="Editar título">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveIng(idx)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  )
                ) : ing._isChild ? (
                  <div key={idx} className="flex items-center gap-1 rounded-lg p-2 text-sm ml-6 border-l-2 border-amber-300 bg-amber-50/30">
                    <span className="flex-1 truncate text-muted-foreground">
                      {ing.tipo === "subreceita" ? (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          {ing.subreceita_nome}
                        </span>
                      ) : (
                        ing.ingrediente_nome
                      )}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">{ing.quantidade_por_porcao.toFixed(1)}g/porção</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveChild(idx, -1)} title="Subir">
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveChild(idx, 1)} title="Descer">
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveIng(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ) : ing.tipo === "subreceita" ? (
                  <div key={idx} className="flex items-center gap-1 bg-amber-50/70 border border-amber-200/60 rounded-lg p-2 text-sm">
                    <span className="flex items-center gap-1 flex-1 truncate font-medium">
                      <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                      {ing.subreceita_nome}
                    </span>
                    <span className="text-[10px] px-1.5 py-0 rounded bg-amber-100 text-amber-700 font-medium shrink-0">Preparar antes</span>
                    <span className="text-muted-foreground shrink-0 text-xs">{ing.quantidade_por_porcao}g/porção</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveIng(idx, -1)} title="Subir">
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveIng(idx, 1)} title="Descer">
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveIng(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div key={idx} className="flex items-center gap-1 bg-muted/50 rounded-lg p-2 text-sm">
                    <span className="flex-1 truncate font-medium">{ing.ingrediente_nome}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">{ing.quantidade_por_porcao}g/porção</span>
                    {ing.pre_preparo && <span className="text-xs text-muted-foreground italic shrink-0">({ing.pre_preparo})</span>}
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveIng(idx, -1)} title="Subir">
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMoveIng(idx, 1)} title="Descer">
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveIng(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add ingredient form (primary action) — single row: busca | quantidade | pré-preparo | + */}
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_120px_160px_auto] gap-2 items-start">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal h-9" size="sm">
                    {selectedIng ? (
                      selectedType === "subreceita" ? (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          {selectedIng.nome}
                        </span>
                      ) : selectedIng.nome
                    ) : <span className="text-muted-foreground">Buscar ingrediente ou sub-receita...</span>}
                    <Search className="w-3.5 h-3.5 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Input
                    placeholder="Digite o nome do ingrediente..."
                    value={ingBusca}
                    onChange={(e) => { setIngBusca(e.target.value); setSelectedIng(null); setSelectedType(null); }}
                    className="border-0 focus-visible:ring-0 h-9 px-3"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto border-t">
                    {(filteredIngs.ings.length > 0 || filteredIngs.recs.length > 0) ? (
                      <>
                        {filteredIngs.ings.length > 0 && (
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground px-3 pt-1.5 pb-0.5 tracking-wide">
                            Ingredientes
                          </p>
                        )}
                        {filteredIngs.ings.map((ing) => (
                          <button
                            key={`ing-${ing.id}`}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between"
                            onClick={() => {
                              setSelectedIng(ing);
                              setSelectedType("ingrediente");
                              setIngBusca(ing.nome);
                              setTimeout(() => document.getElementById('ing-qtd-input')?.focus(), 0);
                            }}
                          >
                            <span>{ing.nome}</span>
                            {ing.preco_por_g_rs > 0 && (
                              <span className="text-xs text-muted-foreground">R$ {(ing.preco_por_g_rs * 1000).toFixed(2).replace(".", ",")}/kg</span>
                            )}
                          </button>
                        ))}
                        {filteredIngs.recs.length > 0 && (
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground px-3 pt-1.5 pb-0.5 tracking-wide flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Sub-receitas
                          </p>
                        )}
                        {filteredIngs.recs.map((rec) => (
                          <button
                            key={`rec-${rec.id}`}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                            onClick={() => {
                              setSelectedIng(rec);
                              setSelectedType("subreceita");
                              setIngBusca(rec.nome);
                              setTimeout(() => document.getElementById('ing-qtd-input')?.focus(), 0);
                            }}
                          >
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              {rec.nome}
                            </span>
                            <span className="text-[10px] px-1.5 py-0 rounded bg-amber-100 text-amber-700 font-medium">Sub-receita</span>
                          </button>
                        ))}
                      </>
                    ) : ingBusca.trim() ? (
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

              <Input
                id="ing-qtd-input"
                type="number"
                placeholder="Quant. (g)"
                value={ingQtd}
                onChange={(e) => setIngQtd(e.target.value)}
                className="h-9 text-sm"
                min={0}
                step={0.1}
              />
              <Input
                placeholder="Pré-preparo (opcional)"
                value={ingPrePreparo}
                onChange={(e) => setIngPrePreparo(e.target.value)}
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={handleAddIng} className="h-9 w-9 p-0 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Add group header (secondary) */}
            <div className="flex items-center gap-2 mt-3">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-3">
              <Label>Modo de preparo</Label>
              <Textarea rows={6} value={form.modo_preparo} onChange={(e) => setForm({ ...form, modo_preparo: e.target.value.toLowerCase() })} placeholder={"Lista numerada. Verbos no infinitivo. Sem marcas, sem dicas. Ex:\n1. derreter o chocolate em banho-maria com a manteiga. reservar.\n2. bater os ovos com o açúcar até formar creme fofo.\n3. acrescentar a farinha e mexer até homogeneizar.\n4. assar a 180 °c por 25 minutos."} />
            </div>

            <div className="md:col-span-2">
              <Label>Descritivo da receita (para Menu)</Label>
              <Textarea rows={6} value={form.descritivo_menu || ""} onChange={(e) => setForm({ ...form, descritivo_menu: e.target.value })} placeholder="Texto voltado ao cliente final. Ex: Filé mignon grelhado com molho de mostarda e ervas." />
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-accent/50 rounded-lg text-xs text-muted-foreground text-center">
          Após salvar, na ficha da receita você poderá: reordenar ingredientes, ajustar medidas e enviar a foto.
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleAttemptClose}>Cancelar</Button>
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
              <Button disabled={saving} onClick={async () => {
                setDuplicateWarning(null);
                try {
                  await doSave(true);
                } catch (err) {
                  toast.error("Erro ao salvar receita: " + (err.message || err));
                }
              }}>
                {saving ? "Salvando..." : "Salvar mesmo assim"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDiscard} onOpenChange={setShowDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem dados não salvos. Deseja descartar tudo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscard(false); onClose(); }}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}