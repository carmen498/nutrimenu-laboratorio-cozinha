import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { montarListaComprasReceita } from "@/lib/listaComprasReceitaCalc";

const UNIDADES_CONTAGEM = ["UN", "CX", "VIDRO", "LATA", "PACOTE", "MOLHO"];
const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;
const formatWeight = (g) => (g >= 1000 ? `${(g / 1000).toFixed(2).replace(".", ",")} kg` : `${Math.round(g)} g`);

export default function ReceitaListaCompras() {
  const { id } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const porcoesUrl = parseFloat(params.get("porcoes"));

  const [porcoes, setPorcoes] = useState(porcoesUrl > 0 ? porcoesUrl : null);
  const [jaTenho, setJaTenho] = useState({});
  const [comprarManual, setComprarManual] = useState({});

  const { data: receita } = useQuery({
    queryKey: ["receita", id],
    queryFn: () => base44.entities.Receita.filter({ id }),
    select: (d) => d[0],
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-receita", id],
    queryFn: () => base44.entities.IngredienteReceita.filter({ receita_id: id }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  // Porções padrão: mesma referência inicial usada na ficha (rendimento ÷ PC)
  const porcoesEfetivas = useMemo(() => {
    if (porcoes != null) return porcoes;
    if (!receita) return 1;
    const cat = (receita.categorias || []).length > 0 ? receita.categorias[0] : (receita.categoria || "");
    const pc = receita.per_capita_g || 0;
    if (pc > 0 && receita.rendimento_total > 0) return +(receita.rendimento_total / pc).toFixed(1);
    return receita.porcoes_base || 1;
  }, [porcoes, receita]);

  const lista = useMemo(() => {
    if (!receita) return null;
    return montarListaComprasReceita({ receita, itens, ingMap, porcoesDesejadas: porcoesEfetivas });
  }, [receita, itens, ingMap, porcoesEfetivas]);

  if (!receita || !lista) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const alterarPorcoes = (delta) => {
    setPorcoes(Math.max(1, Math.round((porcoesEfetivas + delta) * 10) / 10));
  };

  const getComprarQtd = (item) => (comprarManual[item.id] != null ? comprarManual[item.id] : item.quantidade);
  const getComprarCusto = (item) => getComprarQtd(item) * (item.preco_por_g || 0);

  const totalGeral = lista.itensLista
    .filter((i) => !jaTenho[i.id])
    .reduce((s, i) => s + getComprarCusto(i), 0);

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1 truncate">{receita.nome}</h1>
      </div>

      <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Porções</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => alterarPorcoes(-1)}>
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <span className="w-10 text-center font-bold text-lg tabular-nums">{porcoesEfetivas}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => alterarPorcoes(1)}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Total: <strong className="text-foreground">{formatWeight(lista.quantidadeTotalG)}</strong>
        </p>
      </Card>

      {/* Itens */}
      {lista.itensLista.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>Nenhum ingrediente nesta receita.</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {lista.itensLista.map((item) => {
            const isContagem = item.unidade_compra && UNIDADES_CONTAGEM.includes(item.unidade_compra.toUpperCase());
            const usarUnidades = isContagem && item.peso_embalagem_g > 0;
            const comprarQtd = getComprarQtd(item);
            const comprarCusto = getComprarCusto(item);
            const inputVal = usarUnidades
              ? Math.ceil(comprarQtd / item.peso_embalagem_g)
              : (comprarQtd / 1000).toFixed(2);
            const unit = usarUnidades ? "un" : "kg";
            const handleComprar = (val) => {
              let grams;
              if (usarUnidades) {
                grams = (parseInt(val) || 0) * item.peso_embalagem_g;
              } else {
                grams = (parseFloat((val || "").toString().replace(",", ".")) || 0) * 1000;
              }
              setComprarManual((prev) => ({ ...prev, [item.id]: grams }));
            };
            return (
              <Card
                key={item.id}
                className={`p-3 flex items-center gap-2 flex-wrap transition-opacity ${jaTenho[item.id] ? "opacity-40" : ""}`}
              >
                <Checkbox
                  checked={!!jaTenho[item.id]}
                  onCheckedChange={(v) => setJaTenho({ ...jaTenho, [item.id]: v })}
                />
                <p className={`flex-1 min-w-[100px] text-sm font-medium ${jaTenho[item.id] ? "line-through" : ""} ${item.naoEncontrado ? "text-orange-600 italic" : ""}`}>
                  {item.nome}
                </p>
                <div className="flex items-center gap-1 shrink-0 bg-primary/5 border border-primary/20 rounded-md px-2 py-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Comprar</span>
                  <Input
                    type="number"
                    step={usarUnidades ? "1" : "0.01"}
                    value={inputVal}
                    onChange={(e) => handleComprar(e.target.value)}
                    className="w-20 h-7 text-sm text-center tabular-nums border-none bg-transparent focus-visible:ring-0"
                  />
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </div>
                <span className="text-sm font-semibold text-primary shrink-0 tabular-nums">{formatCurrency(comprarCusto)}</span>
              </Card>
            );
          })}
        </div>
      )}

      {/* Total */}
      <Card className="p-4 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total da compra</span>
          <span className="text-xl font-bold">{formatCurrency(totalGeral)}</span>
        </div>
      </Card>
    </div>
  );
}