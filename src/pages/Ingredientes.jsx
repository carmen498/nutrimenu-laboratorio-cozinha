import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Upload, Pencil, Trash2, ChevronDown, ChevronUp, Settings2, AlertTriangle, RefreshCw, Clock, History } from "lucide-react";
import { toast } from "sonner";
import CalculadoraCusto from "@/components/CalculadoraCusto";
import AtualizarPrecosDialog from "@/components/ingrediente/AtualizarPrecosDialog";
import HistoricoAtualizacoesDialog from "@/components/ingrediente/HistoricoAtualizacoesDialog";

const CATEGORIAS = [
  "CARNES", "VEGETAIS", "TEMPEROS", "LATICÍNIOS", "CEREAIS & SECOS",
  "ENLATADOS", "REFRIGERADOS", "GRÃOS E SEMENTES", "DOCES", "DIVERSOS", "A Revisar", "Receitas Básicas"
];

export default function Ingredientes() {
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [showRevisar, setShowRevisar] = useState(false);
  const [showDesatualizados, setShowDesatualizados] = useState(false);
  const [showAtualizarPrecos, setShowAtualizarPrecos] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const qc = useQueryClient();

  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: ultimoLog } = useQuery({
    queryKey: ["ultimo-log-precos"],
    queryFn: async () => {
      const logs = await base44.entities.LogAtualizacaoPrecos.list("-data_execucao", 1);
      return logs[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: historicoLogs = [] } = useQuery({
    queryKey: ["historico-log-precos"],
    queryFn: () => base44.entities.LogAtualizacaoPrecos.list("-data_execucao", 10),
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

        // remove internal tracking fields
        delete rest._preco_anterior;
        delete rest._peso_anterior;
        return base44.entities.Ingrediente.update(id, rest);
      }
      // Auto-set price date for new ingredients with price
      if (preco_por_g > 0) {
        payload.preco_atualizado_em = new Date().toISOString();
        payload.fonte_preco = "Manual";
      }
      // Check for duplicate name
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

  const filtered = ingredientes.filter((i) => {
    if (showDesatualizados) return isDesatualizado(i);
    if (showRevisar) return i.revisar === true;
    const matchBusca = !busca || i.nome?.toLowerCase().includes(busca.toLowerCase());
    const matchCat = catFiltro === "todas" || i.categoria === catFiltro;
    return matchBusca && matchCat;
  });

  const countDesatualizados = ingredientes.filter(i => isDesatualizado(i)).length;

  // Group by category
  const grouped = {};
  filtered.forEach((i) => {
    const cat = i.categoria || "A Revisar";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  const formatPrice = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—";

  // Weight units that use per-kg pricing
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

  const formatUnitLabel = (unit) => {
    const u = unit?.toUpperCase();
    if (u === "KG" || u === "G") return "kg";
    if (u === "LT" || u === "ML") return "L";
    return unit?.toLowerCase() || "un";
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
      return `${formatPrice(precoEmb)}/${formatUnitLabel(u)} (${peso} g) · ${formatPrice(pricePerKg)}/kg`;
    }
    return `${formatPrice(pricePerKg)}/kg · embalagem ${peso}g`;
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Ingredientes e Preços</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Preços por kg ou litro · itens por unidade mostram o preço da embalagem</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAtualizarPrecos(true)}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar preços
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Última atualização automática */}
      {ultimoLog && (
        <button
          onClick={() => setShowHistorico(true)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <History className="w-3 h-3" />
          Última atualização automática: {new Date(ultimoLog.data_execucao).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          <span className="underline ml-0.5">Ver histórico</span>
        </button>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showDesatualizados ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowDesatualizados(!showDesatualizados); setShowRevisar(false); setCatFiltro("todas"); setBusca(""); }}
          className={showDesatualizados ? "bg-red-600 hover:bg-red-700" : ""}
        >
          <Clock className="w-4 h-4 mr-1" />
          Desatualizados
        </Button>
        <Button
          variant={showRevisar ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowRevisar(!showRevisar); setShowDesatualizados(false); setCatFiltro("todas"); setBusca(""); }}
          className={showRevisar ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Revisar
        </Button>
        <Select value={catFiltro} onValueChange={(v) => { setCatFiltro(v); setShowRevisar(false); setShowDesatualizados(false); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Ingredient list by category */}
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
              {grouped[cat].sort((a, b) => a.nome?.localeCompare(b.nome)).map((ing) => (
                <Card key={ing.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {ing.nome}
                      {(ing.fator_correcao && ing.fator_correcao !== 1.0) && (
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                          FC {String(ing.fator_correcao).replace(".", ",")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatIngredientPrice(ing)}
                    </p>
                    {ing.preco_atualizado_em ? (
                      <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${
                        diasDesdeAtualizacao(ing) <= 30 ? "text-green-600" :
                        diasDesdeAtualizacao(ing) <= 90 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {diasDesdeAtualizacao(ing) <= 30 ? "🟢" : diasDesdeAtualizacao(ing) <= 90 ? "🟡" : "🔴"}
                        Atualizado {new Date(ing.preco_atualizado_em).toLocaleDateString("pt-BR")}
                        {diasDesdeAtualizacao(ing) > 90 && <Badge className="text-[9px] px-1 py-0 bg-red-100 text-red-700 border-red-200 ml-1">Desatualizado</Badge>}
                      </p>
                    ) : ing.preco_por_g_rs > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">⚪ Sem data de atualização</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(ing); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                      if (confirm("Excluir " + ing.nome + "?")) delMut.mutate(ing.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum ingrediente encontrado</p>
          <p className="text-sm mt-1">Importe um CSV ou cadastre manualmente.</p>
        </div>
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
                {["CARNES", "VEGETAIS", "TEMPEROS", "LATICÍNIOS", "CEREAIS & SECOS", "ENLATADOS", "REFRIGERADOS", "GRÃOS E SEMENTES", "DOCES", "DIVERSOS", "A Revisar", "Receitas Básicas"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade de compra</Label>
            <Input value={form.unidade_compra || ""} onChange={(e) => setForm({ ...form, unidade_compra: e.target.value })} placeholder="KG, LT, UN..." />
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
          {/* Advanced: fator de correção */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5" /> Ajustes avançados
            </summary>
            <div className="mt-2">
              <Label>Fator de correção</Label>
              <Input type="number" step="0.01" value={form.fator_correcao ?? 1.0} onChange={(e) => setForm({ ...form, fator_correcao: parseFloat(e.target.value) || 1.0 })} />
              <p className="text-xs text-muted-foreground mt-1">Padrão: 1.0. Ajuste para ingredientes com perda (cascas, ossos, etc.)</p>
            </div>
          </details>
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
        // Get existing ingredients for upsert
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