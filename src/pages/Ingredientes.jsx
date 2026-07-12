import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Upload, ChevronDown, Settings2, AlertTriangle, RefreshCw, Clock, History, Star, LayoutGrid, FileText, ShoppingCart, Power, Tags } from "lucide-react";
import { toast } from "sonner";
import { buscarIngredientesRanqueado } from "@/lib/normalizarNome";
import CalculadoraCusto from "@/components/CalculadoraCusto";
import AtualizarPrecosDialog from "@/components/ingrediente/AtualizarPrecosDialog";
import HistoricoAtualizacoesDialog from "@/components/ingrediente/HistoricoAtualizacoesDialog";
import ExcluirIngredienteDialog from "@/components/ingrediente/ExcluirIngredienteDialog";
import { exportarIngredientesPDF } from "@/lib/exportarIngredientesPDF";
import ListaIngredientes from "@/components/ingrediente/ListaIngredientes";
import ImportarSinonimosDialog from "@/components/ingrediente/ImportarSinonimosDialog";
import SinonimosSection from "@/components/ingrediente/SinonimosSection";

const GRUPOS_INGREDIENTES = [
  { nome: "Carnes e Ovos",            icone: "🥩", cor: "#FFEBEE", corTexto: "#C62828", corPill: "#FFCDD2", corPillTexto: "#B71C1C", match: ["Carnes e Ovos"] },
  { nome: "Peixes e Frutos do Mar",   icone: "🐟", cor: "#E3F2FD", corTexto: "#1565C0", corPill: "#BBDEFB", corPillTexto: "#0D47A1", match: ["Peixes e Frutos do Mar"] },
  { nome: "Laticínios",               icone: "🥛", cor: "#F3E5F5", corTexto: "#6A1B9A", corPill: "#E1BEE7", corPillTexto: "#4A148C", match: ["Laticínios"] },
  { nome: "Panificação e Cereais",    icone: "🌾", cor: "#EFEBE9", corTexto: "#4E342E", corPill: "#D7CCC8", corPillTexto: "#3E2723", match: ["Panificação e Cereais"] },
  { nome: "Verduras e Hortaliças",    icone: "🥦", cor: "#F1F8E9", corTexto: "#558B2F", corPill: "#DCEDC8", corPillTexto: "#33691E", match: ["Verduras e Hortaliças"] },
  { nome: "Açúcares e Doces",         icone: "🍬", cor: "#FCE4EC", corTexto: "#AD1457", corPill: "#F8BBD0", corPillTexto: "#880E4F", match: ["Açúcares e Doces"] },
  { nome: "Óleos e Gorduras",         icone: "🫒", cor: "#FFFDE7", corTexto: "#F9A825", corPill: "#FFF176", corPillTexto: "#F57F17", match: ["Óleos e Gorduras"] },
  { nome: "Temperos",                 icone: "🌶️", cor: "#FBE9E7", corTexto: "#BF360C", corPill: "#FFCCBC", corPillTexto: "#A3150B", match: ["Temperos"] },
  { nome: "Frutas",                   icone: "🍎", cor: "#FCE4EC", corTexto: "#880E4F", corPill: "#F8BBD0", corPillTexto: "#880E4F", match: ["Frutas"] },
  { nome: "Conservas e Enlatados",    icone: "🥫", cor: "#FFF9C4", corTexto: "#F57F17", corPill: "#FFF176", corPillTexto: "#E65100", match: ["Conservas e Enlatados"] },
  { nome: "Diversos",                 icone: "📦", cor: "#F5F5F5", corTexto: "#424242", corPill: "#E0E0E0", corPillTexto: "#212121", match: ["Diversos"] },
  { nome: "A Revisar",                icone: "⚠️", cor: "#FFF8E1", corTexto: "#F57F17", corPill: "#FFE082", corPillTexto: "#E65100", match: ["A Revisar"] },
];

const getGrupoFromCategoria = (cat) => {
  if (!cat) return "A Revisar";
  for (const g of GRUPOS_INGREDIENTES) {
    if (g.match.includes(cat)) return g.nome;
  }
  return "Diversos";
};

