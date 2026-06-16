import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Search, Plus, ChefHat, MoreVertical, Copy, Trash2, BookOpen, Sparkles, Upload, ChevronDown, ChevronUp, AlertTriangle, Star, Tag, X, Link2, Pin } from "lucide-react";
import { toast } from "sonner";
import NovaReceitaManual from "@/components/receita/NovaReceitaManual";
import NovaReceitaIA from "@/components/receita/NovaReceitaIA";
import ImportarLoteDialog from "@/components/receita/ImportarLoteDialog";

const CATEGORIAS_RECEITA = [
  "Entradas, Frias",
  "Entradas, Quentes",
  "Saladas",
  "Sopas, Cremes e Caldos",
  "Carnes, Bovina",
  "Carnes, Suína",
  "Carnes, Aves",
  "Carnes, Peixes",
  "Carnes, Frutos do mar",
  "Carnes, Bacalhau",
  "Acompanhamentos, Arroz e Risotos",
  "Acompanhamentos, Legumes e Hortaliças",
  "Acompanhamentos, Grãos e Leguminosas",
  "Acompanhamentos, Complementos",
  "Molhos",
  "Massas",
  "Tortas e Quiches",
  "Panquecas e Crepes",
  "Sanduíches e Lanches",
  "Petiscos e aperitivos",
  "Pães e Panificação",
  "Sorvetos e Gelados",
  "Bebidas, Sucos e Drinks",
  "Padaria, Pães e Panificação",
  "Padaria, Bolos e Cakes",
  "Padaria, Salgados e Salgadinhos",
  "Confeitaria, Chocolates e Trufas",
  "Confeitaria, Doces e Docinhos",
  "Confeitaria, Geléias, Conservas e Compotas",
  "Confeitaria, Sobremesas",
  "Confeitaria, Tortas",
  "Receitas, Funcionais",
  "Receitas, Integrais",
  "Receitas, Low Carb",
  "Receitas, Proteicas",
  "Receitas, Vegetarianas",
  "Receitas, Marmitas e Refeições Completas",
  "Receitas, Fitness",
  "Receitas, Internacionais",
  "Receitas, Pastosa",
  "Receitas, Regionais",
  "Receitas, Veganas"
];

