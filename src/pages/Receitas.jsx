import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChefHat, MoreVertical, Copy, Trash2, BookOpen, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import NovaReceitaManual from "@/components/receita/NovaReceitaManual";
import NovaReceitaIA from "@/components/receita/NovaReceitaIA";

const CATEGORIAS_RECEITA = ["Carnes", "Massas", "Molhos", "Vegetais", "Aves", "Peixes", "Sopas", "Sobremesas", "Salgadinhos", "Empanados", "Complementos"];

export default function Receitas() {
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [showNew, setShowNew] = useState(null); // null | "manual" | "ia"
  const [showImportCsv, setShowImportCsv] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Check URL params for auto-open
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("nova") === "manual") setShowNew("manual");
    if (params.get("nova") === "ia") setShowNew("ia");
  }, []);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-updated_date", 200),
  });

  const duplicarMut = useMutation({
    mutationFn: async (receita) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = receita;
      const nova = await base44.entities.Receita.create({ ...rest, nome: `${receita.nome} — cópia` });
      // Copy ingredients
      const ings = await base44.entities.IngredienteReceita.filter({ receita_id: receita.id });
      for (const ing of ings) {
        const { id: iid, created_date: cd, updated_date: ud, created_by_id: cb, ...irest } = ing;
        await base44.entities.IngredienteReceita.create({ ...irest, receita_id: nova.id });
      }
      return nova;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita duplicada!");
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
      toast.success("Receita excluída!");
    },
  });

  const filtered = receitas.filter((r) => {
    const matchBusca = !busca || r.nome?.toLowerCase().includes(busca.toLowerCase());
    const matchCat = catFiltro === "todas" || r.categoria === catFiltro;
    return matchBusca && matchCat;
  });

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "";

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Minhas Receitas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportCsv(true)}>
            <Upload className="w-4 h-4 mr-1" /> CSV
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
                <Sparkles className="w-4 h-4 mr-2" /> Colar texto (IA)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar receita..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFiltro} onValueChange={setCatFiltro}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {CATEGORIAS_RECEITA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Recipe cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Nenhuma receita ainda</p>
          <p className="text-sm mt-1">Crie sua primeira receita!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <Card key={r.id} className="overflow-hidden group relative">
              <Link to={`/receita/${r.id}`}>
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {r.foto_url ? (
                    <img src={r.foto_url} alt={r.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                      <ChefHat className="w-10 h-10 text-primary/30" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">{r.categoria}</p>
                  {r.custo_por_porcao != null && r.custo_por_porcao > 0 && (
                    <p className="text-xs font-bold text-primary mt-1">{formatCurrency(r.custo_por_porcao)} /porção</p>
                  )}
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/receita/${r.id}`)}>
                    <BookOpen className="w-4 h-4 mr-2" /> Abrir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicarMut.mutate(r)}>
                    <Copy className="w-4 h-4 mr-2" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir " + r.nome + "?")) deleteMut.mutate(r.id); }}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
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

      {/* Import CSV dialog */}
      {showImportCsv && (
        <ImportReceitasCsvDialog open={true} onClose={() => setShowImportCsv(false)} />
      )}
    </div>
  );
}

// Map CSV categories to Receita entity enum
function mapearCategoria(csvCat) {
  const map = {
    "BACALHAU": "Peixes",
    "CAMARÃO": "Peixes",
    "CARNE": "Carnes",
    "FRANGO": "Aves",
    "PEIXE": "Peixes",
    "PORCO": "Carnes",
    "CORDEIRO": "Carnes",
    "PERU": "Aves",
    "SALGADINHO": "Salgadinhos",
    "SOBREMESA": "Sobremesas",
    "MASSA": "Massas",
    "MOLHO": "Molhos",
    "SOPA": "Sopas",
    "VEGETAL": "Vegetais",
    "EMPANADO": "Empanados",
    "COMPLEMENTO": "Complementos",
  };
  const upper = (csvCat || "").toUpperCase().trim();
  return map[upper] || "Complementos";
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
            nome,
            categoria: mapearCategoria(item.categoria),
            porcoes_base: item.porcoes_base || 1,
            rendimento_total: item.rendimento_g || 0,
            unidade_base: "g",
            modo_preparo: item.modo_preparo || "",
          };
          const existingItem = existingMap[nome.toLowerCase()];
          if (existingItem) {
            const { id, created_date, updated_date, created_by_id, ...rest } = payload;
            await base44.entities.Receita.update(existingItem.id, rest);
            updated++;
          } else {
            await base44.entities.Receita.create(payload);
            created++;
          }
        }
        toast.success(`Importação concluída! ${created} criadas, ${updated} atualizadas, ${skipped} ignoradas.`);
        qc.invalidateQueries({ queryKey: ["receitas"] });
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
          Receitas com mesmo nome serão atualizadas. Categorias do CSV são convertidas automaticamente.
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