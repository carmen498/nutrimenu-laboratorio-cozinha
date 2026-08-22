import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, DatabaseZap, Loader2, Pencil, Split, Merge } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { diagnosticarMedidaCaseira } from "@/lib/medidaCaseiraModel";

const numeroTexto = (v) => (Number(v) > 0 ? String(v) : "");

export default function AuditoriaMedidasCaseiras() {
  const [normalizando, setNormalizando] = useState(false);
  const [acaoId, setAcaoId] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(null);
  const [buscaIngrediente, setBuscaIngrediente] = useState("");
  const qc = useQueryClient();

  const { data: medidas = [], isLoading: l1 } = useQuery({
    queryKey: ["auditoria-medidas-caseiras"],
    queryFn: () => fetchAllPages(base44.entities.MedidaCaseira, "-created_date"),
  });
  const { data: ingredientes = [], isLoading: l2 } = useQuery({
    queryKey: ["auditoria-medidas-ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "nome"),
  });
  const { data: utensilios = [], isLoading: l3 } = useQuery({
    queryKey: ["auditoria-medidas-utensilios"],
    queryFn: () => fetchAllPages(base44.entities.UtensilioPadrao, "simbolo"),
  });

  const ingredienteMap = useMemo(() => Object.fromEntries(ingredientes.map(i => [i.id, i])), [ingredientes]);
  const utensilioMap = useMemo(() => Object.fromEntries(utensilios.map(u => [u.id, u])), [utensilios]);

  const diagnostico = useMemo(() => {
    const baseRows = medidas.map(mc => {
      const d = diagnosticarMedidaCaseira(mc);
      const problemas = [...d.problemas];
      if (d.ingredienteId && !ingredienteMap[d.ingredienteId]) problemas.push("ingrediente_id_nao_encontrado");
      if (d.utensilioId && !utensilioMap[d.utensilioId]) problemas.push("utensilio_id_nao_encontrado");
      return { mc, ...d, problemas };
    });

    const grupos = new Map();
    baseRows.forEach(r => {
      if (!grupos.has(r.chaveCanonica)) grupos.set(r.chaveCanonica, []);
      grupos.get(r.chaveCanonica).push(r);
    });

    const rows = baseRows.map(r => ({
      ...r,
      problemas: (grupos.get(r.chaveCanonica)?.length || 0) > 1
        ? [...r.problemas, "chave_canonica_duplicada"]
        : r.problemas,
    }));

    const duplicados = [...grupos.entries()]
      .filter(([, lista]) => lista.length > 1)
      .map(([chave, lista]) => ({ chave, rows: lista }));

    return {
      rows,
      duplicados,
      total: rows.length,
      v2: rows.filter(r => r.modeloVersao >= 2).length,
      legados: rows.filter(r => r.legado).length,
      revisar: rows.filter(r => r.problemas.length > 0).length,
      duplicadosTotal: duplicados.reduce((s, g) => s + g.rows.length, 0),
    };
  }, [medidas, ingredienteMap, utensilioMap]);

  const pendencias = useMemo(
    () => diagnostico.rows.filter(r => r.legado || r.problemas.length > 0).slice(0, 250),
    [diagnostico]
  );

  const ingredientesFiltrados = useMemo(() => {
    const q = buscaIngrediente.trim().toLowerCase();
    if (!q) return [];
    return ingredientes.filter(i => i.nome?.toLowerCase().includes(q)).slice(0, 30);
  }, [ingredientes, buscaIngrediente]);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["auditoria-medidas-caseiras"] }),
      qc.invalidateQueries({ queryKey: ["medidas-caseiras"] }),
      qc.invalidateQueries({ queryKey: ["itens-receita"] }),
    ]);
  };

  const handleNormalizar = async () => {
    setNormalizando(true);
    try {
      const res = await base44.functions.invoke("normalizarMedidasCaseiras", {});
      const dados = res?.data || {};
      await refresh();
      toast.success(`${dados.total_normalizado || 0} medida(s) normalizada(s); ${dados.total_a_revisar || 0} mantida(s) para revisão.`);
    } catch (error) {
      toast.error("Erro ao normalizar medidas: " + (error?.message || "erro desconhecido"));
    } finally {
      setNormalizando(false);
    }
  };

  const abrirCorrecao = (row) => {
    const qtd = Number(row.mc.quantidade_utensilio) > 0 ? Number(row.mc.quantidade_utensilio) : 1;
    setEditando(row);
    setForm({
      ingrediente_id: row.ingredienteId || "",
      utensilio_id: row.utensilioId || "",
      quantidade_utensilio: qtd,
      peso_g: numeroTexto(row.mc.peso_g || (row.pesoPorMedidaG ? row.pesoPorMedidaG * qtd : 0)),
      volume_ml: numeroTexto(row.mc.volume_ml || (row.volumePorMedidaMl ? row.volumePorMedidaMl * qtd : 0)),
      estado_alimento: row.mc.estado_alimento || "não informado",
      fonte: row.mc.fonte || "Saneamento manual",
      so_gramas: !!row.mc.so_gramas,
    });
    setBuscaIngrediente(ingredienteMap[row.ingredienteId]?.nome || row.mc.ingrediente_especifico || "");
  };

  const salvarCorrecao = async () => {
    if (!editando || !form) return;
    setAcaoId(`corrigir:${editando.mc.id}`);
    try {
      await base44.functions.invoke("sanearMedidaCaseira", {
        acao: "corrigir",
        medida_id: editando.mc.id,
        ingrediente_id: form.ingrediente_id,
        utensilio_id: form.so_gramas ? "" : form.utensilio_id,
        quantidade_utensilio: Number(form.quantidade_utensilio) || 1,
        peso_g: Number(String(form.peso_g).replace(",", ".")) || 0,
        volume_ml: Number(String(form.volume_ml).replace(",", ".")) || 0,
        estado_alimento: form.estado_alimento,
        fonte: form.fonte,
        so_gramas: form.so_gramas,
      });
      await refresh();
      setEditando(null);
      setForm(null);
      toast.success("Medida corrigida e normalizada.");
    } catch (error) {
      toast.error("Erro ao corrigir: " + (error?.message || "erro desconhecido"));
    } finally {
      setAcaoId(null);
    }
  };

  const separarPronto = async (row) => {
    if (!window.confirm("Separar a equivalência pronta em um novo registro e manter a origem como cru?")) return;
    setAcaoId(`pronto:${row.mc.id}`);
    try {
      await base44.functions.invoke("sanearMedidaCaseira", { acao: "separar_pronto", medida_id: row.mc.id });
      await refresh();
      toast.success("Equivalência pronta separada em registro próprio.");
    } catch (error) {
      toast.error("Erro ao separar medida pronta: " + (error?.message || "erro desconhecido"));
    } finally {
      setAcaoId(null);
    }
  };

  const consolidarGrupo = async (grupo, manterId) => {
    const removerIds = grupo.rows.map(r => r.mc.id).filter(id => id !== manterId);
    if (!window.confirm(`Manter este registro e consolidar ${removerIds.length} duplicado(s)? As receitas serão repontadas antes da exclusão.`)) return;
    setAcaoId(`merge:${manterId}`);
    try {
      const res = await base44.functions.invoke("sanearMedidaCaseira", {
        acao: "consolidar_duplicados",
        manter_id: manterId,
        remover_ids: removerIds,
      });
      const dados = res?.data || {};
      await refresh();
      toast.success(`${dados.medidas_removidas || removerIds.length} duplicado(s) consolidado(s); ${dados.ingrediente_receita_atualizados || 0} vínculo(s) repontado(s).`);
    } catch (error) {
      toast.error("Erro ao consolidar duplicados: " + (error?.message || "erro desconhecido"));
    } finally {
      setAcaoId(null);
    }
  };

  if (l1 || l2 || l3) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Medidas Caseiras · Migração e Saneamento</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Fase 7.1: normaliza registros seguros, corrige vínculos manualmente, separa cru × pronto e consolida duplicidades preservando referências das receitas.
          </p>
        </div>
        <Button onClick={handleNormalizar} disabled={normalizando} className="gap-2">
          {normalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
          Normalizar registros seguros
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{diagnostico.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Modelo v2</p><p className="text-xl font-bold text-primary">{diagnostico.v2}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Legados</p><p className="text-xl font-bold text-amber-600">{diagnostico.legados}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Duplicados</p><p className="text-xl font-bold text-amber-700">{diagnostico.duplicadosTotal}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">A revisar</p><p className="text-xl font-bold text-destructive">{diagnostico.revisar}</p></Card>
      </div>

      {diagnostico.duplicados.length > 0 && (
        <Card className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Merge className="w-4 h-4" /> Duplicidades canônicas</h3>
            <p className="text-xs text-muted-foreground mt-1">Escolha explicitamente qual registro deve ser mantido. Os vínculos das receitas serão migrados antes da exclusão dos demais.</p>
          </div>
          {diagnostico.duplicados.map(grupo => (
            <div key={grupo.chave} className="border rounded-lg p-3">
              <p className="text-xs font-mono text-muted-foreground mb-2">{grupo.chave}</p>
              <div className="space-y-2">
                {grupo.rows.map(row => {
                  const ingNome = ingredienteMap[row.ingredienteId]?.nome || row.mc.nome || "—";
                  const ute = utensilioMap[row.utensilioId];
                  const uteNome = ute?.descricao_singular || ute?.nome || ute?.simbolo || "—";
                  return (
                    <div key={row.mc.id} className="flex flex-wrap items-center gap-2 text-sm border-t first:border-t-0 pt-2 first:pt-0">
                      <span className="font-medium flex-1 min-w-[220px]">{ingNome} · {uteNome} · {row.mc.estado_alimento || "não informado"} · {row.pesoPorMedidaG ? `${row.pesoPorMedidaG} g/medida` : "sem peso"}</span>
                      <span className="text-xs text-muted-foreground">{row.mc.fonte || "sem fonte"}</span>
                      <Button size="sm" variant="outline" onClick={() => consolidarGrupo(grupo, row.mc.id)} disabled={!!acaoId}>
                        {acaoId === `merge:${row.mc.id}` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Merge className="w-3.5 h-3.5 mr-1" />}
                        Manter este
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      )}

      {pendencias.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-medium">Nenhuma pendência de medida caseira encontrada.</p>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.25fr_1fr_100px_80px_1.5fr_180px] gap-2 px-3 py-2 bg-secondary/50 text-[10px] uppercase font-semibold text-muted-foreground">
            <div>Ingrediente</div><div>Utensílio</div><div>Estado</div><div>Modelo</div><div>Diagnóstico</div><div>Ações</div>
          </div>
          {pendencias.map(row => {
            const ingNome = ingredienteMap[row.ingredienteId]?.nome || row.mc.ingrediente_especifico || row.mc.nome || "—";
            const ute = utensilioMap[row.utensilioId];
            const uteNome = ute?.descricao_singular || ute?.nome || ute?.simbolo || row.utensilioId || "—";
            const temPronto = row.problemas.includes("medida_pronto_legada_a_separar");
            return (
              <div key={row.mc.id} className="grid md:grid-cols-[1.25fr_1fr_100px_80px_1.5fr_180px] gap-2 px-3 py-2.5 border-t border-border text-sm items-center">
                <div className="min-w-0 truncate" title={ingNome}>{ingNome}</div>
                <div className="min-w-0 truncate" title={uteNome}>{uteNome}</div>
                <div><Badge variant="outline" className="text-[10px]">{row.mc.estado_alimento || "não informado"}</Badge></div>
                <div><Badge variant={row.legado ? "secondary" : "outline"} className="text-[10px]">v{row.modeloVersao}</Badge></div>
                <div className="text-xs">
                  {row.problemas.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="w-3 h-3 shrink-0" /> {row.problemas.join(", ")}</span>
                  ) : (
                    <span className="text-amber-700">Legado normalizável</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => abrirCorrecao(row)} disabled={!!acaoId}>
                    <Pencil className="w-3 h-3 mr-1" /> Corrigir
                  </Button>
                  {temPronto && (
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => separarPronto(row)} disabled={!!acaoId}>
                      {acaoId === `pronto:${row.mc.id}` ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Split className="w-3 h-3 mr-1" />}
                      Separar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {diagnostico.rows.filter(r => r.legado || r.problemas.length > 0).length > 250 && (
        <p className="text-xs text-muted-foreground">Exibindo as primeiras 250 pendências. Os totais consideram todos os registros carregados.</p>
      )}

      <Dialog open={!!editando} onOpenChange={(v) => { if (!v) { setEditando(null); setForm(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Corrigir Medida Caseira</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Ingrediente *</Label>
                <Input value={buscaIngrediente} onChange={e => setBuscaIngrediente(e.target.value)} placeholder="Buscar ingrediente..." className="mt-1" />
                {buscaIngrediente && (
                  <div className="mt-1 max-h-32 overflow-auto border rounded-md">
                    {ingredientesFiltrados.map(ing => (
                      <button key={ing.id} type="button" onClick={() => { setForm(f => ({ ...f, ingrediente_id: ing.id })); setBuscaIngrediente(ing.nome); }} className={`w-full text-left px-2 py-1.5 text-sm hover:bg-accent ${form.ingrediente_id === ing.id ? "bg-accent" : ""}`}>
                        {ing.nome}
                      </button>
                    ))}
                  </div>
                )}
                {form.ingrediente_id && <p className="text-[11px] text-muted-foreground mt-1">Selecionado: {ingredienteMap[form.ingrediente_id]?.nome || form.ingrediente_id}</p>}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.so_gramas} onChange={e => setForm(f => ({ ...f, so_gramas: e.target.checked }))} />
                Exibir somente em gramas
              </label>

              {!form.so_gramas && (
                <div>
                  <Label>Utensílio *</Label>
                  <select value={form.utensilio_id} onChange={e => setForm(f => ({ ...f, utensilio_id: e.target.value }))} className="w-full h-9 mt-1 rounded-md border border-input bg-transparent px-2 text-sm">
                    <option value="">Selecione...</option>
                    {utensilios.map(u => <option key={u.id} value={u.id}>{u.simbolo || u.nome} — {u.descricao_singular || u.nome || ""}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div><Label>Qtd. utensílio</Label><Input type="number" min="0.01" step="0.01" value={form.quantidade_utensilio} onChange={e => setForm(f => ({ ...f, quantidade_utensilio: e.target.value }))} className="mt-1" /></div>
                <div><Label>Peso total (g)</Label><Input type="number" min="0" step="0.01" value={form.peso_g} onChange={e => setForm(f => ({ ...f, peso_g: e.target.value }))} className="mt-1" /></div>
                <div><Label>Volume total (ml)</Label><Input type="number" min="0" step="0.01" value={form.volume_ml} onChange={e => setForm(f => ({ ...f, volume_ml: e.target.value }))} className="mt-1" /></div>
              </div>

              <div>
                <Label>Estado</Label>
                <select value={form.estado_alimento} onChange={e => setForm(f => ({ ...f, estado_alimento: e.target.value }))} className="w-full h-9 mt-1 rounded-md border border-input bg-transparent px-2 text-sm">
                  <option value="cru">Cru</option><option value="pronto">Pronto</option><option value="não informado">Não informado</option>
                </select>
              </div>
              <div><Label>Fonte</Label><Input value={form.fonte} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))} className="mt-1" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditando(null); setForm(null); }}>Cancelar</Button>
            <Button onClick={salvarCorrecao} disabled={!!acaoId || !form?.ingrediente_id}>
              {acaoId?.startsWith("corrigir:") && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salvar correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
