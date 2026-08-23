// Lista de compras do fluxo de EVENTO (Planejamento) — acessada via /lista-compras?planejamento=ID.
// Fluxo próprio preservado; dados comerciais são pessoais e o FC respeita a receita.
import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Trash2, Share2, ChefHat, ArrowLeft, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import BuscaReceitaDialog from "@/components/receita/BuscaReceitaDialog";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { useAuth } from "@/lib/AuthContext";
import { buscarPrecosPersonalizados, aplicarPrecosPersonalizados } from "@/lib/precoIngredienteCliente";
import {
  buscarPreferenciasIngredientes,
  aplicarPreferenciasIngredientes,
} from "@/lib/preferenciaIngredienteUsuario";
import { calcularItemIngredienteReceita, itemParticipaCompra } from "@/lib/ingredienteReceitaCalc";
import { consoleErrorSeguro } from "@/lib/securityHardening";

const CATEGORIAS_COMPRA = {
  "Carnes e Ovos": "Carnes",
  "Verduras e Hortaliças": "Hortifruti",
  "TEMPEROS": "Temperos",
  "LATICÍNIOS": "Laticínios",
  "Panificação e Cereais": "Mercearia",
  "ENLATADOS": "Mercearia",
  "Açúcares e Doces": "Mercearia",
  "DIVERSOS": "Diversos",
};

