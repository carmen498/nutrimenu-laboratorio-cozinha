import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Pencil, Trash2, Upload, Check, X, Utensils, Download } from "lucide-react";
import { toast } from "sonner";
import ImportarMedidasDialog from "@/components/medida/ImportarMedidasDialog";
import { downloadCsv } from "@/lib/exportCsv";
import { fetchAllPages } from "@/lib/fetchAllPages";

export default function MedidasCaseiras() {
  const [tab, setTab] = useState("utensilios");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // --- UtensilioPadrao state ---
  const { data: utensilios = [] } = useQuery({
    queryKey: ["utensilios-padrao"],
    queryFn: () => base44.entities.UtensilioPadrao.list("simbolo", 200),
  });
  const [editUte, setEditUte] = useState(null);
  const [uteForm, setUteForm] = useState({ simbolo: "", descricao_singular: "", descricao_plural: "", g_min: "", g_max: "", g_medio: "" });
  const [showUteForm, setShowUteForm] = useState(false);

  // --- MedidaCaseira state ---
  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes-all"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "nome"),
  });
  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas-caseiras"],
    queryFn: () => base44.entities.MedidaCaseira.list("-created_date", 500),
  });
  const [showMedidaForm, setShowMedidaForm] = useState(false);
  const [editMedida, setEditMedida] = useState(null);
  const [medidaForm, setMedidaForm] = useState({ alimento: "", utensilio: "", referencia_g: "", so_gramas: false });
  const [showImport, setShowImport] = useState(false);

  const ingMap = useMemo(() => {
    const m = {};
    ingredientes.forEach(i => { m[i.id] = i; });
    return m;
  }, [ingredientes]);

  const uteMap = useMemo(() => {
    const m = {};
    utensilios.forEach(u => { m[u.id] = u; });
    return m;
  }, [utensilios]);

  // --- UtensilioPadrao CRUD ---
  const startNewUte = () => {
    setEditUte(null);
    setUteForm({ simbolo: "", descricao_singular: "", descricao_plural: "", g_min: "", g_max: "", g_medio: "" });
    setShowUteForm(true);
  };

  const startEditUte = (u) => {
    setEditUte(u);
    setUteForm({
      simbolo: u.simbolo || "",
      descricao_singular: u.descricao_singular || "",
      descricao_plural: u.descricao_plural || "",
      g_min: u.g_min != null ? String(u.g_min) : "",
      g_max: u.g_max != null ? String(u.g_max) : "",
      g_medio: u.g_medio != null ? String(u.g_medio) : "",
    });
    setShowUteForm(true);
  };

  const saveUte = async () => {
    if (!uteForm.simbolo.trim() || !uteForm.descricao_singular.trim()) {
      toast.error("Símbolo e descrição (singular) são obrigatórios");
      return;
    }
    const payload = {
      simbolo: uteForm.simbolo.trim(),
      descricao_singular: uteForm.descricao_singular.trim(),
      descricao_plural: (uteForm.descricao_plural || uteForm.descricao_singular).trim(),
      g_min: uteForm.g_min !== "" ? parseFloat(uteForm.g_min.replace(",", ".")) : null,
      g_max: uteForm.g_max !== "" ? parseFloat(uteForm.g_max.replace(",", ".")) : null,
      g_medio: uteForm.g_medio !== "" ? parseFloat(uteForm.g_medio.replace(",", ".")) : null,
    };
    try {
      if (editUte) {
        await base44.entities.UtensilioPadrao.update(editUte.id, payload);
        toast.success("Utensílio atualizado");
      } else {
        await base44.entities.UtensilioPadrao.create(payload);
        toast.success("Utensílio criado");
      }
      queryClient.invalidateQueries({ queryKey: ["utensilios-padrao"] });
      setShowUteForm(false);
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  const deleteUte = async (u) => {
    if (!confirm(`Excluir utensílio "${u.simbolo}"?`)) return;
    try {
      await base44.entities.UtensilioPadrao.delete(u.id);
      queryClient.invalidateQueries({ queryKey: ["utensilios-padrao"] });
      toast.success("Utensílio excluído");
    } catch (err) {
      toast.error("Erro ao excluir: " + (err.message || ""));
    }
  };

  // --- MedidaCaseira CRUD ---
  const startNewMedida = () => {
    setEditMedida(null);
    setMedidaForm({ alimento: "", utensilio: "", referencia_g: "", so_gramas: false });
    setShowMedidaForm(true);
  };

  const startEditMedida = (m) => {
    setEditMedida(m);
    setMedidaForm({
      alimento: m.alimento || "",
      utensilio: m.utensilio || "",
      referencia_g: m.referencia_g != null ? String(m.referencia_g) : "",
      so_gramas: !!m.so_gramas,
    });
    setShowMedidaForm(true);
  };

  const saveMedida = async () => {
    if (!medidaForm.alimento || !medidaForm.utensilio) {
      toast.error("Alimento e utensílio são obrigatórios");
      return;
    }
    const ing = ingMap[medidaForm.alimento];
    const ute = uteMap[medidaForm.utensilio];
    const payload = {
      nome: (ing?.nome || "Alimento") + " · " + (ute?.simbolo || "Utensílio"),
      alimento: medidaForm.alimento,
      utensilio: medidaForm.utensilio,
      referencia_g: medidaForm.referencia_g !== "" ? parseFloat(medidaForm.referencia_g.replace(",", ".")) : null,
      so_gramas: medidaForm.so_gramas,
    };
    try {
      if (editMedida) {
        await base44.entities.MedidaCaseira.update(editMedida.id, payload);
        toast.success("Medida atualizada");
      } else {
        await base44.entities.MedidaCaseira.create(payload);
        toast.success("Medida criada");
      }
      queryClient.invalidateQueries({ queryKey: ["medidas-caseiras"] });
      setShowMedidaForm(false);
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  const deleteMedida = async (m) => {
    if (!confirm(`Excluir a medida "${m.nome}"?`)) return;
    try {
      await base44.entities.MedidaCaseira.delete(m.id);
      queryClient.invalidateQueries({ queryKey: ["medidas-caseiras"] });
      toast.success("Medida excluída");
    } catch (err) {
      toast.error("Erro ao excluir: " + (err.message || ""));
    }
  };

  // --- Filters ---
  const utensiliosFiltered = useMemo(() => {
    if (!search.trim()) return utensilios;
    const s = search.toLowerCase();
    return utensilios.filter(u =>
      (u.simbolo || "").toLowerCase().includes(s) ||
      (u.descricao_singular || "").toLowerCase().includes(s)
    );
  }, [utensilios, search]);

  const medidasFiltered = useMemo(() => {
    if (!search.trim()) return medidas;
    const s = search.toLowerCase();
    return medidas.filter(m => {
      const ing = ingMap[m.alimento];
      const ute = uteMap[m.utensilio];
      const txt = (ing?.nome || "") + " " + (ute?.simbolo || "") + " " + (m.nome || "");
      return txt.toLowerCase().includes(s);
    });
  }, [medidas, search, ingMap, uteMap]);

  const fmtG = (v) => v != null ? (Number.isInteger(v) ? v : v.toFixed(1).replace(".0", "")) : "—";

  const SEM_CATEGORIA = "Sem categoria";
  const medidasAgrupadas = useMemo(() => {
    const grupos = {};
    medidasFiltered.forEach((m) => {
      const cat = ingMap[m.alimento]?.categoria || SEM_CATEGORIA;
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(m);
    });
    const nomes = Object.keys(grupos).sort((a, b) => {
      if (a === SEM_CATEGORIA) return 1;
      if (b === SEM_CATEGORIA) return -1;
      return a.localeCompare(b, "pt-BR");
    });
    return nomes.map((categoria) => ({
      categoria,
      itens: grupos[categoria].sort((a, b) =>
        (ingMap[a.alimento]?.nome || "").localeCompare(ingMap[b.alimento]?.nome || "", "pt-BR")
      ),
    }));
  }, [medidasFiltered, ingMap]);

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2">
        <Utensils className="w-5 h-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Medidas Caseiras</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "utensilios" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("utensilios")}
        >
          Utensílios Padrão ({utensilios.length})
        </Button>
        <Button
          variant={tab === "medidas" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("medidas")}
        >
          Medidas por Alimento ({medidas.length})
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={tab === "utensilios" ? "Buscar utensílio..." : "Buscar alimento ou utensílio..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {tab === "utensilios" ? (
          <Button onClick={startNewUte} className="gap-1">
            <Plus className="w-4 h-4" /> Novo Utensílio
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1">
              <Upload className="w-4 h-4" /> Importar CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv(
                "medidas_caseiras.csv",
                ["ingrediente_nome", "utensilio_simbolo", "referencia_g", "medida_pronto_g", "so_gramas"],
                medidas.map((m) => [
                  ingMap[m.alimento]?.nome || "",
                  uteMap[m.utensilio]?.simbolo || "",
                  m.referencia_g,
                  m.medida_pronto_g,
                  m.so_gramas ? "true" : "false",
                ])
              )}
              className="gap-1"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button onClick={startNewMedida} className="gap-1">
              <Plus className="w-4 h-4" /> Nova Medida
            </Button>
          </div>
        )}
      </div>

      {/* UtensilioPadrao table */}
      {tab === "utensilios" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b-2 border-border">
                <th className="text-left px-3 py-2 font-semibold text-xs">Símbolo</th>
                <th className="text-left px-3 py-2 font-semibold text-xs">Descrição (singular)</th>
                <th className="text-left px-3 py-2 font-semibold text-xs hidden md:table-cell">Plural</th>
                <th className="text-right px-2 py-2 font-semibold text-xs">g min</th>
                <th className="text-right px-2 py-2 font-semibold text-xs">g máx</th>
                <th className="text-right px-2 py-2 font-semibold text-xs">g médio</th>
                <th className="px-2 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {utensiliosFiltered.map((u, idx) => (
                <tr key={u.id} className={`border-b border-border/40 ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-muted/40`}>
                  <td className="px-3 py-2 font-medium">{u.simbolo}</td>
                  <td className="px-3 py-2">{u.descricao_singular}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{u.descricao_plural || "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtG(u.g_min)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtG(u.g_max)}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold" style={{ color: "#1B4332" }}>{fmtG(u.g_medio)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="p-1 rounded hover:bg-muted" onClick={() => startEditUte(u)} title="Editar">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                      <button className="p-1 rounded hover:bg-red-50" onClick={() => deleteUte(u)} title="Excluir">
                        <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {utensiliosFiltered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                    Nenhum utensílio encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* MedidaCaseira table */}
      {tab === "medidas" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b-2 border-border">
                <th className="text-left px-3 py-2 font-semibold text-xs">Alimento</th>
                <th className="text-left px-3 py-2 font-semibold text-xs">Utensílio</th>
                <th className="text-right px-2 py-2 font-semibold text-xs">Ref. (g cru)</th>
                <th className="text-center px-2 py-2 font-semibold text-xs">Só gramas</th>
                <th className="px-2 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {medidasAgrupadas.map((grupo) => (
                <React.Fragment key={grupo.categoria}>
                  <tr className="bg-muted/60">
                    <td colSpan={5} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {grupo.categoria} ({grupo.itens.length})
                    </td>
                  </tr>
                  {grupo.itens.map((m, idx) => {
                    const ing = ingMap[m.alimento];
                    const ute = uteMap[m.utensilio];
                    return (
                      <tr key={m.id} className={`border-b border-border/40 ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"} hover:bg-muted/40`}>
                        <td className="px-3 py-2 font-medium">{ing?.nome || "—"}</td>
                        <td className="px-3 py-2">{ute?.simbolo || "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold" style={{ color: "#1B4332" }}>{fmtG(m.referencia_g)}</td>
                        <td className="px-2 py-2 text-center">
                          {m.so_gramas ? <Badge className="bg-amber-100 text-amber-700 border-amber-300">Sim</Badge> : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button className="p-1 rounded hover:bg-muted" onClick={() => startEditMedida(m)} title="Editar">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                            </button>
                            <button className="p-1 rounded hover:bg-red-50" onClick={() => deleteMedida(m)} title="Excluir">
                              <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {medidasFiltered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                    Nenhuma medida encontrada. Clique em "Nova Medida" ou "Importar CSV".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* UtensilioPadrao form dialog */}
      <Dialog open={showUteForm} onOpenChange={(v) => !v && setShowUteForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editUte ? "Editar Utensílio" : "Novo Utensílio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Símbolo *</Label>
              <Input value={uteForm.simbolo} onChange={(e) => setUteForm(f => ({ ...f, simbolo: e.target.value }))} placeholder="ex: col. sopa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Descrição (singular) *</Label>
              <Input value={uteForm.descricao_singular} onChange={(e) => setUteForm(f => ({ ...f, descricao_singular: e.target.value }))} placeholder="ex: colher de sopa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Descrição (plural)</Label>
              <Input value={uteForm.descricao_plural} onChange={(e) => setUteForm(f => ({ ...f, descricao_plural: e.target.value }))} placeholder="ex: colheres de sopa" className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">g min</Label>
                <Input type="text" value={uteForm.g_min} onChange={(e) => setUteForm(f => ({ ...f, g_min: e.target.value }))} placeholder="—" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">g máx</Label>
                <Input type="text" value={uteForm.g_max} onChange={(e) => setUteForm(f => ({ ...f, g_max: e.target.value }))} placeholder="—" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">g médio</Label>
                <Input type="text" value={uteForm.g_medio} onChange={(e) => setUteForm(f => ({ ...f, g_medio: e.target.value }))} placeholder="—" className="mt-1" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Deixe g min/máx/médio vazios para utensílios sem gramatura (prato, fatia, unidade, etc.).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUteForm(false)}>Cancelar</Button>
            <Button onClick={saveUte}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MedidaCaseira form dialog */}
      <Dialog open={showMedidaForm} onOpenChange={(v) => !v && setShowMedidaForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editMedida ? "Editar Medida" : "Nova Medida"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Alimento (Ingrediente) *</Label>
              <select
                value={medidaForm.alimento}
                onChange={(e) => setMedidaForm(f => ({ ...f, alimento: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm mt-1"
              >
                <option value="">Selecione...</option>
                {ingredientes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Utensílio *</Label>
              <select
                value={medidaForm.utensilio}
                onChange={(e) => setMedidaForm(f => ({ ...f, utensilio: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm mt-1"
              >
                <option value="">Selecione...</option>
                {utensilios.map(u => <option key={u.id} value={u.id}>{u.simbolo} — {u.descricao_singular}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Referência (g cru)</Label>
              <Input type="text" value={medidaForm.referencia_g} onChange={(e) => setMedidaForm(f => ({ ...f, referencia_g: e.target.value }))} placeholder="ex: 200" className="mt-1" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={medidaForm.so_gramas}
                onChange={(e) => setMedidaForm(f => ({ ...f, so_gramas: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Só gramas (conversor nunca exibe medida caseira para este alimento)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMedidaForm(false)}>Cancelar</Button>
            <Button onClick={saveMedida}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV dialog */}
      <ImportarMedidasDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["medidas-caseiras"] })}
      />

      <p className="text-xs text-muted-foreground italic text-center pt-2">
        Conversor de produção — não substitui as medidas caseiras oficiais de rotulagem (RDC 429/2020 e IN 75/2020).
      </p>
    </div>
  );
}