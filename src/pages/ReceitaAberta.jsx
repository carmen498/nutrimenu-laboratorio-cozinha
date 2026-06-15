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
  Pencil, Trash2, GripVertical, DollarSign, AlertTriangle, Camera, Sparkles, Loader2, Check, X, ArrowUp, ArrowDown, ArrowUpDown
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
  const [quantidadeTotal, setQuantidadeTotal] = useState(null);
  const [showAddIng, setShowAddIng] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMargin, setShowMargin] = useState(false);
  const [orderingByPrep, setOrderingByPrep] = useState(false);
  const [margem, setMargem] = useState(30);
  const [editingPrice, setEditingPrice] = useState(null);
  const [editingQtdId, setEditingQtdId] = useState(null);
  const [editingQtdValue, setEditingQtdValue] = useState("");
  const [editingIngId, setEditingIngId] = useState(null);
  const [ingSearch, setIngSearch] = useState("");
  const [pendingGrupo, setPendingGrupo] = useState(false);
  const [pendingGrupoTitulo, setPendingGrupoTitulo] = useState("");
  const [editingGrupoId, setEditingGrupoId] = useState(null);
  const [editingGrupoTitulo, setEditingGrupoTitulo] = useState("");
  const [convertingNAId, setConvertingNAId] = useState(null);
  const [convertingNATitulo, setConvertingNATitulo] = useState("");
  // showAddGrupo / novoGrupoTitulo removidos — substituídos por pendingGrupo inline

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

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => base44.entities.Receita.filter({ categoria: "Receitas Básicas" }),
  });

  useEffect(() => {
    if (receita) {
      if (porcoes === null) {
        setPorcoes(receita.porcoes_base || 1);
      }
      if (quantidadeTotal === null) {
        setQuantidadeTotal(Math.round(receita.rendimento_total || 0));
      }
    }
  }, [receita, porcoes, quantidadeTotal]);

  const rendPorPorcao = receita && receita.porcoes_base > 0 ? (receita.rendimento_total || 0) / receita.porcoes_base : 0;

  const parseKgInput = (input) => {
    if (typeof input === "number") return input;
    const cleaned = String(input).trim().toLowerCase().replace(/\s/g, "");
    const kgMatch = cleaned.match(/^([\d.,]+)kg$/);
    if (kgMatch) {
      const val = parseFloat(kgMatch[1].replace(",", "."));
      return Math.round(val * 1000);
    }
    return Math.max(1, parseInt(cleaned, 10) || 1);
  };

  const handleQuantidadeChange = (rawInput) => {
    const newQtd = parseKgInput(rawInput);
    setQuantidadeTotal(newQtd);
    if (rendPorPorcao > 0) {
      const newP = Math.max(1, Math.round(newQtd / rendPorPorcao));
      setPorcoes(newP);
    }
  };

  const handlePorcoesChange = (newPorcoes) => {
    setPorcoes(newPorcoes);
    if (rendPorPorcao > 0) {
      setQuantidadeTotal(Math.round(newPorcoes * rendPorPorcao));
    }
  };

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  const receitasBasicasMap = useMemo(() => {
    const map = {};
    receitasBasicas.forEach((r) => { map[r.id] = r; });
    return map;
  }, [receitasBasicas]);

  const fator = receita && receita.rendimento_total > 0 && quantidadeTotal > 0 ? quantidadeTotal / receita.rendimento_total : 1;

  const temOrdemManual = useMemo(() => itens.some(i => (i.ordem || 0) > 0), [itens]);

  const itensFicha = useMemo(() => {
    return [...itens]
      .sort((a, b) => {
        if (temOrdemManual) return (a.ordem || 0) - (b.ordem || 0);
        // grupos vão para o topo quando sem ordem explícita
        if (a.tipo === "grupo" && b.tipo !== "grupo") return -1;
        if (a.tipo !== "grupo" && b.tipo === "grupo") return 1;
        return ((b.quantidade_por_porcao || 0) * (receita?.porcoes_base || 1) * fator)
             - ((a.quantidade_por_porcao || 0) * (receita?.porcoes_base || 1) * fator);
      })
      .map((item) => {
        if (item.tipo === "grupo") {
          return { ...item, isGrupo: true, custo: 0, qtdOriginal: 0, qtdNova: 0, qtdComprar: 0 };
        }
        if (item.tipo === "subreceita") {
          const rb = receitasBasicasMap[item.subreceita_id];
          const qtdOriginal = item.quantidade_por_porcao * (receita?.porcoes_base || 1);
          const qtdNova = item.quantidade_por_porcao * (receita?.porcoes_base || 1) * fator;
          const custo = rb && rb.rendimento_total > 0
            ? (qtdNova / rb.rendimento_total) * (rb.custo_total || 0)
            : 0;
          return { ...item, isSubreceita: true, receitaBase: rb, custo, qtdOriginal, qtdNova, qtdComprar: qtdNova, isGrupo: false, isNA: false };
        }
        const ing = ingMap[item.ingrediente_id];
        const qtdOriginal = item.quantidade_por_porcao * (receita?.porcoes_base || 1);
        const qtdNova = item.quantidade_por_porcao * (receita?.porcoes_base || 1) * fator;
        const fc = ing?.fator_correcao || 1;
        const qtdComprar = qtdNova * fc;
        const custo = qtdComprar * (ing?.preco_por_g_rs || 0);
        const isNA = !!(item.ingrediente_nome && item.ingrediente_nome.toUpperCase() === "N/A");
        return { ...item, ing, qtdOriginal, qtdNova, qtdComprar, custo, isGrupo: false, isNA };
      });
  }, [itens, ingMap, fator, receita, temOrdemManual]);

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

  const updateOrdemMut = useMutation({
    mutationFn: async ({ itemId, ordem }) => {
      await base44.entities.IngredienteReceita.update(itemId, { ordem });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
    },
  });

  const replaceIngMut = useMutation({
    mutationFn: async ({ itemId, newIngredienteId, newIngredienteNome }) => {
      await base44.entities.IngredienteReceita.update(itemId, {
        tipo: "ingrediente",
        ingrediente_id: newIngredienteId,
        ingrediente_nome: newIngredienteNome,
        subreceita_id: "",
        subreceita_nome: "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingIngId(null);
      setIngSearch("");
      toast.success("Ingrediente substituído");
    },
  });

  const replaceWithSubreceitaMut = useMutation({
    mutationFn: async ({ itemId, receitaId, receitaNome }) => {
      await base44.entities.IngredienteReceita.update(itemId, {
        tipo: "subreceita",
        ingrediente_id: "",
        ingrediente_nome: "",
        subreceita_id: receitaId,
        subreceita_nome: receitaNome,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingIngId(null);
      setIngSearch("");
      toast.success("Substituído por sub-receita");
    },
  });

  const addGrupoMut = useMutation({
    mutationFn: async (titulo) => {
      const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem || 0), 0);
      await base44.entities.IngredienteReceita.create({
        receita_id: id,
        tipo: "grupo",
        titulo_grupo: titulo,
        ordem: maxOrdem + 10,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setPendingGrupo(false);
      setPendingGrupoTitulo("");
    },
  });

  const convertToGrupoMut = useMutation({
    mutationFn: async ({ itemId, titulo }) => {
      const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem || 0), 0);
      await base44.entities.IngredienteReceita.delete(itemId);
      await base44.entities.IngredienteReceita.create({
        receita_id: id,
        tipo: "grupo",
        titulo_grupo: titulo,
        ordem: maxOrdem + 10,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setConvertingNAId(null);
      setConvertingNATitulo("");
      toast.success("Convertido para sub-título");
    },
  });

  const updateGrupoMut = useMutation({
    mutationFn: async ({ itemId, titulo }) => {
      await base44.entities.IngredienteReceita.update(itemId, { titulo_grupo: titulo });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      setEditingGrupoId(null);
    },
  });

  const deleteItemOrGrupoMut = useMutation({
    mutationFn: (itemId) => base44.entities.IngredienteReceita.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Item removido");
    },
  });

  const handleMove = (idx, dir) => {
    const items = [...itensFicha];
    if (dir < 0 && idx === 0) return;
    if (dir > 0 && idx >= items.length - 1) return;
    const targetIdx = idx + dir;
    const ordemA = items[idx].ordem || (idx + 1) * 10;
    const ordemB = items[targetIdx].ordem || (targetIdx + 1) * 10;
    updateOrdemMut.mutate({ itemId: items[idx].id, ordem: ordemB });
    updateOrdemMut.mutate({ itemId: items[targetIdx].id, ordem: ordemA });
    toast.success("Ordem alterada");
  };

  const handleOrderByPrep = async () => {
    if (!receita?.modo_preparo) {
      toast.error("A receita não tem modo de preparo descrito.");
      return;
    }
    setOrderingByPrep(true);
    try {
      // Only reorder existing non-group items — never create or delete
      const nonGroup = [];
      const groupPositions = [];
      itens.forEach((item, idx) => {
        if (item.tipo === "grupo") {
          groupPositions.push({ ...item, idx });
        } else {
          const nome = item.ingrediente_nome || item.subreceita_nome || "";
          if (nome) nonGroup.push({ ...item, idx, nome });
        }
      });

      if (nonGroup.length === 0) { setOrderingByPrep(false); return; }

      const ingNames = nonGroup.map((ng, i) => `ID:${i} — ${ng.nome}`).join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise o modo de preparo abaixo e devolva os IDs na ordem em que cada ingrediente aparece pela PRIMEIRA vez no texto.

Modo de preparo:
${receita.modo_preparo}

Ingredientes:
${ingNames}

REGRAS:
- Retorne APENAS os IDs dos ingredientes que REALMENTE aparecem na lista acima, na nova ordem.
- NUNCA invente ingredientes novos — use apenas os IDs fornecidos.
- Ingredientes NÃO mencionados no modo de preparo: coloque no FINAL do array.
- Se um ingrediente do modo de preparo não estiver na lista fornecida, IGNORE — não invente um ID.`,
        response_json_schema: {
          type: "object",
          properties: {
            ids_ordenados: {
              type: "array",
              items: { type: "number" },
              description: "Array com os IDs (números) na nova ordem. Apenas IDs da lista fornecida."
            }
          }
        }
      });

      const orderedIds = (result.ids_ordenados || []).map(Number);
      if (orderedIds.length === 0) {
        toast.error("Não foi possível determinar a ordem dos ingredientes.");
        setOrderingByPrep(false);
        return;
      }

      // Map IDs back to items, skipping any ID that doesn't match
      const reordered = [];
      const usedIds = new Set();
      for (const id of orderedIds) {
        const match = nonGroup.find(ng => ng.idx === id);
        if (match && !usedIds.has(match.id)) {
          reordered.push(match);
          usedIds.add(match.id);
        }
      }
      // Append any remaining nonGroup items not included by the LLM
      for (const ng of nonGroup) {
        if (!usedIds.has(ng.id)) reordered.push(ng);
      }

      // Interleave groups based on their original position relative to ingredients
      const finalOrder = [];
      let ri = 0;
      for (const gp of groupPositions) {
        while (ri < reordered.length && reordered[ri].idx < gp.idx) {
          finalOrder.push(reordered[ri]);
          ri++;
        }
        finalOrder.push(gp);
      }
      while (ri < reordered.length) {
        finalOrder.push(reordered[ri]);
        ri++;
      }

      // Only update ordem — never touch name, quantity, or cost
      for (let i = 0; i < finalOrder.length; i++) {
        await base44.entities.IngredienteReceita.update(finalOrder[i].id, { ordem: i * 10 });
      }

      qc.invalidateQueries({ queryKey: ["itens-receita", id] });
      toast.success("Ingredientes ordenados conforme o modo de preparo. Ajuste manualmente se necessário.");
    } catch (err) {
      toast.error("Erro ao ordenar: " + err.message);
    } finally {
      setOrderingByPrep(false);
    }
  };

  const handleConfirmQtd = (itemId) => {
    const val = parseFloat(editingQtdValue);
    if (!isNaN(val) && val >= 0) {
      const baseTotal = (receita?.porcoes_base || 1) * fator;
      updateQtdMut.mutate({ itemId, quantidade_por_porcao: baseTotal > 0 ? val / baseTotal : val });
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
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Quantidade total (g) */}
          <div>
            <Label className="text-sm font-semibold">Quantidade desejada (g)?</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="ex: 500 ou 1,5kg"
              value={quantidadeTotal ? Math.round(quantidadeTotal) : ""}
              onChange={(e) => handleQuantidadeChange(e.target.value)}
              className="text-center text-lg font-bold h-10 mt-1"
            />
            {quantidadeTotal > 0 && quantidadeTotal >= 1000 && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                = {(quantidadeTotal / 1000).toFixed(1).replace(".", ",")} kg
              </p>
            )}
          </div>
          {/* Right: Porções */}
          <div>
            <Label className="text-sm font-semibold">Quantas porções?</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => handlePorcoesChange(Math.max(1, (porcoes || 1) - 1))}>
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                min={1}
                value={porcoes || ""}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  handlePorcoesChange(val);
                }}
                className="text-center text-lg font-bold h-10 flex-1"
              />
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => handlePorcoesChange((porcoes || 1) + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {fator !== 1 && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                <Badge variant="secondary" className="text-xs">×{fator.toFixed(1)}</Badge>
              </p>
            )}
          </div>
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
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleOrderByPrep} disabled={orderingByPrep || !receita?.modo_preparo} title="Ordenar ingredientes conforme o modo de preparo">
              {orderingByPrep ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowUpDown className="w-4 h-4 mr-1" />}
              Ordenar por preparo
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingGrupo(true)}>
              <Plus className="w-4 h-4 mr-1" /> Sub-título
            </Button>
            <Button size="sm" onClick={() => setShowAddIng(true)}>
              <Plus className="w-4 h-4 mr-1" /> Ingrediente
            </Button>
          </div>
        </div>

        {loadingItens ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : itensFicha.filter(i => !i.isGrupo && !i.isNA).length === 0 && itensFicha.filter(i => i.isGrupo || i.isNA).length === 0 && !pendingGrupo ? (
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
              <div className={temFatorCorrecao ? "col-span-3" : "col-span-3"}>Ingrediente</div>
              <div className={temFatorCorrecao ? "col-span-2 text-center" : "col-span-3 text-center"}>Quantidade</div>
              {temFatorCorrecao && <div className="col-span-2 text-center">Comprar</div>}
              <div className="col-span-2 text-right">Custo</div>
              <div className="col-span-3"></div>
            </div>

            {itensFicha.map((item, idx) => {
              const isQtdZero = !item.isGrupo && (item.quantidade_por_porcao || 0) === 0;

              // Grupo header
              if (item.isGrupo) {
                return (
                  <Card key={item.id} className="p-2 bg-primary/5 border-primary/20 border-dashed">
                    <div className="flex items-center gap-2">
                      {editingGrupoId === item.id ? (
                        <>
                          <Input
                            className="h-8 text-sm font-bold flex-1"
                            value={editingGrupoTitulo}
                            onChange={(e) => setEditingGrupoTitulo(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editingGrupoTitulo.trim()) {
                                updateGrupoMut.mutate({ itemId: item.id, titulo: editingGrupoTitulo.trim().toUpperCase() });
                              }
                              if (e.key === "Escape") setEditingGrupoId(null);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            if (editingGrupoTitulo.trim()) updateGrupoMut.mutate({ itemId: item.id, titulo: editingGrupoTitulo.trim().toUpperCase() });
                            else setEditingGrupoId(null);
                          }}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGrupoId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-bold text-sm text-primary uppercase tracking-wide">{item.titulo_grupo}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Subir">
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Descer">
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingGrupoId(item.id); setEditingGrupoTitulo(item.titulo_grupo); }} title="Editar título">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              }

              if (item.isNA) {
                return (
                  <Card key={item.id} className="p-2 bg-primary/5 border-primary/20 border-dashed">
                    <div className="flex items-center gap-2">
                      {convertingNAId === item.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            className="h-8 text-sm font-bold flex-1"
                            value={convertingNATitulo}
                            onChange={(e) => setConvertingNATitulo(e.target.value)}
                            placeholder="Digite o nome do sub-título..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && convertingNATitulo.trim()) {
                                convertToGrupoMut.mutate({ itemId: item.id, titulo: convertingNATitulo.trim().toUpperCase() });
                              }
                              if (e.key === "Escape") { setConvertingNAId(null); setConvertingNATitulo(""); }
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            if (convertingNATitulo.trim()) convertToGrupoMut.mutate({ itemId: item.id, titulo: convertingNATitulo.trim().toUpperCase() });
                            else { setConvertingNAId(null); setConvertingNATitulo(""); }
                          }}>
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setConvertingNAId(null); setConvertingNATitulo(""); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-muted-foreground italic">N/A — sem nome</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80" onClick={() => { setConvertingNAId(item.id); setConvertingNATitulo(item.ingrediente_nome === "N/A" ? "" : item.ingrediente_nome); }} title="Converter para sub-título">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Subir">
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Descer">
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              }

              if (item.isSubreceita) {
                return (
                  <Card key={item.id} className="p-3 bg-amber-50/70 border-amber-200/60">
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center gap-1.5">
                          <ChefHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{item.subreceita_nome}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 border-amber-300 text-amber-700 bg-amber-100/50">Preparar antes</Badge>
                          </div>
                        </div>
                      </div>
                      <div className={temFatorCorrecao ? "col-span-2" : "col-span-3"}>
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
                          <button
                            className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                            onClick={() => {
                              setEditingQtdId(item.id);
                              setEditingQtdValue(item.qtdNova.toFixed(0));
                            }}
                            title="Clique para editar a quantidade"
                          >
                            {formatWeight(item.qtdNova, receita.unidade_base)}
                          </button>
                        )}
                      </div>
                      {temFatorCorrecao && <div className="col-span-2"></div>}
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(item.custo)}</span>
                      </div>
                      <div className="col-span-3 flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingIngId(item.id); setIngSearch(""); }} title="Substituir">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Subir">
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Descer">
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Mobile */}
                    <div className="md:hidden">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ChefHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{item.subreceita_nome}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 border-amber-300 text-amber-700 bg-amber-100/50">Preparar antes</Badge>
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingIngId(item.id); setIngSearch(""); }} title="Substituir">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Subir">
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Descer">
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
                            className="hover:underline hover:text-primary font-medium"
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
                        <div></div>
                        <span className="font-bold text-primary">{formatCurrency(item.custo)}</span>
                      </div>
                    </div>
                  </Card>
                );
              }

              return (
              <Card key={item.id} className={`p-3 ${isQtdZero ? "border-amber-400 bg-amber-50/60" : ""}`}>
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    {editingIngId === item.id ? (
                      <div className="relative">
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="Buscar ingrediente..."
                            value={ingSearch}
                            onChange={(e) => setIngSearch(e.target.value)}
                            className="h-7 text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Escape") { setEditingIngId(null); setIngSearch(""); } }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setEditingIngId(null); setIngSearch(""); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        {ingSearch && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                            {ingredientesDB
                              .filter(ing => ing.nome.toLowerCase().includes(ingSearch.toLowerCase()))
                              .slice(0, 20)
                              .map(ing => (
                                <button
                                  key={`ing-${ing.id}`}
                                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                                  onClick={() => replaceIngMut.mutate({
                                    itemId: item.id,
                                    newIngredienteId: ing.id,
                                    newIngredienteNome: ing.nome
                                  })}
                                >
                                  {ing.nome}
                                </button>
                              ))
                            }
                            {receitasBasicas
                              .filter(r => r.nome.toUpperCase().includes(ingSearch.toUpperCase()))
                              .slice(0, 10)
                              .map(r => (
                                <button
                                  key={`rec-${r.id}`}
                                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                  onClick={() => replaceWithSubreceitaMut.mutate({
                                    itemId: item.id,
                                    receitaId: r.id,
                                    receitaNome: r.nome
                                  })}
                                >
                                  <span className="flex items-center gap-1">
                                    <ChefHat className="w-3 h-3 text-primary" />
                                    {r.nome}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Receita</Badge>
                                </button>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm">{item.ingrediente_nome || item.ing?.nome}</p>
                        {item.medida_caseira && <p className="text-xs text-muted-foreground">{item.medida_caseira}</p>}
                        {item.pre_preparo && <p className="text-xs text-muted-foreground">{item.pre_preparo}</p>}
                        {isQtdZero && <p className="text-xs text-amber-600 font-medium mt-0.5">Quantidade não informada — toque para editar</p>}
                      </>
                    )}
                  </div>
                  <div className={`${temFatorCorrecao ? "col-span-2" : "col-span-3"} text-center`}>
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
                  <div className="col-span-3 flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingIngId(item.id); setIngSearch(""); }} title="Substituir ingrediente">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Subir">
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Descer">
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden">
                  {editingIngId === item.id ? (
                    <div className="relative mb-2">
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Buscar ingrediente..."
                          value={ingSearch}
                          onChange={(e) => setIngSearch(e.target.value)}
                          className="h-8 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Escape") { setEditingIngId(null); setIngSearch(""); } }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditingIngId(null); setIngSearch(""); }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      {ingSearch && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                          {ingredientesDB
                            .filter(ing => ing.nome.toLowerCase().includes(ingSearch.toLowerCase()))
                            .slice(0, 20)
                            .map(ing => (
                              <button
                                key={`ing-m-${ing.id}`}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                                onClick={() => replaceIngMut.mutate({
                                  itemId: item.id,
                                  newIngredienteId: ing.id,
                                  newIngredienteNome: ing.nome
                                })}
                              >
                                {ing.nome}
                              </button>
                            ))
                          }
                          {receitasBasicas
                            .filter(r => r.nome.toUpperCase().includes(ingSearch.toUpperCase()))
                            .slice(0, 10)
                            .map(r => (
                              <button
                                key={`rec-m-${r.id}`}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => replaceWithSubreceitaMut.mutate({
                                  itemId: item.id,
                                  receitaId: r.id,
                                  receitaNome: r.nome
                                })}
                              >
                                <span className="flex items-center gap-1">
                                  <ChefHat className="w-3 h-3 text-primary" />
                                  {r.nome}
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">Receita</Badge>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-sm">{item.ingrediente_nome || item.ing?.nome}</p>
                      {item.medida_caseira && <p className="text-xs text-muted-foreground">{item.medida_caseira}</p>}
                      {item.pre_preparo && <p className="text-xs text-muted-foreground">{item.pre_preparo}</p>}
                      {isQtdZero && <p className="text-xs text-amber-600 font-medium mt-0.5">Quantidade não informada — toque para editar</p>}
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingIngId(item.id); setIngSearch(""); }} title="Substituir ingrediente">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Subir">
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Descer">
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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

            {pendingGrupo && (
              <Card className="p-2 bg-primary/5 border-primary/20 border-dashed">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 text-sm font-bold flex-1"
                    value={pendingGrupoTitulo}
                    onChange={(e) => setPendingGrupoTitulo(e.target.value)}
                    placeholder="Digite o nome do sub-título..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pendingGrupoTitulo.trim()) {
                        addGrupoMut.mutate(pendingGrupoTitulo.trim().toUpperCase());
                      }
                      if (e.key === "Escape") { setPendingGrupo(false); setPendingGrupoTitulo(""); }
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    if (pendingGrupoTitulo.trim()) addGrupoMut.mutate(pendingGrupoTitulo.trim().toUpperCase());
                    else { setPendingGrupo(false); setPendingGrupoTitulo(""); }
                  }}>
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPendingGrupo(false); setPendingGrupoTitulo(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}
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