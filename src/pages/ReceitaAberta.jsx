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
  Pencil, Trash2, GripVertical, DollarSign, AlertTriangle, Camera, Sparkles, Loader2
} from "lucide-react";
import { toast } from "sonner";
import AddIngredienteDialog from "@/components/receita/AddIngredienteDialog";
import EditReceitaDialog from "@/components/receita/EditReceitaDialog";
import CalculadoraCusto from "@/components/CalculadoraCusto";

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
              <div className="col-span-3">Ingrediente</div>
              <div className="col-span-2 text-center">Qtd original</div>
              <div className="col-span-2 text-center">Qtd nova</div>
              <div className="col-span-2 text-center">Comprar</div>
              <div className="col-span-2 text-right">Custo</div>
              <div className="col-span-1"></div>
            </div>

            {itensFicha.map((item) => (
              <Card key={item.id} className="p-3">
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <p className="font-medium text-sm">{item.ingrediente_nome || item.ing?.nome}</p>
                    {item.pre_preparo && <p className="text-xs text-muted-foreground">{item.pre_preparo}</p>}
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">
                    {formatWeight(item.qtdOriginal, receita.unidade_base)}
                  </div>
                  <div className="col-span-2 text-center text-sm font-medium">
                    {formatWeight(item.qtdNova, receita.unidade_base)}
                  </div>
                  <div className="col-span-2 text-center text-sm">
                    {formatWeight(item.qtdComprar, receita.unidade_base)}
                  </div>
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
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItemMut.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-muted-foreground">Original: {formatWeight(item.qtdOriginal, receita.unidade_base)}</span>
                    <span className="font-medium">Nova: {formatWeight(item.qtdNova, receita.unidade_base)}</span>
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-muted-foreground">Comprar: {formatWeight(item.qtdComprar, receita.unidade_base)}</span>
                    <button className="font-bold text-primary hover:underline" onClick={() => setEditingPrice(item)}>
                      {formatCurrency(item.custo)}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mode of preparation */}
      {receita.modo_preparo && (
        <div>
          <h2 className="font-display text-lg font-bold mb-2">Modo de Preparo</h2>
          <Card className="p-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{receita.modo_preparo}</p>
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