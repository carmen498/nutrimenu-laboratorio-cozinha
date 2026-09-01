import { criarIngredienteReceita } from '@/lib/secureChildEntities';
import { criarReceitaSegura } from '@/lib/secureRootEntities';
import { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const useMutationAny = /** @type {any} */ (useMutation);
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, ChefHat, MoreVertical, Copy, Trash2, BookOpen, Sparkles, Upload, AlertTriangle, Star, Tag, X, LayoutGrid, ChevronDown, ClipboardPaste, CheckSquare, MoreHorizontal, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import NovaReceitaManual from "@/components/receita/NovaReceitaManual";
import NovaReceitaIA from "@/components/receita/NovaReceitaIA";
import ImportarLoteDialog from "@/components/receita/ImportarLoteDialog";
import ImportarReceitaTextoDialog from "@/components/receita/ImportarReceitaTextoDialog";
import GerenciarTagsDialog from "@/components/receita/GerenciarTagsDialog";
import QuickTagAssignDialog from "@/components/receita/QuickTagAssignDialog";
import BulkTagAssignDialog from "@/components/receita/BulkTagAssignDialog";
import TagBadge from "@/components/tags/TagBadge";
import { getCorHex } from "@/lib/coresReceita";
import { CATEGORIAS as CATEGORIAS_RECEITA, ICONE_CATEGORIA } from "@/components/receita/CategoriaPicker";
import { getCategorias, hasCategoria } from "@/lib/categoriasHelper";
import { fetchAllFilteredPages, fetchAllPages } from "@/lib/fetchAllPages";
import { normalizarNome } from "@/lib/normalizarNome";
import MinhasReceitasCard from "@/components/home/MinhasReceitasCard";
import { uploadArquivoSeguro, validarCsvUpload } from "@/lib/securityHardening";

const CORES_CATEGORIA = {
  "Carnes Bovinas e Suínos":       { cor: "#FFEBEE", corTexto: "#C62828", corPill: "#FFCDD2", corPillTexto: "#B71C1C" },
  "Aves":                          { cor: "#FFF3E0", corTexto: "#E65100", corPill: "#FFD180", corPillTexto: "#BF360C" },
  "Peixes e Frutos do Mar":        { cor: "#E3F2FD", corTexto: "#1565C0", corPill: "#BBDEFB", corPillTexto: "#0D47A1" },
  "Ovos":                          { cor: "#FFF8E1", corTexto: "#F57F17", corPill: "#FFE082", corPillTexto: "#E65100" },
  "Massas, Pastelão e Quiches":    { cor: "#E8F5E9", corTexto: "#2E7D32", corPill: "#C8E6C9", corPillTexto: "#1B5E20" },
  "Arroz e Risotos":               { cor: "#EFEBE9", corTexto: "#4E342E", corPill: "#D7CCC8", corPillTexto: "#3E2723" },
  "Sopas e Caldos":                { cor: "#E0F2F1", corTexto: "#00695C", corPill: "#B2DFDB", corPillTexto: "#004D40" },
  "Leguminosas":                   { cor: "#E8F5E9", corTexto: "#2E7D32", corPill: "#C8E6C9", corPillTexto: "#1B5E20" },
  "Salgadinhos":                   { cor: "#FCE4EC", corTexto: "#AD1457", corPill: "#F8BBD0", corPillTexto: "#880E4F" },
  "Pães e Bolos":                  { cor: "#FFFDE7", corTexto: "#F9A825", corPill: "#FFF176", corPillTexto: "#F57F17" },
  "Sobremesas":                    { cor: "#F3E5F5", corTexto: "#6A1B9A", corPill: "#E1BEE7", corPillTexto: "#4A148C" },
  "Molhos":                        { cor: "#EDE7F6", corTexto: "#4527A0", corPill: "#D1C4E9", corPillTexto: "#311B92" },
  "Acompanhamentos":               { cor: "#F1F8E9", corTexto: "#558B2F", corPill: "#DCEDC8", corPillTexto: "#33691E" },
  "Saladas":                       { cor: "#E8F5E9", corTexto: "#2E7D32", corPill: "#C8E6C9", corPillTexto: "#1B5E20" },

  "Entradas":                      { cor: "#ECEFF1", corTexto: "#455A64", corPill: "#CFD8DC", corPillTexto: "#263238" },
  "Lanches":                       { cor: "#F9FBE7", corTexto: "#827717", corPill: "#F0F4C3", corPillTexto: "#33691E" },
  "Receitas Base":                 { cor: "#EFEBE9", corTexto: "#5D4037", corPill: "#D7CCC8", corPillTexto: "#4E342E" },
};

export default function Receitas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [showNew, setShowNew] = useState(null);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [showRevisar, setShowRevisar] = useState(false);
  const [showFavoritas, setShowFavoritas] = useState(false);
  const [tagFilterIds, setTagFilterIds] = useState([]);
  const [showTagPainel, setShowTagPainel] = useState(false);
  const [showGerenciarTags, setShowGerenciarTags] = useState(false);
  const [assignTagsReceita, setAssignTagsReceita] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkTag, setShowBulkTag] = useState(false);
  const tagPanelRef = useRef(null);
  const tagButtonRef = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("nova") === "manual") setShowNew("manual");
    if (params.get("nova") === "ia") setShowNew("ia");
    if (params.get("revisar") === "true") setShowRevisar(true);
  }, []);

  useEffect(() => {
    if (!showTagPainel) return;
    const handleClickOutside = (e) => {
      if (tagPanelRef.current?.contains(e.target) || tagButtonRef.current?.contains(e.target)) {
        return;
      }
      // Guard against scrollbar interactions: some browsers report the click target
      // as an element outside the panel (e.g. the document) when dragging the
      // panel's own scrollbar. Treat clicks whose coordinates fall within the
      // panel's bounding box (which includes its scrollbar) as "inside".
      const rect = tagPanelRef.current?.getBoundingClientRect();
      if (rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        return;
      }
      setShowTagPainel(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTagPainel]);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allReceitaTags = [] } = useQuery({
    queryKey: ["all-receita-tags"],
    queryFn: () => fetchAllFilteredPages(base44.entities.ReceitaTag, {}, "", 500),
    staleTime: 5 * 60 * 1000,
  });

  // A composição completa é pesada e só é necessária quando a busca contém texto.
  const { data: allItensReceita = [] } = useQuery({
    queryKey: ["all-itens-receita"],
    queryFn: () => fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
    enabled: busca.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const minhasReceitasCount = useMemo(
    () => receitas.filter((r) =>
      r.is_base === false &&
      (r.usuario_dono_id === user?.id || (!r.usuario_dono_id && r.created_by_id === user?.id))
    ).length,
    [receitas, user?.id]
  );

  const receitaTagsPorReceita = useMemo(() => {
    const mapa = new Map();
    allReceitaTags.forEach((rt) => {
      const atuais = mapa.get(rt.receita_id) || [];
      atuais.push(rt);
      mapa.set(rt.receita_id, atuais);
    });
    return mapa;
  }, [allReceitaTags]);

  // Catálogo compartilhado (is_base=true) com as cópias pessoais (forks) do
  // usuário atual ocupando o lugar da receita original correspondente —
  // evita duplicar visualmente e mantém as contagens por categoria corretas.
  // Admin: vê apenas o catálogo original, sem os forks individuais dos clientes.
  const receitasExibidas = useMemo(() => {
    if (isAdmin) return receitas.filter((r) => r.is_base !== false);
    const forkPorBase = {};
    receitas.forEach((r) => {
      if (r.is_base === false && r.forked_from_id && r.created_by_id === user?.id) {
        forkPorBase[r.forked_from_id] = r;
      }
    });
    return receitas
      .filter((r) => r.is_base === true)
      .map((r) => forkPorBase[r.id] || r);
  }, [receitas, isAdmin, user]);

  const receitasPorCategoria = useMemo(() => {
    const mapa = {};
    CATEGORIAS_RECEITA.forEach((cat) => {
      mapa[cat] = receitasExibidas.filter((r) => hasCategoria(r, cat));
    });
    return mapa;
  }, [receitasExibidas]);

  const tagPorId = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const totalReceitas = receitasExibidas.length;
  const [visibleCount, setVisibleCount] = useState(40);

  useEffect(() => {
    setVisibleCount(40);
  }, [busca, categoriaSelecionada, showRevisar, showFavoritas, tagFilterIds]);

  const duplicarMut = useMutationAny({
    mutationFn: async (receita) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = receita;
      const nova = await criarReceitaSegura({ ...rest, nome: `${receita.nome} — cópia` });
      const ings = await base44.entities.IngredienteReceita.filter({ receita_id: receita.id });
      for (const ing of ings) {
        const { id: iid, created_date: cd, updated_date: ud, created_by_id: cb, ...irest } = ing;
        await criarIngredienteReceita({ ...irest, receita_id: nova.id });
      }
      return nova;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita duplicada!");
    },
  });

  const favoritarMut = useMutationAny({
    mutationFn: async ({ id, favorita }) => {
      await base44.entities.Receita.update(id, { favorita });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
    },
  });

  const toggleRevisarMut = useMutationAny({
    mutationFn: async ({ id, revisar }) => {
      await base44.entities.Receita.update(id, { revisar });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
    },
  });

  const deleteMut = useMutationAny({
    mutationFn: async (id) => {
      const ings = await base44.entities.IngredienteReceita.filter({ receita_id: id });
      for (const ing of ings) await base44.entities.IngredienteReceita.delete(ing.id);
      return base44.entities.Receita.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita excluída!");
    },
  });

  // Recipes whose ingredients (not the recipe name) match the search text
  const receitaIdsPorIngrediente = (() => {
    const termo = normalizarNome(busca);
    if (!termo) return new Set();
    const ids = new Set();
    allItensReceita.forEach((item) => {
      if (item.ingrediente_nome && normalizarNome(item.ingrediente_nome).includes(termo)) {
        ids.add(item.receita_id);
      }
    });
    return ids;
  })();

  const filtered = receitasExibidas.filter((r) => {
    if (showRevisar) return r.revisar === true;
    if (showFavoritas) return r.favorita === true;
    const matchNome = !busca || normalizarNome(r.nome).includes(normalizarNome(busca));
    const matchIngrediente = !matchNome && receitaIdsPorIngrediente.has(r.id);
    const matchBusca = matchNome || matchIngrediente;
    const matchCat = !categoriaSelecionada || hasCategoria(r, categoriaSelecionada);
    if (tagFilterIds.length > 0) {
      const tagsForReceita = receitaTagsPorReceita.get(r.id) || [];
      const matchTags = tagFilterIds.some(tid => tagsForReceita.some(rt => rt.tag_id === tid));
      if (!matchTags) return false;
    }
    return matchBusca && matchCat;
  });

  const toggleSelect = (recId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(recId)) next.delete(recId);
      else next.add(recId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "";

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold">Receitas <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{totalReceitas}</Badge></h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
          >
            <CheckSquare className="w-4 h-4 mr-1" /> {selectionMode ? "Cancelar seleção" : "Selecionar"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportCsv(true)}>
            <Upload className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/relatorio-receitas-pdf")}>
            <FileText className="w-4 h-4 mr-1" /> PDF
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
                  <FileText className="w-4 h-4 mr-2" /> PDF de receitas
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => navigate("/relatorio-receitas-pdf")}>
                    Todas as receitas
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!categoriaSelecionada}
                    onClick={() => navigate(`/relatorio-receitas-pdf?categoria=${encodeURIComponent(categoriaSelecionada)}`)}
                  >
                    Categoria atual{categoriaSelecionada ? ` (${categoriaSelecionada})` : ""}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nova Receita
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowNew("manual")}>
                <BookOpen className="w-4 h-4 mr-2" /> Cadastrar manualmente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNew("lote")}>
                <Sparkles className="w-4 h-4 mr-2" /> Importar com IA (texto ou arquivo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNew("texto")}>
                <ClipboardPaste className="w-4 h-4 mr-2" /> Importar formato padrão (PC:)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search + quick filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar receita..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setCategoriaSelecionada(null); }}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFavoritas ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowFavoritas(!showFavoritas); setShowRevisar(false); setCategoriaSelecionada(null); setBusca(""); }}
          className={showFavoritas ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          <Star className={`w-4 h-4 mr-1 ${showFavoritas ? "fill-white" : ""}`} />
          Favoritas
        </Button>
        <Button
          variant={showRevisar ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowRevisar(!showRevisar); setShowFavoritas(false); setCategoriaSelecionada(null); setBusca(""); }}
          className={showRevisar ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Revisar
        </Button>
        <Button
          ref={tagButtonRef}
          variant={tagFilterIds.length > 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTagPainel(!showTagPainel)}
          className="gap-1"
        >
          <Tag className="w-4 h-4" /> Tags
          {tagFilterIds.length > 0 && <Badge className="ml-1 h-4 px-1 text-[10px] bg-white text-primary">{tagFilterIds.length}</Badge>}
        </Button>
      </div>

      {/* "Todas" button + Category filter buttons */}
      <button
        onClick={() => { setCategoriaSelecionada(null); setBusca(""); setShowRevisar(false); setShowFavoritas(false); setShowTagPainel(false); }}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border-2 ${
          !categoriaSelecionada
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent bg-muted hover:bg-accent text-muted-foreground"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        Todas as receitas
        <Badge className="text-[10px] bg-primary/20 text-primary">{totalReceitas}</Badge>
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
        <MinhasReceitasCard count={minhasReceitasCount} />
        {CATEGORIAS_RECEITA.filter(cat => receitasPorCategoria[cat]?.length > 0).map(cat => {
          const receitasCategoria = receitasPorCategoria[cat];
          const count = receitasCategoria.length;
          const selecionada = categoriaSelecionada === cat;
          const icone = ICONE_CATEGORIA[cat] || "📋";
          const cores = CORES_CATEGORIA[cat] || { cor: "#F5F5F5", corTexto: "#424242", corPill: "#E0E0E0", corPillTexto: "#212121" };
          const selecionadosNaCategoria = selectionMode ? receitasCategoria.filter(r => selectedIds.has(r.id)).length : 0;
          const checkedCategoria = selecionadosNaCategoria === 0 ? false : (selecionadosNaCategoria === count ? true : "indeterminate");
          return (
            <div
              key={cat}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                backgroundColor: cores.cor,
                border: selecionada ? `2px solid ${cores.corTexto}` : "1px solid hsl(var(--border))",
              }}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:brightness-95"
                style={{ backgroundColor: cores.cor, color: cores.corTexto }}
                onClick={() => {
                  setBusca("");
                  setCategoriaSelecionada(selecionada ? null : cat);
                  setShowTagPainel(false);
                }}
              >
                {selectionMode && (
                  <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <Checkbox
                      checked={checkedCategoria}
                      onCheckedChange={(value) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          const ids = receitasCategoria.map(r => r.id);
                          if (value === true) ids.forEach(id => next.add(id));
                          else ids.forEach(id => next.delete(id));
                          return next;
                        });
                      }}
                    />
                  </span>
                )}
                <span className="text-lg">{icone}</span>
                <span className="flex-1 text-sm font-semibold">{cat}</span>
                <Badge
                  className="text-[10px] h-5 px-1.5 font-bold border-0"
                  style={{ backgroundColor: cores.corPill, color: cores.corPillTexto }}
                >
                  {count}
                </Badge>
                {selecionada && (
                  <span
                    role="button"
                    title={`Relatório PDF — ${cat}`}
                    className="p-1 rounded-md hover:bg-black/10 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/relatorio-receitas-pdf?categoria=${encodeURIComponent(cat)}`);
                    }}
                  >
                    <FileText className="w-4 h-4" style={{ color: cores.corTexto }} />
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${selecionada ? "rotate-180" : ""}`}
                  style={{ opacity: selecionada ? 1 : 0.5 }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Active tag pills */}
      {tagFilterIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tagFilterIds.map(tid => {
            const tag = tags.find(t => t.id === tid);
            return tag ? (
              <button
                key={tid}
                className="text-xs px-2.5 py-1 rounded-full border inline-flex items-center gap-1 hover:opacity-80"
                style={{
                  backgroundColor: (() => {
                    const CORES = {
                      restricao: "#FFEBEE", metodo: "#E3F2FD", perfil: "#E8F5E9",
                      contexto: "#F3E5F5", ingrediente: "#FFF3E0", molho: "#FCE4EC"
                    };
                    return CORES[tag.grupo] || "#F5F5F5";
                  })(),
                  color: (() => {
                    const CORES = {
                      restricao: "#C62828", metodo: "#1565C0", perfil: "#2E7D32",
                      contexto: "#6A1B9A", ingrediente: "#E65100", molho: "#880E4F"
                    };
                    return CORES[tag.grupo] || "#616161";
                  })(),
                  borderColor: "transparent",
                  fontWeight: 600,
                }}
                onClick={() => setTagFilterIds(prev => prev.filter(id => id !== tid))}
              >
                {tag.nome} <X className="w-3 h-3" />
              </button>
            ) : null;
          })}
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setTagFilterIds([])}>
            Limpar todos
          </Button>
        </div>
      )}

      {/* Tag filter panel */}
      {showTagPainel && (
        <div ref={tagPanelRef} className="p-3 bg-card border border-border rounded-xl space-y-3 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar por tags</span>
            <button
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
              onClick={() => setShowGerenciarTags(true)}
            >
              <Tag className="w-3 h-3" /> Gerenciar tags
            </button>
          </div>
          {(() => {
            const ORDEM_GRUPOS = [
              { key: "restricao", label: "RESTRIÇÃO", cor: "#C62828", bg: "#FFEBEE" },
              { key: "metodo", label: "MÉTODO", cor: "#1565C0", bg: "#E3F2FD" },
              { key: "perfil", label: "PERFIL", cor: "#2E7D32", bg: "#E8F5E9" },
              { key: "contexto", label: "CONTEXTO", cor: "#6A1B9A", bg: "#F3E5F5" },
              { key: "ingrediente", label: "INGREDIENTE", cor: "#E65100", bg: "#FFF3E0" },
              { key: "molho", label: "MOLHO", cor: "#880E4F", bg: "#FCE4EC" },
            ];
            return ORDEM_GRUPOS.map(g => {
              const groupTags = tags.filter(t => t.grupo === g.key);
              if (groupTags.length === 0) return null;
              return (
                <div key={g.key}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: g.cor }}>{g.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {groupTags.map(tag => {
                      const active = tagFilterIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          className="text-xs px-2.5 py-1 rounded-full border transition-all"
                          style={{
                            backgroundColor: active ? g.cor : g.bg,
                            color: active ? "#fff" : g.cor,
                            borderColor: active ? g.cor : "transparent",
                            fontWeight: active ? 600 : 400,
                          }}
                          onClick={() => {
                            setTagFilterIds(prev =>
                              active ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                            );
                          }}
                        >
                          {tag.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Bulk selection action bar */}
      {selectionMode && (
        <div className="flex items-center justify-between gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl">
          <span className="text-sm font-medium">{selectedIds.size} receita(s) selecionada(s)</span>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set(filtered.map(r => r.id)))}
            >
              Selecionar todos
            </Button>

            <Button size="sm" disabled={selectedIds.size === 0} onClick={() => setShowBulkTag(true)}>
              <Tag className="w-4 h-4 mr-1" /> Aplicar tag
            </Button>
            <Button size="sm" variant="outline" onClick={exitSelectionMode}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Recipe list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.sort((a, b) => a.nome?.localeCompare(b.nome)).slice(0, visibleCount).map((r) => (
            <Link
              key={r.id}
              to={`/receita/${r.id}`}
              onClick={(e) => {
                if (selectionMode) {
                  e.preventDefault();
                  toggleSelect(r.id);
                }
              }}
            >
              <Card className="pl-3 pr-2 py-2.5 flex items-center gap-3 hover:bg-accent/40 transition-colors">
                {selectionMode && (
                  <Checkbox checked={selectedIds.has(r.id)} className="shrink-0 pointer-events-none" />
                )}
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: r.cor_predominante ? getCorHex(r.cor_predominante) : "#BDBDBD" }}
                  title={r.cor_predominante ? `Cor: ${r.cor_predominante}` : "Sem cor definida"}
                />
                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="font-medium text-sm">{r.nome}</p>
                  {r.revisar && <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 shrink-0">A revisar</Badge>}
                  {busca && receitaIdsPorIngrediente.has(r.id) && !normalizarNome(r.nome).includes(normalizarNome(busca)) && (
                    <span className="text-[11px] text-primary/80 italic shrink-0">encontrado por ingrediente</span>
                  )}
                  {getCategorias(r).length > 0 && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{getCategorias(r)[0]}</span>
                  )}
                  {(receitaTagsPorReceita.get(r.id) || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {(receitaTagsPorReceita.get(r.id) || []).map(rt => {
                        const tag = tagPorId.get(rt.tag_id);
                        if (!tag) return null;
                        return <TagBadge key={rt.id} nome={tag.nome} cor={tag.cor} grupo={tag.grupo} />;
                      })}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-primary whitespace-nowrap shrink-0">
                  {r.custo_por_porcao != null && r.custo_por_porcao > 0 ? `${formatCurrency(r.custo_por_porcao)} /porção` : "—"}
                </span>
                <button
                  className={`p-1.5 rounded-full hover:bg-muted shrink-0 ${favoritarMut.isPending ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); favoritarMut.mutate({ id: r.id, favorita: !r.favorita }); }}
                  disabled={favoritarMut.isPending}
                  title={r.favorita ? "Remover das favoritas" : "Marcar como favorita"}
                >
                  <Star className={`w-4 h-4 ${r.favorita ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-full hover:bg-muted" onClick={(e) => e.preventDefault()}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => navigate(`/receita/${r.id}`)}>
                      <BookOpen className="w-4 h-4 mr-2" /> Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicarMut.mutate(r)}>
                      <Copy className="w-4 h-4 mr-2" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAssignTagsReceita(r)}>
                      <Tag className="w-4 h-4 mr-2" /> Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleRevisarMut.mutate({ id: r.id, revisar: !r.revisar })}>
                      <AlertTriangle className="w-4 h-4 mr-2" /> {r.revisar ? "Remover de A revisar" : "Marcar A revisar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => {
                      if (confirm("Excluir " + r.nome + "?")) deleteMut.mutate(r.id);
                    }}>
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            </Link>
          ))}
          {filtered.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount((v) => v + 40)}>
                Carregar mais ({filtered.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Nenhuma receita encontrada</p>
          <p className="text-sm mt-1">Crie uma receita ou importe via CSV.</p>
        </div>
      )}

      {/* New recipe dialogs */}
      {showNew === "manual" && (
        <NovaReceitaManual
          open={true}
          onClose={() => { setShowNew(null); window.history.replaceState({}, "", "/receitas"); }}
          onCreated={(id) => { setShowNew(null); navigate(`/receita/${id}`); }}
          receitasExistentes={receitas}
        />
      )}
      {showNew === "ia" && (
        <NovaReceitaIA
          open={true}
          onClose={() => { setShowNew(null); window.history.replaceState({}, "", "/receitas"); }}
          onCreated={(id) => { setShowNew(null); navigate(`/receita/${id}`); }}
        />
      )}
      {showNew === "lote" && (
        <ImportarLoteDialog
          open={true}
          onClose={() => { setShowNew(null); window.history.replaceState({}, "", "/receitas"); }}
        />
      )}
      {showNew === "texto" && (
        <ImportarReceitaTextoDialog
          open={true}
          onClose={() => { setShowNew(null); window.history.replaceState({}, "", "/receitas"); }}
          onCreated={(id) => { setShowNew(null); navigate(`/receita/${id}`); }}
        />
      )}

      {/* Import CSV dialog */}
      {showImportCsv && (
        <ImportReceitasCsvDialog open={true} onClose={() => setShowImportCsv(false)} />
      )}

      {/* Gerenciar Tags dialog */}
      <GerenciarTagsDialog open={showGerenciarTags} onClose={() => setShowGerenciarTags(false)} />

      {/* Quick Tag Assign dialog */}
      <QuickTagAssignDialog open={!!assignTagsReceita} onClose={() => setAssignTagsReceita(null)} receita={assignTagsReceita} />

      {/* Bulk Tag Assign dialog */}
      {showBulkTag && (
        <BulkTagAssignDialog
          open={true}
          onClose={() => setShowBulkTag(false)}
          receitaIds={Array.from(selectedIds)}
          tags={tags}
          allReceitaTags={allReceitaTags}
          onApplied={() => {
            qc.invalidateQueries({ queryKey: ["all-receita-tags"] });
            setShowBulkTag(false);
            exitSelectionMode();
          }}
        />
      )}

    </div>
  );
}

function ImportReceitasCsvDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const qc = useQueryClient();

  const reset = () => { setFile(null); setSummary(null); };

  const handleClose = () => { reset(); onClose(); };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const fileUrl = await uploadArquivoSeguro(base44, file, validarCsvUpload);
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome_receita: { type: "string" },
              categorias: { type: "string" },
              porcoes_base: { type: "number" },
              rendimento_g: { type: "number" },
              unidade_base: { type: "string" },
              modo_preparo: { type: "string" },
              per_capita_g: { type: "number" },
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const items = Array.isArray(result.output) ? result.output : (result.output.items || []);
        const existing = await fetchAllPages(base44.entities.Receita, "-nome");
        const existingMap = {};
        existing.forEach((r) => { existingMap[r.nome?.toLowerCase().trim()] = r; });

        let created = 0, updated = 0, skippedDuplicate = 0, errors = 0;
        const duplicateNames = [];
        const errorNames = [];
        const processedNames = new Set();
        const importedCount = () => created + updated;

        for (const item of items) {
          const nome = (item.nome_receita || "").trim();
          if (!nome) continue;

          const nomeKey = nome.toLowerCase();
          // Skip intra-batch duplicates (case-insensitive, trimmed)
          if (processedNames.has(nomeKey)) {
            skippedDuplicate++;
            duplicateNames.push(nome);
            continue;
          }
          processedNames.add(nomeKey);

          try {
            const catsRaw = item.categorias || item.categoria || "";
            const categorias = typeof catsRaw === "string"
              ? catsRaw.split(/[,;]/).map(c => c.trim()).filter(Boolean)
              : (Array.isArray(catsRaw) ? catsRaw : []);
            const payload = { nome: nome.toUpperCase() };
            if (categorias.length > 0) payload.categorias = categorias;
            if (item.porcoes_base != null && item.porcoes_base !== "") payload.porcoes_base = item.porcoes_base;
            if (item.rendimento_g != null && item.rendimento_g !== "") payload.rendimento_total = item.rendimento_g;
            if (item.unidade_base) payload.unidade_base = item.unidade_base;
            if (item.modo_preparo != null && item.modo_preparo !== "") payload.modo_preparo = item.modo_preparo;
            if (item.per_capita_g != null && item.per_capita_g !== "") payload.per_capita_g = item.per_capita_g;
            const existingItem = existingMap[nomeKey];
            if (existingItem) {
              await base44.entities.Receita.update(existingItem.id, { ...payload, revisar: false });
              updated++;
            } else {
              await criarReceitaSegura({ ...payload, revisar: false });
              created++;
            }
          } catch {
            errors++;
            errorNames.push(nome);
          }
        }

        setSummary({ created, updated, skippedDuplicate, errors, duplicateNames, errorNames });
        qc.invalidateQueries({ queryKey: ["receitas"] });
      } else {
        toast.error("Erro ao processar arquivo: " + (result.details || "formato inválido"));
      }
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  if (summary) {
    const total = summary.created + summary.updated;
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Relatório da Importação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center bg-green-50 border-green-200">
                <span className="text-xl">✅</span>
                <p className="text-2xl font-bold text-green-700">{total}</p>
                <p className="text-xs text-green-600">Importadas</p>
              </Card>
              <Card className="p-3 text-center bg-amber-50 border-amber-200">
                <span className="text-xl">⚠️</span>
                <p className="text-2xl font-bold text-amber-700">{summary.skippedDuplicate}</p>
                <p className="text-xs text-amber-600">Duplicadas</p>
              </Card>
              <Card className="p-3 text-center bg-red-50 border-red-200">
                <span className="text-xl">❌</span>
                <p className="text-2xl font-bold text-red-700">{summary.errors}</p>
                <p className="text-xs text-red-600">Erros</p>
              </Card>
            </div>

            {summary.duplicateNames.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Nomes duplicados ignorados:</p>
                {summary.duplicateNames.map((n, i) => (
                  <p key={i} className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{n}</p>
                ))}
              </div>
            )}

            {summary.errorNames.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Falhas ao importar:</p>
                {summary.errorNames.map((n, i) => (
                  <p key={i} className="text-red-700 bg-red-50 px-2 py-0.5 rounded">{n}</p>
                ))}
              </div>
            )}

            {summary.duplicateNames.length === 0 && summary.errors === 0 && (
              <p className="text-sm text-muted-foreground text-center">Todas as receitas foram importadas com sucesso.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Concluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Importar Receitas via CSV</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo CSV com as colunas: <strong>nome_receita, categorias, porcoes_base, rendimento_g, modo_preparo, per_capita_g</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Receitas com mesmo nome serão atualizadas. Categorias separadas por vírgula.
        </p>
        <Label>Arquivo</Label>
        <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Importando..." : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}