export default function Ingredientes() {
  const [busca, setBusca] = useState("");
  const [accordionAberto, setAccordionAberto] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportSinonimos, setShowImportSinonimos] = useState(false);
  const [showRevisar, setShowRevisar] = useState(false);
  const [showDesatualizados, setShowDesatualizados] = useState(false);
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [showAtualizarPrecos, setShowAtualizarPrecos] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [buscaInterna, setBuscaInterna] = useState("");
  const [autoUpdateAtiva, setAutoUpdateAtiva] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: ultimoLog } = useQuery({
    queryKey: ["ultimo-log-precos"],
    queryFn: async () => {
      const logs = await base44.entities.LogAtualizacaoPrecos.filter({ tipo: "automático" }, "-data_execucao", 1);
      return logs[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: autoUpdateStatus } = useQuery({
    queryKey: ["auto-update-status"],
    queryFn: async () => {
      const res = await base44.functions.invoke("gerenciarAtualizacaoAutomatica", { acao: "status" });
      return res.data;
    },
  });

  useEffect(() => {
    if (autoUpdateStatus) setAutoUpdateAtiva(autoUpdateStatus.ativa);
  }, [autoUpdateStatus]);

  const { data: historicoLogs = [] } = useQuery({
    queryKey: ["historico-log-precos"],
    queryFn: () => base44.entities.LogAtualizacaoPrecos.filter({ tipo: "automático" }, "-data_execucao", 10),
    enabled: showHistorico,
  });

  const saveMut = useMutation({
    mutationFn: async (data) => {
      const preco_por_g = data.peso_embalagem_g > 0
        ? data.preco_embalagem_rs / data.peso_embalagem_g
        : 0;
      const payload = { ...data, preco_por_g_rs: preco_por_g };

      if (data.id) {
        const { id, created_date, updated_date, created_by_id, ...rest } = payload;

        // Record price history if price changed
        if (data.preco_embalagem_rs !== data._preco_anterior || data.peso_embalagem_g !== data._peso_anterior) {
          const precoAnteriorPorKg = (data._preco_anterior && data._peso_anterior > 0)
            ? parseFloat(((data._preco_anterior / data._peso_anterior) * 1000).toFixed(2))
            : 0;
          const precoNovaPorKg = preco_por_g * 1000;
          const variacao = precoAnteriorPorKg > 0
            ? parseFloat((((precoNovaPorKg - precoAnteriorPorKg) / precoAnteriorPorKg) * 100).toFixed(1))
            : 0;
          const historico = [...(data.historico_precos || [])];
          historico.unshift({
            data: new Date().toISOString(),
            preco_por_kg: parseFloat(precoNovaPorKg.toFixed(2)),
            variacao_percentual: variacao,
            fonte: data.fonte_preco || "Manual"
          });
          rest.historico_precos = historico.slice(0, 5);
          rest.preco_atualizado_em = new Date().toISOString();
          rest.fonte_preco = rest.fonte_preco || "Manual";
          rest.variacao_percentual = variacao;
        }

        delete rest._preco_anterior;
        delete rest._peso_anterior;
        return base44.entities.Ingrediente.update(id, rest);
      }
      if (preco_por_g > 0) {
        payload.preco_atualizado_em = new Date().toISOString();
        payload.fonte_preco = "Manual";
      }
      const existing = await base44.entities.Ingrediente.filter({ nome: data.nome });
      if (existing.length > 0) {
        payload.revisar = true;
        toast.warning("Ingrediente duplicado — marcado para revisão");
      }
      return base44.entities.Ingrediente.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      setShowForm(false);
      setEditItem(null);
      toast.success("Ingrediente salvo!");
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => base44.entities.Ingrediente.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success("Ingrediente excluído!");
    },
  });

  const favoritarMut = useMutation({
    mutationFn: async ({ id, favorito }) => {
      await base44.entities.Ingrediente.update(id, { favorito });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
    },
  });

  const handleToggleAutoUpdate = async () => {
    setTogglingAuto(true);
    try {
      const res = await base44.functions.invoke("gerenciarAtualizacaoAutomatica", { acao: "toggle" });
      setAutoUpdateAtiva(res.data?.ativa || false);
      toast.success(res.data?.ativa ? "Atualização automática ATIVADA" : "Atualização automática PAUSADA");
    } catch (err) {
      toast.error("Erro ao alterar: " + (err.message || ""));
    } finally {
      setTogglingAuto(false);
    }
  };

  // Helpers for price freshness
  const diasDesdeAtualizacao = (ing) => {
    if (!ing.preco_atualizado_em) return null;
    const atualizado = new Date(ing.preco_atualizado_em);
    const agora = new Date();
    return Math.floor((agora - atualizado) / (1000 * 60 * 60 * 24));
  };

  const isDesatualizado = (ing) => {
    if (ing.preco_por_g_rs <= 0 || ing.preco_embalagem_rs <= 0) return false;
    const dias = diasDesdeAtualizacao(ing);
    return dias === null || dias > 90;
  };

  const filtered = useMemo(() => {
    if (showDesatualizados) return ingredientes.filter(i => isDesatualizado(i));
    if (showRevisar) return ingredientes.filter(i => i.revisar === true);
    if (showFavoritos) return ingredientes.filter(i => i.favorito === true);
    if (!busca && !accordionAberto) return ingredientes;
    let result = ingredientes;
    if (busca) {
      result = buscarIngredientesRanqueado(busca, result, 500);
    }
    if (accordionAberto) {
      result = result.filter(i => getGrupoFromCategoria(i.categoria) === accordionAberto);
    }
    return result;
  }, [ingredientes, showDesatualizados, showRevisar, showFavoritos, busca, accordionAberto]);

  const countDesatualizados = useMemo(() => ingredientes.filter(i => isDesatualizado(i)).length, [ingredientes]);

  const formatPrice = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—";

  const isWeightUnit = (u) => ["G", "KG"].includes(u?.toUpperCase());
  const isLiquidUnit = (u) => ["ML", "LT"].includes(u?.toUpperCase());
  const isPackageUnit = (u) => ["UN", "BANDEJA", "CX", "POTE", "VIDRO", "BALDE", "MOLHO", "PC"].includes(u?.toUpperCase());

  const formatWeightStr = (g, unit) => {
    const u = unit?.toUpperCase();
    if (isWeightUnit(u)) {
      return g >= 1000 ? `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1).replace(".", ",")} kg` : `${g} g`;
    }
    if (isLiquidUnit(u)) {
      return g >= 1000 ? `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1).replace(".", ",")} L` : `${g} ml`;
    }
    return `${g} g`;
  };

  const formatIngredientPrice = (ing) => {
    const pricePerKg = (ing.preco_por_g_rs || 0) * 1000;
    const u = ing.unidade_compra?.toUpperCase();
    const peso = ing.peso_embalagem_g || 0;
    const precoEmb = ing.preco_embalagem_rs || 0;

    if (isWeightUnit(u)) {
      return `${formatPrice(pricePerKg)}/kg · embalagem ${formatWeightStr(peso, u)}`;
    }
    if (isLiquidUnit(u)) {
      return `${formatPrice(pricePerKg)}/L · embalagem ${formatWeightStr(peso, u)}`;
    }
    if (isPackageUnit(u)) {
      return `${formatPrice(precoEmb)}/${u.toLowerCase()} (${peso} g) · ${formatPrice(pricePerKg)}/kg`;
    }
    return `${formatPrice(pricePerKg)}/kg · embalagem ${peso}g`;
  };

  // Total count
  const totalIngredientes = ingredientes.length;

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Ingredientes e Preços <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{totalIngredientes}</Badge></h1>
          <p className="text-xs text-muted-foreground mt-0.5">Preços por kg ou litro · itens por unidade mostram o preço da embalagem</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowAtualizarPrecos(true)}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar preços
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportarIngredientesPDF(ingredientes)}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/lista-compras")}>
            <ShoppingCart className="w-4 h-4 mr-1" /> Reposição
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportSinonimos(true)}>
            <Tags className="w-4 h-4 mr-1" /> Sinônimos
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Status da atualização automática */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => setShowHistorico(true)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <History className="w-3 h-3" />
          {ultimoLog ? (
            <>
              Última execução:{" "}
              {new Date(ultimoLog.data_execucao).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
              {" "}às{" "}
              {new Date(ultimoLog.data_execucao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              {" · "}{ultimoLog.total_atualizado} ingredientes atualizados
            </>
          ) : (
            "Atualização automática: toda segunda às 3h · Ainda não executada"
          )}
          <span className="underline ml-0.5">Ver histórico</span>
        </button>
        <button
          onClick={handleToggleAutoUpdate}
          disabled={togglingAuto}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            autoUpdateAtiva
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {autoUpdateAtiva ? "ATIVA" : "PAUSADA"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setAccordionAberto(null); }}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFavoritos ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowFavoritos(!showFavoritos); setShowRevisar(false); setShowDesatualizados(false); setAccordionAberto(null); setBusca(""); }}
          className={showFavoritos ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          <Star className={`w-4 h-4 mr-1 ${showFavoritos ? "fill-white" : ""}`} />
          Favoritos
        </Button>
        <Button
          variant={showDesatualizados ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowDesatualizados(!showDesatualizados); setShowRevisar(false); setShowFavoritos(false); setAccordionAberto(null); setBusca(""); }}
          className={showDesatualizados ? "bg-red-600 hover:bg-red-700" : ""}
        >
          <Clock className="w-4 h-4 mr-1" />
          Desatualizados
        </Button>
        <Button
          variant={showRevisar ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowRevisar(!showRevisar); setShowDesatualizados(false); setShowFavoritos(false); setAccordionAberto(null); setBusca(""); }}
          className={showRevisar ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Revisar
        </Button>
      </div>

      {/* Stale price alert banner */}
      {!showDesatualizados && countDesatualizados > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">
              <strong>{countDesatualizados} ingredientes</strong> com preço desatualizado (90+ dias). Atualizar agora?
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 shrink-0" onClick={() => setShowAtualizarPrecos(true)}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        </div>
      )}

      {/* Todas as categorias button */}
      <button
        onClick={() => { setAccordionAberto(null); setBusca(""); setShowRevisar(false); setShowDesatualizados(false); setShowFavoritos(false); }}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border-2 ${
          !accordionAberto && !showDesatualizados && !showRevisar && !showFavoritos
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent bg-muted hover:bg-accent text-muted-foreground"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        Todas as categorias
        <Badge className="text-[10px] bg-primary/20 text-primary">{totalIngredientes}</Badge>
      </button>

      {/* Accordion grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
            {GRUPOS_INGREDIENTES.map((g) => {
              const count = ingredientes.filter(i => getGrupoFromCategoria(i.categoria) === g.nome).length;
              const aberto = accordionAberto === g.nome;
              return (
                <div
                  key={g.nome}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{
                    backgroundColor: g.cor,
                    border: aberto ? `2px solid ${g.corTexto}` : "1px solid hsl(var(--border))",
                  }}
                >
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:brightness-95"
                    style={{ backgroundColor: g.cor, color: g.corTexto }}
                    onClick={() => {
                      setAccordionAberto(aberto ? null : g.nome);
                      setBuscaInterna("");
                    }}
                  >
                    <span className="text-lg">{g.icone}</span>
                    <span className="flex-1 text-sm font-semibold">{g.nome}</span>
                    <Badge
                      className="text-[10px] h-5 px-1.5 font-bold border-0"
                      style={{ backgroundColor: g.corPill, color: g.corPillTexto }}
                    >
                      {count}
                    </Badge>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                      style={{ opacity: aberto ? 1 : 0.5 }}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Listagem compacta abaixo do grid */}
          <ListaIngredientes
            ingredientes={filtered}
            accordionAberto={accordionAberto}
            buscaInterna={buscaInterna}
            setBuscaInterna={setBuscaInterna}
            diasDesdeAtualizacao={diasDesdeAtualizacao}
            formatIngredientPrice={formatIngredientPrice}
            favoritarMut={favoritarMut}
            onDeleteComplete={() => qc.invalidateQueries({ queryKey: ["ingredientes"] })}
            setEditItem={setEditItem}
            setShowForm={setShowForm}
          />
        </>
      )}

      {/* Form Dialog */}
      <IngredienteForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        item={editItem}
        onSave={(data) => saveMut.mutate(data)}
        saving={saveMut.isPending}
      />

      {/* Import Dialog */}
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />

      {/* Import Sinônimos Dialog */}
      <ImportarSinonimosDialog open={showImportSinonimos} onClose={() => setShowImportSinonimos(false)} />

      {/* Update Prices Dialog */}
      <AtualizarPrecosDialog open={showAtualizarPrecos} onClose={() => setShowAtualizarPrecos(false)} ingredientes={ingredientes} />

      {/* Histórico de atualizações automáticas */}
      <HistoricoAtualizacoesDialog
        open={showHistorico}
        onClose={() => setShowHistorico(false)}
        logs={historicoLogs}
      />
    </div>
  );
}

