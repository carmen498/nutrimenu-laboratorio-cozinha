import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Upload, AlertTriangle, RefreshCw, History, Star, FileText, ShoppingCart, Tags, Download, MoreHorizontal, Clock } from "lucide-react";
import { toast } from "sonner";
import { buscarIngredientesRanqueado } from "@/lib/normalizarNome";
import AtualizarPrecosDialog from "@/components/ingrediente/AtualizarPrecosDialog";
import HistoricoAtualizacoesDialog from "@/components/ingrediente/HistoricoAtualizacoesDialog";
import { exportarIngredientesPDF } from "@/lib/exportarIngredientesPDF";
import { downloadCsv } from "@/lib/exportCsv";
import ListaIngredientes from "@/components/ingrediente/ListaIngredientes";
import ImportarSinonimosDialog from "@/components/ingrediente/ImportarSinonimosDialog";
import ImportarIngredientesDialog from "@/components/ingrediente/ImportarIngredientesDialog";
import RelatorioLotePrecosDialog from "@/components/ingrediente/RelatorioLotePrecosDialog";
import IngredienteFormDialog from "@/components/ingrediente/IngredienteFormDialog";
import { useSalvarIngrediente } from "@/lib/useSalvarIngrediente";
import { fetchAllPages } from "@/lib/fetchAllPages";

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
  const [addingCarrinhoId, setAddingCarrinhoId] = useState(null);
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
  const [showRelatorioLote, setShowRelatorioLote] = useState(false);
  const [buscaInterna, setBuscaInterna] = useState("");
  const [autoUpdateAtiva, setAutoUpdateAtiva] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    if (searchParams.get("revisar") === "true") {
      setShowRevisar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
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

  const saveMut = useSalvarIngrediente(() => {
    setShowForm(false);
    setEditItem(null);
  });

  const fornecedorSuggestions = useMemo(() => {
    const set = new Set();
    ingredientes.forEach((i) => { if (i.fornecedor?.trim()) set.add(i.fornecedor.trim()); });
    return [...set].sort();
  }, [ingredientes]);

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

  const handleAddToCarrinho = async (ing) => {
    if (addingCarrinhoId) return;
    setAddingCarrinhoId(ing.id);
    try {
      const existentes = await base44.entities.CarrinhoItem.filter({ ingrediente_id: ing.id });
      if (existentes[0]) {
        await base44.entities.CarrinhoItem.update(existentes[0].id, {
          quantidade_embalagens: (existentes[0].quantidade_embalagens || 0) + 1,
        });
      } else {
        await base44.entities.CarrinhoItem.create({
          ingrediente_id: ing.id,
          ingrediente_nome: ing.nome,
          quantidade_embalagens: 1,
          comprado: false,
        });
      }
      qc.invalidateQueries({ queryKey: ["carrinho-itens"] });
      toast.success(`${ing.nome} adicionado ao carrinho`);
    } catch (e) {
      toast.error("Erro ao adicionar ao carrinho");
    } finally {
      setAddingCarrinhoId(null);
    }
  };

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

  const nenhumFiltroAtivo = !accordionAberto && !showDesatualizados && !showRevisar && !showFavoritos;

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Ingredientes e Preços <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{totalIngredientes}</Badge></h1>
        <p className="text-xs text-muted-foreground mt-0.5">Preços por kg ou litro · itens por unidade mostram o preço da embalagem</p>
      </div>

      {/* Linha única de comando */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
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
          Desatualizados {countDesatualizados}
        </Button>
        <Button
          variant={showRevisar ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowRevisar(!showRevisar); setShowDesatualizados(false); setShowFavoritos(false); setAccordionAberto(null); setBusca(""); }}
          className={showRevisar ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          A revisar {ingredientes.filter(i => i.revisar === true).length}
        </Button>
        <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4 mr-1" /> Mais
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Relatórios</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileText className="w-4 h-4 mr-2" /> PDF de ingredientes
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => exportarIngredientesPDF(ingredientes)}>
                  Todos os ingredientes
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!accordionAberto}
                  onClick={() => exportarIngredientesPDF(ingredientes, accordionAberto)}
                >
                  Categoria atual{accordionAberto ? ` (${accordionAberto})` : ""}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => setShowRelatorioLote(true)}>
              <History className="w-4 h-4 mr-2" /> Relatório de lote
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Dados</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => downloadCsv(
                "ingredientes.csv",
                ["nome", "categoria", "unidade_compra", "peso_embalagem_g", "preco_embalagem_rs", "preco_por_g_rs", "fator_correcao"],
                ingredientes.map((i) => [i.nome, i.categoria, i.unidade_compra, i.peso_embalagem_g, i.preco_embalagem_rs, i.preco_por_g_rs, i.fator_correcao])
              )}
            >
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4 mr-2" /> Importar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImportSinonimos(true)}>
              <Tags className="w-4 h-4 mr-2" /> Sinônimos
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Preços e Compra</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/lista-compras")}>
              <ShoppingCart className="w-4 h-4 mr-2" /> Carrinho
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAtualizarPrecos(true)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar preços
              {!autoUpdateAtiva && (
                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">pausada</Badge>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Categorias — chips neutros roláveis */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => { setAccordionAberto(null); setBusca(""); setShowRevisar(false); setShowDesatualizados(false); setShowFavoritos(false); }}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap border transition-colors ${
                nenhumFiltroAtivo
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
              }`}
            >
              Todas {totalIngredientes}
            </button>
            {GRUPOS_INGREDIENTES.map((g) => {
              const count = ingredientes.filter(i => getGrupoFromCategoria(i.categoria) === g.nome).length;
              if (count === 0) return null;
              const aberto = accordionAberto === g.nome;
              const isRevisar = g.nome === "A Revisar";
              const classes = isRevisar
                ? (aberto ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100")
                : (aberto ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent hover:bg-accent");
              return (
                <button
                  key={g.nome}
                  onClick={() => {
                    setAccordionAberto(aberto ? null : g.nome);
                    setBuscaInterna("");
                    setBusca(""); setShowRevisar(false); setShowDesatualizados(false); setShowFavoritos(false);
                  }}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap border transition-colors ${classes}`}
                >
                  {g.nome} {count}
                </button>
              );
            })}
          </div>

          {/* Listagem compacta abaixo dos chips */}
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
            onAddToCarrinho={handleAddToCarrinho}
            addingCarrinhoId={addingCarrinhoId}
          />
        </>
      )}

      {/* Form Dialog */}
      <IngredienteFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        item={editItem}
        onSave={(data) => saveMut.mutate(data)}
        saving={saveMut.isPending}
        fornecedorSuggestions={fornecedorSuggestions}
      />

      {/* Import Dialog */}
      <ImportarIngredientesDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => qc.invalidateQueries({ queryKey: ["ingredientes"] })}
      />

      {/* Import Sinônimos Dialog */}
      <ImportarSinonimosDialog open={showImportSinonimos} onClose={() => setShowImportSinonimos(false)} />

      {/* Update Prices Dialog */}
      <AtualizarPrecosDialog
        open={showAtualizarPrecos}
        onClose={() => setShowAtualizarPrecos(false)}
        ingredientes={ingredientes}
        ultimoLog={ultimoLog}
        autoUpdateAtiva={autoUpdateAtiva}
        togglingAuto={togglingAuto}
        onToggleAutoUpdate={handleToggleAutoUpdate}
        onVerHistorico={() => setShowHistorico(true)}
      />

      {/* Histórico de atualizações automáticas */}
      <HistoricoAtualizacoesDialog
        open={showHistorico}
        onClose={() => setShowHistorico(false)}
        logs={historicoLogs}
      />

      {/* Relatório da atualização em lote de preços zerados */}
      <RelatorioLotePrecosDialog open={showRelatorioLote} onClose={() => setShowRelatorioLote(false)} />
    </div>
  );
}