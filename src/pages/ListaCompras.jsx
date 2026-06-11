import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Trash2, FileText, Share2, ChefHat } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS_COMPRA = {
  "CARNES": "Carnes",
  "VEGETAIS": "Hortifruti",
  "TEMPEROS": "Temperos",
  "LATICÍNIOS": "Laticínios",
  "CEREAIS & SECOS": "Mercearia",
  "ENLATADOS": "Mercearia",
  "REFRIGERADOS": "Refrigerados",
  "GRÃOS E SEMENTES": "Mercearia",
  "DOCES": "Mercearia",
  "DIVERSOS": "Diversos",
};

export default function ListaCompras() {
  const navigate = useNavigate();
  const [jaTemho, setJaTenho] = useState({});
  const [showAddReceita, setShowAddReceita] = useState(false);
  const [selectedReceitas, setSelectedReceitas] = useState([]);
  const [porcoesPorReceita, setPorcoesPorReceita] = useState({});

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-updated_date", 200),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: allItens = [] } = useQuery({
    queryKey: ["all-itens-receita"],
    queryFn: () => base44.entities.IngredienteReceita.list("-created_date", 2000),
  });

  // Auto-add recipe from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const receitaId = params.get("receita");
    const porcoes = parseInt(params.get("porcoes")) || null;
    if (receitaId && !selectedReceitas.includes(receitaId)) {
      setSelectedReceitas([receitaId]);
      if (porcoes) setPorcoesPorReceita({ [receitaId]: porcoes });
    }
  }, []);

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  const receitaMap = useMemo(() => {
    const map = {};
    receitas.forEach((r) => { map[r.id] = r; });
    return map;
  }, [receitas]);

  // Build shopping list
  const listaItems = useMemo(() => {
    const totals = {};
    selectedReceitas.forEach((recId) => {
      const receita = receitaMap[recId];
      if (!receita) return;
      const porcoes = porcoesPorReceita[recId] || receita.porcoes_base || 1;
      const itens = allItens.filter((i) => i.receita_id === recId);
      itens.forEach((item) => {
        const ing = ingMap[item.ingrediente_id];
        if (!ing) return;
        const qtd = item.quantidade_por_porcao * porcoes;
        const fc = ing.fator_correcao || 1;
        const qtdComprar = qtd * fc;
        const custo = qtdComprar * (ing.preco_por_g_rs || 0);
        if (totals[item.ingrediente_id]) {
          totals[item.ingrediente_id].quantidade += qtdComprar;
          totals[item.ingrediente_id].custo += custo;
        } else {
          totals[item.ingrediente_id] = {
            ingrediente_id: item.ingrediente_id,
            nome: ing.nome,
            categoria: CATEGORIAS_COMPRA[ing.categoria] || "Diversos",
            categoriaOriginal: ing.categoria,
            quantidade: qtdComprar,
            unidade_compra: ing.unidade_compra,
            peso_embalagem_g: ing.peso_embalagem_g,
            custo,
          };
        }
      });
    });
    return Object.values(totals).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  }, [selectedReceitas, porcoesPorReceita, allItens, ingMap, receitaMap]);

  // Group by category
  const grouped = {};
  listaItems.forEach((item) => {
    if (!grouped[item.categoria]) grouped[item.categoria] = [];
    grouped[item.categoria].push(item);
  });

  const totalGeral = listaItems.filter(i => !jaTemho[i.ingrediente_id]).reduce((s, i) => s + i.custo, 0);

  const formatCurrency = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatWeight = (g) => g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;

  const UNIDADES_CONTAGEM = ["UN", "CX", "VIDRO", "LATA", "PACOTE", "MOLHO"];
  const formatQuantidade = (item) => {
    const isContagem = UNIDADES_CONTAGEM.includes(item.unidade_compra?.toUpperCase());
    if (isContagem && item.peso_embalagem_g > 0) {
      const unidades = Math.ceil(item.quantidade / item.peso_embalagem_g);
      return `${unidades} un · ${formatWeight(item.quantidade)}`;
    }
    return formatWeight(item.quantidade);
  };

  const handleShare = () => {
    let text = "🛒 LISTA DE COMPRAS\n\n";
    Object.keys(grouped).sort().forEach(cat => {
      text += `📌 ${cat}\n`;
      grouped[cat].forEach(item => {
        if (!jaTemho[item.ingrediente_id]) {
          text += `  • ${item.nome} — ${formatQuantidade(item)} — ${formatCurrency(item.custo)}\n`;
        }
      });
      text += "\n";
    });
    text += `💰 Total: ${formatCurrency(totalGeral)}`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Lista copiada!");
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Lista de Compras</h1>
        <Button size="sm" onClick={() => setShowAddReceita(true)}>
          <Plus className="w-4 h-4 mr-1" /> Receita
        </Button>
      </div>

      {/* Selected recipes */}
      {selectedReceitas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Receitas incluídas:</p>
          {selectedReceitas.map((rId) => {
            const r = receitaMap[rId];
            if (!r) return null;
            return (
              <Card key={rId} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ChefHat className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{r.nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    value={porcoesPorReceita[rId] || r.porcoes_base || 1}
                    onChange={(e) => setPorcoesPorReceita({ ...porcoesPorReceita, [rId]: parseInt(e.target.value) || 1 })}
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground">porções</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                    setSelectedReceitas(selectedReceitas.filter(id => id !== rId));
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Shopping list */}
      {listaItems.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Lista vazia</p>
          <p className="text-sm mt-1">Adicione receitas para gerar a lista de compras.</p>
        </Card>
      ) : (
        <>
          {Object.keys(grouped).sort().map((cat) => (
            <div key={cat}>
              <Badge variant="secondary" className="mb-2">{cat}</Badge>
              <div className="space-y-1">
                {grouped[cat].map((item) => (
                  <Card
                    key={item.ingrediente_id}
                    className={`p-3 flex items-center gap-3 transition-opacity ${jaTemho[item.ingrediente_id] ? "opacity-40" : ""}`}
                  >
                    <Checkbox
                      checked={!!jaTemho[item.ingrediente_id]}
                      onCheckedChange={(v) => setJaTenho({ ...jaTemho, [item.ingrediente_id]: v })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${jaTemho[item.ingrediente_id] ? "line-through" : ""}`}>
                        {item.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatQuantidade(item)}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">{formatCurrency(item.custo)}</span>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Total */}
          <Card className="p-4 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total da compra</span>
              <span className="text-xl font-bold">{formatCurrency(totalGeral)}</span>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" /> Compartilhar
            </Button>
          </div>
        </>
      )}

      {/* Add recipe dialog */}
      <Dialog open={showAddReceita} onOpenChange={(v) => !v && setShowAddReceita(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Adicionar Receita à Lista</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {receitas.map((r) => {
              const alreadyAdded = selectedReceitas.includes(r.id);
              return (
                <button
                  key={r.id}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between ${alreadyAdded ? "bg-primary/5 text-muted-foreground" : "hover:bg-accent"}`}
                  disabled={alreadyAdded}
                  onClick={() => {
                    setSelectedReceitas([...selectedReceitas, r.id]);
                    setPorcoesPorReceita({ ...porcoesPorReceita, [r.id]: r.porcoes_base || 4 });
                    setShowAddReceita(false);
                  }}
                >
                  <span className="font-medium">{r.nome}</span>
                  {alreadyAdded && <Badge variant="secondary" className="text-xs">Adicionada</Badge>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}