function IngredienteForm({ open, onClose, item, onSave, saving }) {
  const [form, setForm] = useState({});

  const resetForm = () => {
    if (item) {
      setForm({ ...item, _preco_anterior: item.preco_embalagem_rs, _peso_anterior: item.peso_embalagem_g });
    } else {
      setForm({ categoria: "A Revisar", nome: "", unidade_compra: "KG", peso_embalagem_g: 1000, preco_embalagem_rs: 0, fator_correcao: 1.0 });
    }
  };

  const handleSave = () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome do ingrediente"); return; }
    onSave(form);
  };

  const formatCurrency = (v) => v != null ? "R$ " + v.toFixed(2).replace(".", ",") : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else resetForm(); }}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => { e.preventDefault(); resetForm(); }}>
        <DialogHeader>
          <DialogTitle className="font-display">{item ? "Editar Ingrediente" : "Novo Ingrediente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria || "A Revisar"} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Carnes e Ovos", "Verduras e Hortaliças", "Temperos", "Laticínios", "Panificação e Cereais", "Conservas e Enlatados", "Açúcares e Doces", "Diversos", "A Revisar", "Peixes e Frutos do Mar", "Frutas", "Óleos e Gorduras"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade de compra</Label>
            <Input value={form.unidade_compra || ""} onChange={(e) => setForm({ ...form, unidade_compra: e.target.value })} placeholder="KG, LT, UN..." />
          </div>
          <div>
            <Label>Fator de correção</Label>
            <Input type="number" step="0.01" value={form.fator_correcao ?? 1.0} onChange={(e) => setForm({ ...form, fator_correcao: parseFloat(e.target.value) || 1.0 })} />
            <p className="text-xs text-muted-foreground mt-1">Padrão: 1.0. Ajuste para ingredientes com perda (cascas, ossos, etc.)</p>
          </div>
          <CalculadoraCusto
            initialQuantidade={form.peso_embalagem_g || ""}
            initialPrecoTotal={form.preco_embalagem_rs || ""}
            onChange={({ peso_embalagem_g, preco_embalagem_rs }) => setForm({ ...form, peso_embalagem_g, preco_embalagem_rs })}
          />
          {/* Price history */}
          {item && (item.historico_precos || []).length > 0 && (
            <div>
              <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Histórico de preços</Label>
              <div className="mt-2 space-y-1.5">
                {(item.historico_precos || []).slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded p-1.5">
                    <span className="text-muted-foreground">{new Date(h.data).toLocaleDateString("pt-BR")}</span>
                    <span className="font-medium">{formatCurrency(h.preco_por_kg)}/kg</span>
                    <span className={h.variacao_percentual > 0 ? "text-red-600" : h.variacao_percentual < 0 ? "text-green-600" : "text-gray-400"}>
                      {h.variacao_percentual > 0 ? "+" : ""}{h.variacao_percentual}%
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{h.fonte}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Sinônimos */}
          {item?.id && <SinonimosSection ingredienteId={item.id} />}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const qc = useQueryClient();

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              categoria: { type: "string" },
              nome: { type: "string" },
              unidade_compra: { type: "string" },
              peso_embalagem_g: { type: "number" },
              preco_embalagem_rs: { type: "number" },
              preco_por_g_rs: { type: "number" },
              fator_correcao: { type: "number" }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const items = Array.isArray(result.output) ? result.output : (result.output.items || []);
        const existing = await base44.entities.Ingrediente.list("-nome", 500);
        const existingMap = {};
        existing.forEach((e) => { existingMap[e.nome?.toLowerCase()] = e; });

        let created = 0, updated = 0;
        for (const item of items) {
          if (!item.nome) continue;
          const preco_por_g = item.peso_embalagem_g > 0
            ? (item.preco_embalagem_rs || 0) / item.peso_embalagem_g
            : (item.preco_por_g_rs || 0);
          const payload = {
            ...item,
            preco_por_g_rs: preco_por_g,
            fator_correcao: item.fator_correcao || 1.0
          };
          if (preco_por_g > 0) {
            payload.preco_atualizado_em = new Date().toISOString();
            payload.fonte_preco = "Manual";
          }
          const existingItem = existingMap[item.nome.toLowerCase()];
          if (existingItem) {
            const { id, created_date, updated_date, created_by_id, nome, ...rest } = payload;
            await base44.entities.Ingrediente.update(existingItem.id, { ...rest, revisar: true });
            updated++;
          } else {
            await base44.entities.Ingrediente.create({ ...payload, revisar: false });
            created++;
          }
        }
        toast.success(`Importação concluída! ${created} criados, ${updated} atualizados.`);
        qc.invalidateQueries({ queryKey: ["ingredientes"] });
        onClose();
      } else {
        toast.error("Erro ao processar arquivo: " + (result.details || "formato inválido"));
      }
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Importar CSV</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo CSV com as colunas: categoria, nome, unidade_compra, peso_embalagem_g, preco_embalagem_rs, preco_por_g_rs, fator_correcao
        </p>
        <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Importando..." : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}