export default function Receitas() {
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [showNew, setShowNew] = useState(null);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [showClassificarLote, setShowClassificarLote] = useState(false);
  const [classificarResult, setClassificarResult] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [showRevisar, setShowRevisar] = useState(false);
  const [showFavoritas, setShowFavoritas] = useState(false);
  const [tagFilterIds, setTagFilterIds] = useState([]);
  const [showTagPainel, setShowTagPainel] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("nova") === "manual") setShowNew("manual");
    if (params.get("nova") === "ia") setShowNew("ia");
  }, []);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-nome", 1000),
    staleTime: 0,
    refetchOnMount: "always",
  });

  // DIAGNÓSTICO — Query dedicada ao contador
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list("nome", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: receitaTags = [] } = useQuery({
    queryKey: ["receita-tags", tagFilterIds],
    queryFn: async () => {
      if (tagFilterIds.length === 0) return [];
      const all = [];
      for (const tid of tagFilterIds) {
        const rts = await base44.entities.ReceitaTag.filter({ tag_id: tid }, "", 1000);
        all.push(...rts);
      }
      return all;
    },
    enabled: tagFilterIds.length > 0,
  });

  const { data: totalReceitas = 0 } = useQuery({
    queryKey: ["receitas-count-total"],
    queryFn: async () => {
      // Teste 1: list sem limite
      const t1 = await base44.entities.Receita.list();
      console.log("list() sem parâmetro:", t1.length);

      // Teste 2: filter vazio
      const t2 = await base44.entities.Receita.filter({});
      console.log("filter({}):", t2.length);

      // Teste 3: list com limite alto
      const t3 = await base44.entities.Receita.list("", 9999);
      console.log("list('', 9999):", t3.length);

      return Math.max(t1.length, t2.length, t3.length);
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const duplicarMut = useMutation({
    mutationFn: async (receita) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = receita;
      const nova = await base44.entities.Receita.create({ ...rest, nome: `${receita.nome} — cópia` });
      const ings = await base44.entities.IngredienteReceita.filter({ receita_id: receita.id });
      for (const ing of ings) {
        const { id: iid, created_date: cd, updated_date: ud, created_by_id: cb, ...irest } = ing;
        await base44.entities.IngredienteReceita.create({ ...irest, receita_id: nova.id });
      }
      return nova;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      toast.success("Receita duplicada!");
    },
  });

  const handleClassificarLote = async () => {
    setClassifying(true);
    try {
      const res = await base44.functions.invoke("classificarProporcionalidadeLote", {});
      setClassificarResult(res.data);
      setShowClassificarLote(true);
      toast.success(`${res.data.alterados} ingredientes reclassificados.`);
      qc.invalidateQueries({ queryKey: ["receitas"] });
    } catch (err) {
      toast.error("Erro ao classificar: " + err.message);
    } finally {
      setClassifying(false);
    }
  };

  const favoritarMut = useMutation({
    mutationFn: async ({ id, favorita }) => {
      await base44.entities.Receita.update(id, { favorita });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const ings = await base44.entities.IngredienteReceita.filter({ receita_id: id });
      for (const ing of ings) await base44.entities.IngredienteReceita.delete(ing.id);
      return base44.entities.Receita.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      toast.success("Receita excluída!");
    },
  });

  const filtered = receitas.filter((r) => {
    if (showRevisar) return r.revisar === true;
    if (showFavoritas) return r.favorita === true;
    const matchBusca = !busca || r.nome?.toLowerCase().includes(busca.toLowerCase());
    const matchCat = catFiltro === "todas" || r.categoria === catFiltro;
    // Tag filter (AND logic)
    if (tagFilterIds.length > 0 && receitaTags.length > 0) {
      const tagsForReceita = receitaTags.filter(rt => rt.receita_id === r.id);
      const matchTags = tagFilterIds.every(tid => tagsForReceita.some(rt => rt.tag_id === tid));
      if (!matchTags) return false;
    }
    return matchBusca && matchCat;
  });

  // Group by category and sort
  const grouped = {};
  filtered.forEach((r) => {
    const cat = r.categoria || "A Revisar";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  // Auto-expand categories when searching
  useEffect(() => {
    if (busca) {
      const catsWithResults = Object.keys(grouped);
      if (catsWithResults.length === 1) {
        setExpandedCat(catsWithResults[0]);
      }
    }
  }, [busca]);

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "";

  const formatYield = (r) => {
    if (!r.rendimento_total || r.rendimento_total <= 0) return null;
    const u = r.unidade_base === "ml" ? "ml" : "g";
    const val = r.rendimento_total >= 1000
      ? `${(r.rendimento_total / 1000).toFixed(1).replace(".", ",")} ${u === "ml" ? "L" : "kg"}`
      : `${r.rendimento_total} ${u}`;
    return val;
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Receitas <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{totalReceitas}</Badge></h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportCsv(true)}>
            <Upload className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleClassificarLote} disabled={classifying}>
            <Link2 className="w-4 h-4 mr-1" /> {classifying ? "..." : "Estrutural / A gosto"}
          </Button>
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
              <DropdownMenuItem onClick={() => setShowNew("ia")}>
                <Sparkles className="w-4 h-4 mr-2" /> Colar receita (IA estrutura)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNew("lote")}>
                <Upload className="w-4 h-4 mr-2" /> Importar em lote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar receita..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFavoritas ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowFavoritas(!showFavoritas); setShowRevisar(false); setCatFiltro("todas"); setBusca(""); }}
          className={showFavoritas ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          <Star className={`w-4 h-4 mr-1 ${showFavoritas ? "fill-white" : ""}`} />
          Favoritas
        </Button>
        <Button
          variant={showRevisar ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowRevisar(!showRevisar); setShowFavoritas(false); setCatFiltro("todas"); setBusca(""); }}
          className={showRevisar ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Revisar
        </Button>
        <Select value={catFiltro} onValueChange={(v) => { setCatFiltro(v); setShowRevisar(false); setShowFavoritas(false); }}>
        <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {CATEGORIAS_RECEITA.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={tagFilterIds.length > 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTagPainel(!showTagPainel)}
          className="gap-1"
        >
          <Tag className="w-4 h-4" /> Tags
          {tagFilterIds.length > 0 && <Badge className="ml-1 h-4 px-1 text-[10px] bg-white text-primary">{tagFilterIds.length}</Badge>}
        </Button>
      </div>

      {/* Tag filter panel */}
      {showTagPainel && (
        <div className="p-3 bg-card border border-border rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar por tags (AND)</span>
            {tagFilterIds.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setTagFilterIds([])}>
                <X className="w-3 h-3 mr-1" /> Limpar tags
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {tags.map(tag => {
              const active = tagFilterIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-border"
                  }`}
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
      )}

      {/* Recipe list by category */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).sort().map((cat) => (
        <div key={cat}>
          <button
            className="w-full flex items-center justify-between py-2 px-1 text-left"
            onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{cat}</Badge>
              <span className="text-xs text-muted-foreground">{grouped[cat].length} itens</span>
            </div>
            {expandedCat === cat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedCat === cat && (
            <div className="space-y-1.5 mb-4">
              {grouped[cat].sort((a, b) => a.nome?.localeCompare(b.nome)).map((r) => (
                <Link key={r.id} to={`/receita/${r.id}`}>
                  <Card className="p-3 flex items-center justify-between gap-2 hover:bg-accent/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{r.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {r.custo_por_porcao != null && r.custo_por_porcao > 0 && (
                          <span className="text-xs font-bold text-primary">
                            {formatCurrency(r.custo_por_porcao)} /porção
                          </span>
                        )}
                        {formatYield(r) && (
                          <span className="text-xs text-muted-foreground">
                            Rende {formatYield(r)}
                          </span>
                        )}
                      </div>
                    </div>
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
            </div>
          )}
        </div>
      ))}

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

      {/* Import CSV dialog */}
      {showImportCsv && (
        <ImportReceitasCsvDialog open={true} onClose={() => setShowImportCsv(false)} />
      )}

      {/* Classificação proporcional — relatório */}
      {showClassificarLote && classificarResult && (
        <Dialog open={true} onOpenChange={() => setShowClassificarLote(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Classificação Estrutural / A gosto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 text-center bg-green-50 border-green-200">
                  <span className="text-2xl">🔗</span>
                  <p className="text-2xl font-bold text-green-700">{classificarResult.proporcional}</p>
                  <p className="text-xs text-green-600">Estruturais</p>
                </Card>
                <Card className="p-3 text-center bg-gray-50 border-gray-200">
                  <span className="text-2xl">📌</span>
                  <p className="text-2xl font-bold text-gray-700">{classificarResult.fixo}</p>
                  <p className="text-xs text-gray-500">A gosto</p>
                </Card>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  <strong>{classificarResult.total}</strong> ingredientes processados
                  {classificarResult.alterados > 0 && (
                    <> — <strong>{classificarResult.alterados}</strong> reclassificados</>
                  )}
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ajustes manuais podem ser feitos em cada receita pelo toggle Estrutural / A gosto.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowClassificarLote(false)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ImportReceitasCsvDialog({ open, onClose }) {
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
              nome_receita: { type: "string" },
              categoria: { type: "string" },
              porcoes_base: { type: "number" },
              rendimento_g: { type: "number" },
              modo_preparo: { type: "string" },
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const items = Array.isArray(result.output) ? result.output : (result.output.items || []);
        const existing = await base44.entities.Receita.list("-nome", 500);
        const existingMap = {};
        existing.forEach((r) => { existingMap[r.nome?.toLowerCase().trim()] = r; });

        let created = 0, updated = 0, skipped = 0;
        for (const item of items) {
          const nome = (item.nome_receita || "").trim();
          if (!nome) { skipped++; continue; }
          const payload = {
            nome: nome.toUpperCase(),
            categoria: item.categoria || "",
            porcoes_base: item.porcoes_base || 1,
            rendimento_total: item.rendimento_g || 0,
            unidade_base: "g",
            modo_preparo: item.modo_preparo || "",
          };
          const existingItem = existingMap[nome.toLowerCase()];
          if (existingItem) {
            const { id, created_date, updated_date, created_by_id, ...rest } = payload;
            await base44.entities.Receita.update(existingItem.id, { ...rest, revisar: true });
            updated++;
          } else {
            await base44.entities.Receita.create({ ...payload, revisar: false });
            created++;
          }
        }
        toast.success(`Importação concluída! ${created} criadas, ${updated} atualizadas, ${skipped} ignoradas.`);
        qc.invalidateQueries({ queryKey: ["receitas"] });
        qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
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
          <DialogTitle className="font-display">Importar Receitas via CSV</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo CSV com as colunas: <strong>nome_receita, categoria, porcoes_base, rendimento_g, modo_preparo</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Receitas com mesmo nome serão atualizadas. Categorias no formato "Grupo, Subcategoria".
        </p>
        <Label>Arquivo</Label>
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