import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChefHat, ArrowLeft, Minus, Plus, ShoppingCart, FileText, Copy,
  Pencil, Trash2, GripVertical, DollarSign, AlertTriangle, Camera, Sparkles, Loader2, Check, X
} from "lucide-react";
import { toast } from "sonner";
import AddIngredienteDialog from "@/components/receita/AddIngredienteDialog";
import EditReceitaDialog from "@/components/receita/EditReceitaDialog";
import CalculadoraCusto from "@/components/CalculadoraCusto";
import { formatarModoPreparo } from "@/lib/formatarModoPreparo";

export default function ReceitaAberta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [porcoes, setPorcoes] = useState(null);
  const [showAddIng, setShowAddIng] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMargin, setShowMargin] = useState(false);
  const [margem, setMargem] = useState(30);
  const [editingPrice, setEditingPrice] = useState(null);
  const [editingQtdId, setEditingQtdId] = useState(null);
  const [editingQtdValue, setEditingQtdValue] = useState("");

  const { data: receita, isLoading: loadingReceita } = useQuery({
    queryKey: ["receita", id],
    queryFn: () => base44.entities.Receita.filter({ id }),
    select: (data) => data[0],
  });

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ["itens-receita", id],
    queryFn: () => base44.entities.IngredienteReceita.filter({ receita_id: id }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  useEffect(() => {
    if (receita && porcoes === null) {
      setPorcoes(receita.porcoes_base || 4);
    }
  }, [receita, porcoes]);

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  const fator = receita && receita.porcoes_base > 0 ? (porcoes || receita.porcoes_base) / receita.porcoes_base : 1;

  const itensFicha = useMemo(() => {
    return itens
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .map((item) => {
        const ing = ingMap[item.ingrediente_id];
        const qtdOriginal = item.quantidade_por_porcao * (receita?.porcoes_base || 1);
        const qtdNova = item.quantidade_por_porcao * (porcoes || receita?.porcoes_base || 1);
        const fc = ing?.fator_correcao || 1;
        const qtdComprar = qtdNova * fc;
        const custo = qtdComprar * (ing?.preco_por_g_rs || 0);
        return { ...item, ing, qtdOriginal, qtdNova, qtdComprar, custo };
      });
  }, [itens, ingMap, porcoes, receita]);

  const custoTotal = itensFicha.reduce((sum, i) => sum + i.custo, 0);
  const custoPorcao = (porcoes || 1) > 0 ? custoTotal / (porcoes || 1) : 0;

  // Save costs to recipe
  useEffect(() => {
    if (receita && fator === 1 && custoTotal > 0) {
      const newCT = parseFloat(custoTotal.toFixed(2));
      const newCP = parseFloat(custoPorcao.toFixed(2));
      if (newCT !== receita.custo_total || newCP !== receita.custo_por_porcao) {
        base44.entities.Receita.update(id, { custo_total: newCT, custo_por_porcao: newCP });
      }
    }
  }, [custoTotal, custoPorcao, receita, fator, id]);

  const deleteItemMut = useMutation({
    mutationFn: (itemId) => base44.entities.IngredienteReceita.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Ingrediente removido");
    },
  });

  const updatePriceMut = useMutation({
    mutationFn: async ({ ingId, preco_embalagem_rs, peso_embalagem_g }) => {
      const preco_por_g_rs = peso_embalagem_g > 0 ? preco_embalagem_rs / peso_embalagem_g : 0;
      await base44.entities.Ingrediente.update(ingId, { preco_embalagem_rs, peso_embalagem_g, preco_por_g_rs });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      setEditingPrice(null);
      toast.success("Preço atualizado em todas as receitas!");
    },
  });

  const updateQtdMut = useMutation({
    mutationFn: async ({ itemId, quantidade_por_porcao }) => {
      await base44.entities.IngredienteReceita.update(itemId, { quantidade_por_porcao });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingQtdId(null);
    },
  });

  const handleConfirmQtd = (itemId) => {
    const val = parseFloat(editingQtdValue);
    if (!isNaN(val) && val >= 0) {
      const p = porcoes || receita?.porcoes_base || 1;
      updateQtdMut.mutate({ itemId, quantidade_por_porcao: val / p });
    }
  };

  const temFatorCorrecao = itensFicha.some(i => (i.ing?.fator_correcao || 1) !== 1);

  const formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatWeight = (g, unit) => {
    if (unit === "ml") return g >= 1000 ? `${(g / 1000).toFixed(2)} lt` : `${g.toFixed(0)} ml`;
    return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;
  };

  if (loadingReceita) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!receita) {
    return <div className="text-center py-20"><p>Receita não encontrada</p><Link to="/receitas" className="text-primary underline mt-2 inline-block">Voltar</Link></div>;
  }

  const precoVenda = showMargin ? custoPorcao / (1 - margem / 100) : 0;
  const passos = formatarModoPreparo(receita.modo_preparo);

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/receitas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1 truncate">{receita.nome}</h1>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
        </Button>
      </div>

      {/* Photo */}
      {receita.foto_url && (
        <div className="rounded-xl overflow-hidden aspect-video bg-muted">
          <img src={receita.foto_url} alt={receita.nome} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{receita.categoria}</Badge>
        <span className="text-sm text-muted-foreground">
          Base: {receita.porcoes_base} porções
          {receita.rendimento_total > 0 && ` · ${formatWeight(receita.rendimento_total, receita.unidade_base)}`}
        </span>
      </div>

      {/* Portion scaler */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <Label className="text-sm font-semibold text-primary">Quantas porções?</Label>
        <div className="flex items-center gap-3 mt-2">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setPorcoes(Math.max(1, (porcoes || 1) - 1))}>
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            min={1}
            value={porcoes || ""}
            onChange={(e) => setPorcoes(Math.max(1, parseInt(e.target.value) || 1))}
            className="text-center text-2xl font-bold h-12 w-24"
          />
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setPorcoes((porcoes || 1) + 1)}>
            <Plus className="w-4 h-4" />
          </Button>
          {fator !== 1 && (
            <Badge variant="secondary" className="text-xs">×{fator.toFixed(1)}</Badge>
          )}
        </div>
      </Card>

      {/* Cost summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Custo total</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(custoTotal)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Custo por porção</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(custoPorcao)}</p>
        </Card>
      </div>

      {/* Margin calculator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quanto cobrar se eu vender?</span>
          </div>
          <Switch checked={showMargin} onCheckedChange={setShowMargin} />
        </div>
        {showMargin && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Margem: {margem}%</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(precoVenda)} /porção</span>
            </div>
            <Slider value={[margem]} min={10} max={80} step={5} onValueChange={(v) => setMargem(v[0])} />
          </div>
        )}
      </Card>

      {/* Ingredients table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Ingredientes</h2>
          <Button size="sm" onClick={() => setShowAddIng(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>

        {loadingItens ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : itensFicha.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Nenhum ingrediente adicionado</p>
            <Button size="sm" className="mt-3" onClick={() => setShowAddIng(true)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar ingrediente
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 text-xs text-muted-foreground font-medium">
              <div className={temFatorCorrecao ? "col-span-4" : "col-span-5"}>Ingrediente</div>
              <div className={temFatorCorrecao ? "col-span-3 text-center" : "col-span-4 text-center"}>Quantidade</div>
              {temFatorCorrecao && <div className="col-span-2 text-center">Comprar</div>}
              <div className="col-span-2 text-right">Custo</div>
              <div className="col-span-1"></div>
            </div>

            {itensFicha.map((item) => {
              const isQtdZero = (item.quantidade_por_porcao || 0) === 0;
              return (
              <Card key={item.id} className={`p-3 ${isQtdZero ? "border-amber-400 bg-amber-50/60" : ""}`}>
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                  <div className={temFatorCorrecao ? "col-span-4" : "col-span-5"}>
                    <p className="font-medium text-sm">{item.ingrediente_nome || item.ing?.nome}</p>
                    {item.pre_preparo && <p className="text-xs text-muted-foreground">{item.pre_preparo}</p>}
                    {isQtdZero && <p className="text-xs text-amber-600 font-medium mt-0.5">Quantidade não informada — toque para editar</p>}
                  </div>
                  <div className={`${temFatorCorrecao ? "col-span-3" : "col-span-4"} text-center`}>
                    {editingQtdId === item.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Input
                          type="number"
                          className="h-7 w-20 text-sm text-center"
                          value={editingQtdValue}
                          onChange={(e) => setEditingQtdValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmQtd(item.id);
                            if (e.key === "Escape") setEditingQtdId(null);
                          }}
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleConfirmQtd(item.id)}>
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingQtdId(null)}>
                          <X className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <button
                          className={`text-sm hover:underline hover:text-primary transition-colors ${isQtdZero ? "text-amber-600 font-medium" : "font-medium"}`}
                          onClick={() => {
                            setEditingQtdId(item.id);
                            setEditingQtdValue(item.qtdNova.toFixed(0));
                          }}
                          title="Clique para editar a quantidade"
                        >
                          {formatWeight(item.qtdNova, receita.unidade_base)}
                        </button>
                        {fator !== 1 && (
                          <p className="text-xs text-muted-foreground mt-0.5">original: {formatWeight(item.qtdOriginal, receita.unidade_base)}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {temFatorCorrecao && (
                    <div className="col-span-2 text-center text-sm text-muted-foreground">
                      {formatWeight(item.qtdComprar, receita.unidade_base)}
                    </div>
                  )}
                  <div className="col-span-2 text-right">
                    <button
                      className="text-sm font-semibold text-primary hover:underline"
                      onClick={() => setEditingPrice(item)}
                    >
                      {formatCurrency(item.custo)}
                    </button>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemMut.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.ingrediente_nome || item.ing?.nome}</p>
                      {item.pre_preparo && <p className="text-xs text-muted-foreground">{item.pre_preparo}</p>}
                      {isQtdZero && <p className="text-xs text-amber-600 font-medium mt-0.5">Quantidade não informada — toque para editar</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItemMut.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex justify-between mt-2 text-xs items-center">
                    <span className="text-muted-foreground">Quantidade: </span>
                    {editingQtdId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="h-7 w-16 text-xs text-center"
                          value={editingQtdValue}
                          onChange={(e) => setEditingQtdValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmQtd(item.id);
                            if (e.key === "Escape") setEditingQtdId(null);
                          }}
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleConfirmQtd(item.id)}>
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingQtdId(null)}>
                          <X className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className={`hover:underline hover:text-primary font-medium ${isQtdZero ? "text-amber-600" : ""}`}
                        onClick={() => {
                          setEditingQtdId(item.id);
                          setEditingQtdValue(item.qtdNova.toFixed(0));
                        }}
                      >
                        {formatWeight(item.qtdNova, receita.unidade_base)}
                      </button>
                    )}
                  </div>
                  {fator !== 1 && (
                    <p className="text-xs text-muted-foreground mt-0.5">original: {formatWeight(item.qtdOriginal, receita.unidade_base)}</p>
                  )}
                  <div className="flex justify-between mt-1 text-xs">
                    <div>
                      {temFatorCorrecao && <span className="text-muted-foreground">Comprar: {formatWeight(item.qtdComprar, receita.unidade_base)}</span>}
                    </div>
                    <button className="font-bold text-primary hover:underline" onClick={() => setEditingPrice(item)}>
                      {formatCurrency(item.custo)}
                    </button>
                  </div>
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mode of preparation */}
      {passos.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold mb-2">Modo de Preparo</h2>
          <Card className="p-4">
            <ol className="space-y-2 list-decimal list-inside">
              {passos.map((passo, idx) => (
                <li key={idx} className="text-sm leading-relaxed pl-1">{passo.replace(/^\d+[\.\-\)]\s*/, "")}</li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/lista-compras?receita=${id}&porcoes=${porcoes}`)}>
          <ShoppingCart className="w-4 h-4 mr-1" /> Lista de Compras
        </Button>
        <Button variant="outline" onClick={() => navigate(`/exportar/${id}?porcoes=${porcoes}`)}>
          <FileText className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Dialogs */}
      {showAddIng && (
        <AddIngredienteDialog
          open={true}
          onClose={() => setShowAddIng(false)}
          receitaId={id}
          porcoes={receita.porcoes_base}
          unidadeBase={receita.unidade_base}
        />
      )}

      {showEdit && (
        <EditReceitaDialog open={true} onClose={() => setShowEdit(false)} receita={receita} />
      )}

      {editingPrice && (
        <EditPriceDialog
          open={true}
          onClose={() => setEditingPrice(null)}
          item={editingPrice}
          ing={editingPrice.ing}
          onSave={(data) => updatePriceMut.mutate(data)}
          saving={updatePriceMut.isPending}
        />
      )}
    </div>
  );
}

function EditPriceDialog({ open, onClose, item, ing, onSave, saving }) {
  const [peso, setPeso] = useState(ing?.peso_embalagem_g || 0);
  const [preco, setPreco] = useState(ing?.preco_embalagem_rs || 0);

  if (!ing) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Preço — {ing.nome}</DialogTitle>
        </DialogHeader>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">Este preço será atualizado em todas as receitas que usam {ing.nome}.</p>
        </div>
        <CalculadoraCusto
          initialQuantidade={ing?.peso_embalagem_g || ""}
          initialPrecoTotal={ing?.preco_embalagem_rs || ""}
          onChange={({ peso_embalagem_g, preco_embalagem_rs }) => {
            setPeso(peso_embalagem_g);
            setPreco(preco_embalagem_rs);
          }}
        />
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ ingId: ing.id, preco_embalagem_rs: preco, peso_embalagem_g: peso })} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}