export default function EventoListaCompras() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [jaTemho, setJaTenho] = useState({});
  const [showAddReceita, setShowAddReceita] = useState(false);
  const [selectedReceitas, setSelectedReceitas] = useState([]);
  const [porcoesPorReceita, setPorcoesPorReceita] = useState({});
  const [comprarManual, setComprarManual] = useState({});
  const [margemSeguranca, setMargemSeguranca] = useState(0);
  const [planejamentoOrigem, setPlanejamentoOrigem] = useState(null);
  const [docesBebidas, setDocesBebidas] = useState([]);
  const [totalPessoasEvento, setTotalPessoasEvento] = useState(0);
  const [margemEventoPct, setMargemEventoPct] = useState(0);

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-updated_date"),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const { data: precosPersonalizados = {} } = useQuery({
    queryKey: ["precos-personalizados", user?.id],
    queryFn: () => buscarPrecosPersonalizados(user.id),
    enabled: !isAdmin && !!user?.id,
  });

  const { data: preferenciasIngredientes = {} } = useQuery({
    queryKey: ["preferencias-ingredientes", user?.id],
    queryFn: () => buscarPreferenciasIngredientes(user.id),
    enabled: !!user?.id,
  });

  const ingredientesEfetivos = useMemo(() => {
    const comPrecoLegado = isAdmin
      ? ingredientesDB
      : aplicarPrecosPersonalizados(ingredientesDB, precosPersonalizados);
    return aplicarPreferenciasIngredientes(
      comPrecoLegado,
      preferenciasIngredientes,
      { usarFavoritoLegado: isAdmin }
    );
  }, [ingredientesDB, isAdmin, precosPersonalizados, preferenciasIngredientes]);

  const { data: allItens = [] } = useQuery({
    queryKey: ["ingredientesReceitaTodos"],
    queryFn: () => fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
  });

  const { data: allReceitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const receitaId = params.get("receita");
    const porcoes = parseInt(params.get("porcoes")) || null;
    const planejamentoId = params.get("planejamento");

    if (receitaId && !selectedReceitas.includes(receitaId)) {
      setSelectedReceitas([receitaId]);
      if (porcoes) setPorcoesPorReceita({ [receitaId]: porcoes });
    }

    if (planejamentoId) {
      setPlanejamentoOrigem(planejamentoId);
      base44.entities.Planejamento.get(planejamentoId).then(p => {
        setTotalPessoasEvento(p.total_pessoas || 0);
        setMargemEventoPct(p.margem_seguranca_evento_pct || 0);
        if (!p?.cardapio_config) return;
        try {
          const config = typeof p.cardapio_config === "string"
            ? JSON.parse(p.cardapio_config)
            : p.cardapio_config;
          const recs = [];
          const porc = {};
          (config.grupos || []).forEach(g => {
            (g.itens || []).forEach(item => {
              if (!recs.includes(item.receita_id)) {
                recs.push(item.receita_id);
                porc[item.receita_id] = item.porcoes || Math.round((item.qtd_kg || 0) * 1000 / (item.pc_g || 200));
              }
            });
          });
          setSelectedReceitas(recs);
          setPorcoesPorReceita(porc);
          setDocesBebidas(config.doces_bebidas || []);
        } catch (e) { consoleErrorSeguro("Erro ao carregar cardápio", e); }
      }).catch(e => consoleErrorSeguro("Erro ao carregar planejamento", e));
    }
  }, []);

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesEfetivos.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesEfetivos]);

  const receitaMap = useMemo(() => {
    const map = {};
    receitas.forEach((r) => { map[r.id] = r; });
    allReceitas.forEach((r) => { map[r.id] = r; });
    return map;
  }, [receitas, allReceitas]);

  // Build shopping list (including sub-receita ingredients)
  const listaItems = useMemo(() => {
    const totals = {};
    const addIngredient = (ingredienteId, nome, categoria, extra, itemReceita) => {
      if (!itemParticipaCompra(itemReceita)) return;
      const ing = ingMap[ingredienteId];
      if (!ing) return;
      const calculado = calcularItemIngredienteReceita({
        item: itemReceita,
        ingrediente: ing,
        quantidadeLiquida: extra.qtd,
      });
      const qtd = calculado.pesoBruto;
      const custo = calculado.custo;
      const key = `${ingredienteId}_${extra.origem || ""}`;
      const displayNome = extra.origem ? `${nome} · ${extra.origem}` : nome;
      if (totals[key]) {
        totals[key].quantidade += qtd;
        totals[key].peso_liquido += calculado.pesoLiquido;
        totals[key].custo += custo;
        if (extra.origem && !totals[key].origem) totals[key].origem = extra.origem;
      } else {
        totals[key] = {
          ingrediente_id: ingredienteId,
          nome: displayNome,
          categoria: CATEGORIAS_COMPRA[ing.categoria] || "Diversos",
          categoriaOriginal: ing.categoria,
          quantidade: qtd,
          peso_liquido: calculado.pesoLiquido,
          fc: calculado.fc,
          fcOrigem: calculado.fcOrigem,
          unidade_compra: ing.unidade_compra,
          peso_embalagem_g: ing.peso_embalagem_g,
          preco_por_g: ing.preco_por_g_rs || 0,
          custo,
          origem: extra.origem || null,
        };
      }
    };

    selectedReceitas.forEach((recId) => {
      const receita = receitaMap[recId];
      if (!receita) return;
      const porcoes = porcoesPorReceita[recId] || receita.porcoes_base || 1;
      const itens = allItens.filter((i) => i.receita_id === recId);
      itens.forEach((item) => {
        if (item.tipo === "grupo") return;
        if (item.tipo === "subreceita") {
          const subRec = receitaMap[item.subreceita_id];
          if (!subRec) return;
          const subFator = porcoes / (receita.porcoes_base || 1);
          const subQtd = (item.quantidade_por_porcao || 0) * porcoes;
          const subItens = allItens.filter((i) => i.receita_id === item.subreceita_id);
          subItens.forEach((si) => {
            if (si.tipo !== "ingrediente") return;
            const siQtd = (si.quantidade_por_porcao || 0) * (subRec.porcoes_base || 1);
            const scaleFactor = subRec.rendimento_total > 0 ? subQtd / subRec.rendimento_total : subFator;
            addIngredient(si.ingrediente_id, ingMap[si.ingrediente_id]?.nome || si.ingrediente_nome, null, {
              qtd: siQtd * scaleFactor,
              origem: `do ${subRec.nome}`,
            }, si);
          });
        } else {
          addIngredient(item.ingrediente_id, ingMap[item.ingrediente_id]?.nome || item.ingrediente_nome, null, {
            qtd: item.quantidade_por_porcao * porcoes,
          }, item);
        }
      });
    });
    return Object.values(totals).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  }, [selectedReceitas, porcoesPorReceita, allItens, ingMap, receitaMap]);

  const getItemKey = (item) => `${item.ingrediente_id}_${item.origem || ""}`;
  const getComprarQtd = (item) => {
    const key = getItemKey(item);
    if (comprarManual[key] != null) return comprarManual[key];
    return item.quantidade * (1 + margemSeguranca / 100);
  };

  const getComprarCusto = (item) => getComprarQtd(item) * (item.preco_por_g || 0);

  const grouped = {};
  listaItems.forEach((item) => {
    if (!grouped[item.categoria]) grouped[item.categoria] = [];
    grouped[item.categoria].push(item);
  });

  const totalGeral = listaItems.filter(i => !jaTemho[i.ingrediente_id]).reduce((s, i) => s + getComprarCusto(i), 0);

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
          text += `  • ${item.nome} — ${formatQuantidade({...item, quantidade: getComprarQtd(item)})} — ${formatCurrency(getComprarCusto(item))}\n`;
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
        <div className="flex items-center gap-3">
          {planejamentoOrigem && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/cardapios")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao evento
            </Button>
          )}
          <h1 className="font-display text-2xl font-bold">Lista de Compras</h1>
        </div>
        <Button size="sm" onClick={() => setShowAddReceita(true)}>
          <Plus className="w-4 h-4 mr-1" /> Receita
        </Button>
      </div>

      {listaItems.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 flex-wrap">
          <Label className="text-sm font-medium shrink-0">Margem de segurança</Label>
          <Input type="number" min="0" max="100" value={margemSeguranca}
            onChange={e => setMargemSeguranca(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            className="w-16 h-8 text-center tabular-nums" />
          <span className="text-sm text-muted-foreground">%</span>
          {margemSeguranca > 0 && (
            <span className="text-xs text-muted-foreground">
              Quantidades ajustadas com +{margemSeguranca}%
            </span>
          )}
          {planejamentoOrigem && (
            <span className="text-xs text-muted-foreground w-full">
              Quantidades já incluem {margemEventoPct}% de margem do evento.
            </span>
          )}
          {Object.keys(comprarManual).length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto gap-1"
              onClick={() => setComprarManual({})}>
              <RotateCcw className="w-3.5 h-3.5" /> Resetar edições
            </Button>
          )}
        </div>
      )}

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
                {grouped[cat].map((item) => {
                  const isContagem = UNIDADES_CONTAGEM.includes(item.unidade_compra?.toUpperCase());
                  const hasEmbalagem = item.peso_embalagem_g > 0;
                  const usarUnidades = isContagem && hasEmbalagem;
                  const comprarQtd = getComprarQtd(item);
                  const comprarCusto = getComprarCusto(item);
                  const inputVal = usarUnidades
                    ? Math.ceil(comprarQtd / item.peso_embalagem_g)
                    : (comprarQtd / 1000).toFixed(2);
                  const unit = usarUnidades ? "un" : "kg";
                  const handleComprar = (val) => {
                    const key = getItemKey(item);
                    let grams;
                    if (usarUnidades) {
                      grams = (parseInt(val) || 0) * item.peso_embalagem_g;
                    } else {
                      grams = (parseFloat((val || "").toString().replace(",", ".")) || 0) * 1000;
                    }
                    setComprarManual(prev => ({ ...prev, [key]: grams }));
                  };
                  return (
                    <Card
                      key={getItemKey(item)}
                      className={`p-3 flex items-center gap-2 flex-wrap transition-opacity ${jaTemho[item.ingrediente_id] ? "opacity-40" : ""}`}
                    >
                      <Checkbox
                        checked={!!jaTemho[item.ingrediente_id]}
                        onCheckedChange={(v) => setJaTenho({ ...jaTemho, [item.ingrediente_id]: v })}
                      />
                      <div className="flex-1 min-w-[100px]">
                        <p className={`text-sm font-medium ${jaTemho[item.ingrediente_id] ? "line-through" : ""}`}>
                          {item.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">Base: {formatQuantidade(item)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-primary/5 border border-primary/20 rounded-md px-2 py-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Comprar</span>
                        <Input type="number" step={usarUnidades ? "1" : "0.01"} value={inputVal}
                          onChange={e => handleComprar(e.target.value)}
                          className="w-20 h-7 text-sm text-center tabular-nums border-none bg-transparent focus-visible:ring-0" />
                        <span className="text-xs text-muted-foreground">{unit}</span>
                      </div>
                      <span className="text-sm font-semibold text-primary shrink-0 tabular-nums">{formatCurrency(comprarCusto)}</span>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          <Card className="p-4 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total da compra</span>
              <span className="text-xl font-bold">{formatCurrency(totalGeral)}</span>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" /> Compartilhar
            </Button>
          </div>
        </>
      )}

      {docesBebidas.length > 0 && totalPessoasEvento > 0 && (
        <div>
          <Badge variant="secondary" className="mb-2 bg-purple-100 text-purple-700">Doces & Bebidas</Badge>
          <div className="space-y-1">
            {docesBebidas.map((item, i) => {
              const total = totalPessoasEvento * (item.percentual || 0) / 100 * (item.media || 0);
              let qtdStr;
              if (item.unidade === "ml") qtdStr = (total / 1000).toFixed(1).replace(".", ",") + " L";
              else if (item.unidade === "un") qtdStr = Math.ceil(total) + " un";
              else qtdStr = (total / 1000).toFixed(1).replace(".", ",") + " kg";
              return (
                <Card key={i} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.percentual != null ? item.percentual + "%" : "—"} · {item.media != null ? item.media + " " + item.unidade : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-purple-700">{qtdStr}</p>
                    {item.custo_manual > 0 && (
                      <p className="text-xs text-muted-foreground">R$ {item.custo_manual.toFixed(2).replace(".", ",")}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <BuscaReceitaDialog
        open={showAddReceita}
        onClose={() => setShowAddReceita(false)}
        onSelect={(r) => {
          setSelectedReceitas([...selectedReceitas, r.id]);
          setPorcoesPorReceita({ ...porcoesPorReceita, [r.id]: r.porcoes_base || 4 });
          setShowAddReceita(false);
        }}
        excludeIds={selectedReceitas}
        title="Adicionar Receita à Lista"
      />
    </div>
  );
}
