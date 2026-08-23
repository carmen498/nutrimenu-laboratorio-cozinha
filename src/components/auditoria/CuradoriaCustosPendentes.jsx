import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const DECISAO_LABEL = {
  definir_preco_mestre: "Definir preço do genérico",
  reapontar_ingrediente: "Reapontar para ingrediente mestre",
  reaproveitamento_processo: "Reaproveitamento de processo",
  manter_pendente: "Manter pendente",
};

const norm = (v) => String(v || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

function opcoesDecisao(grupo) {
  if (grupo?.tipo_pendencia === "ingrediente_sem_preco") {
    return ["definir_preco_mestre", "reapontar_ingrediente", "reaproveitamento_processo", "manter_pendente"];
  }
  if (grupo?.tipo_pendencia === "referencia_ingrediente") {
    return ["reapontar_ingrediente", "manter_pendente"];
  }
  return ["manter_pendente"];
}

function GrupoCard({ grupo, onCurar }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex flex-wrap justify-between gap-2 items-start">
        <div className="min-w-0">
          <p className="font-semibold truncate" title={grupo.nome}>{grupo.nome}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px]">{grupo.tipo_pendencia === "ingrediente_sem_preco" ? "sem preço" : grupo.tipo_pendencia === "referencia_ingrediente" ? "referência" : grupo.motivo || "outro"}</Badge>
            {grupo.categoria && <Badge variant="secondary" className="text-[10px]">{grupo.categoria}</Badge>}
            {grupo.contexto && <Badge variant="outline" className="text-[10px]">{grupo.contexto}</Badge>}
          </div>
        </div>
        <Button size="sm" onClick={() => onCurar(grupo)} className="gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Curar grupo
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div><span className="text-muted-foreground">Receitas</span><p className="font-bold">{grupo.receitas || 0}</p></div>
        <div><span className="text-muted-foreground">Ocorrências</span><p className="font-bold">{grupo.ocorrencias || 0}</p></div>
        <div><span className="text-muted-foreground">Preço atual</span><p className="font-bold">{grupo.preco_por_kg_rs ? `R$ ${Number(grupo.preco_por_kg_rs).toFixed(2)}/kg` : "—"}</p></div>
        <div><span className="text-muted-foreground">Sugestões</span><p className="font-bold">{grupo.sugestoes?.length || 0}</p></div>
      </div>
      {grupo.exemplos?.length > 0 && <p className="text-[11px] text-muted-foreground line-clamp-2">Ex.: {grupo.exemplos.join(" · ")}</p>}
    </Card>
  );
}

export default function CuradoriaCustosPendentes() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [grupo, setGrupo] = useState(null);
  const [decisao, setDecisao] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [buscaDestino, setBuscaDestino] = useState("");
  const [precoKg, setPrecoKg] = useState("");
  const [precoEmb, setPrecoEmb] = useState("");
  const [pesoEmb, setPesoEmb] = useState("");
  const [observacao, setObservacao] = useState("");
  const [simulacao, setSimulacao] = useState(null);
  const [processando, setProcessando] = useState(false);

  const { data: fila, isLoading, refetch } = useQuery({
    queryKey: ["curadoria-custos-pendentes"],
    queryFn: async () => (await base44.functions.invoke("curadoriaCustosPendentes", { acao: "listar" }))?.data || {},
    staleTime: 0,
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["curadoria-custos-ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "nome", 1000),
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["curadoria-custos-logs"],
    queryFn: () => base44.entities.CuradoriaCustoPendencia.list("-executado_em", 30),
    staleTime: 30 * 1000,
  });

  const grupos = useMemo(() => {
    const all = [...(fila?.grupos?.precos || []), ...(fila?.grupos?.referencias || []), ...(fila?.grupos?.outros || [])];
    const q = norm(busca).trim();
    return all.filter((g) => {
      if (tipo !== "todos" && g.tipo_pendencia !== tipo) return false;
      if (!q) return true;
      return norm(g.nome).includes(q) || norm(g.categoria).includes(q) || (g.exemplos || []).some((e) => norm(e).includes(q));
    });
  }, [fila, busca, tipo]);

  const candidatosDestino = useMemo(() => {
    if (!grupo || decisao !== "reapontar_ingrediente") return [];
    const q = norm(buscaDestino).trim();
    const sugeridos = grupo.sugestoes || [];
    if (!q) return sugeridos.slice(0, 12);
    const ids = new Set();
    const rows = [];
    for (const s of sugeridos) {
      if ((norm(s.nome).includes(q) || norm(s.categoria).includes(q)) && !ids.has(s.id)) {
        rows.push(s); ids.add(s.id);
      }
    }
    for (const i of ingredientes) {
      if (rows.length >= 20) break;
      if (!i?.id || ids.has(i.id)) continue;
      if (norm(i.nome).includes(q) || norm(i.categoria).includes(q)) {
        rows.push({ id: i.id, nome: i.nome, categoria: i.categoria, preco_por_g_rs: Number(i.preco_por_g_rs) > 0 ? Number(i.preco_por_g_rs) : null, preco_por_kg_rs: Number(i.preco_por_g_rs) > 0 ? Number(i.preco_por_g_rs) * 1000 : null });
        ids.add(i.id);
      }
    }
    return rows;
  }, [grupo, decisao, buscaDestino, ingredientes]);

  const abrirGrupo = (g) => {
    setGrupo(g);
    setDecisao(opcoesDecisao(g)[0]);
    setDestinoId(g.sugestoes?.[0]?.id || "");
    setBuscaDestino("");
    setPrecoKg(""); setPrecoEmb(""); setPesoEmb(""); setObservacao(""); setSimulacao(null);
  };

  const argsDecisao = () => ({
    acao: "simular",
    grupo_chave: grupo?.grupo_chave,
    decisao,
    ingrediente_destino_id: destinoId || undefined,
    preco_por_kg_rs: Number(precoKg) || undefined,
    preco_embalagem_rs: Number(precoEmb) || undefined,
    peso_embalagem_g: Number(pesoEmb) || undefined,
    observacao: observacao || undefined,
  });

  const simular = async () => {
    if (!grupo || !decisao) return;
    if (decisao === "reapontar_ingrediente" && !destinoId) return toast.error("Selecione o ingrediente mestre de destino.");
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("curadoriaCustosPendentes", argsDecisao());
      setSimulacao(res?.data?.simulacao || null);
      toast.success("Impacto simulado. Nenhum dado foi alterado.");
    } catch (error) {
      setSimulacao(null);
      toast.error(error?.response?.data?.error || error?.message || "Erro ao simular curadoria.");
    } finally { setProcessando(false); }
  };

  const aplicar = async () => {
    if (!simulacao?.assinatura) return;
    const ok = window.confirm(`${DECISAO_LABEL[simulacao.decisao] || simulacao.decisao}: aplicar em ${simulacao.impacto_receitas || 0} receita(s)? Impacto total previsto no catálogo: ${simulacao.impacto_total_catalogo || 0} receita(s).`);
    if (!ok) return;
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("curadoriaCustosPendentes", { ...argsDecisao(), acao: "aplicar", assinatura: simulacao.assinatura, confirmar: true });
      const dados = res?.data || {};
      if (dados.status !== "mantida_pendente") {
        if (dados.requer_sincronizacao_subreceitas) await base44.functions.invoke("sincronizarSubreceita", { todos_desatualizados: true, dry_run: false });
        if ((dados.receita_ids_recalcular || []).length > 0) await base44.functions.invoke("normalizarCustosReceitas", { dry_run: false, receita_ids: dados.receita_ids_recalcular });
      }
      setGrupo(null); setSimulacao(null);
      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ["curadoria-custos-logs"] }), qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas"] }), qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas-logs"] }), qc.invalidateQueries({ queryKey: ["receitas"] }), qc.invalidateQueries({ queryKey: ["ingredientes"] })]);
      toast.success(dados.status === "mantida_pendente" ? "Grupo mantido pendente e decisão registrada." : "Decisão aplicada e receitas impactadas recalculadas.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Erro ao aplicar curadoria.");
    } finally { setProcessando(false); }
  };

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/30">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Fase 10.2.1 — Curadoria assistida</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">Sugestões são apoio à decisão e nunca são aplicadas automaticamente. Toda alteração exige simulação de impacto, confirmação explícita e registro no histórico.</p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="px-3 py-1.5 rounded border"><p className="text-[10px] text-muted-foreground">Incompletas</p><p className="font-bold">{fila?.total_incompletas || 0}</p></div>
            <div className="px-3 py-1.5 rounded border"><p className="text-[10px] text-muted-foreground">Grupos</p><p className="font-bold">{fila?.total_grupos || 0}</p></div>
            <div className="px-3 py-1.5 rounded border"><p className="text-[10px] text-muted-foreground">Prontas p/ recálculo</p><p className="font-bold">{fila?.receitas_prontas_recalculo || 0}</p></div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ingrediente ou receita..." className="pl-8" /></div>
        <Select value={tipo} onValueChange={setTipo}><SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os grupos</SelectItem><SelectItem value="ingrediente_sem_preco">Sem preço</SelectItem><SelectItem value="referencia_ingrediente">Referências</SelectItem><SelectItem value="outro">Outros</SelectItem></SelectContent></Select>
      </div>

      <div className="grid xl:grid-cols-2 gap-3">{grupos.map((g) => <GrupoCard key={g.grupo_chave} grupo={g} onCurar={abrirGrupo} />)}</div>
      {grupos.length === 0 && <Card className="p-8 text-center"><CheckCircle2 className="w-7 h-7 mx-auto text-primary mb-2" /><p>Nenhum grupo corresponde ao filtro.</p></Card>}

      {grupo && (
        <Card className="p-4 border-primary/50 sticky bottom-4 shadow-lg bg-background z-20">
          <div className="flex flex-wrap justify-between gap-2 items-start mb-3">
            <div><p className="font-semibold">Curar: {grupo.nome}</p><p className="text-xs text-muted-foreground">{grupo.receitas} receita(s) · {grupo.ocorrencias} ocorrência(s)</p></div>
            <Button variant="ghost" size="sm" onClick={() => { setGrupo(null); setSimulacao(null); }} disabled={processando}>Fechar</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Decisão</label><Select value={decisao} onValueChange={(v) => { setDecisao(v); setSimulacao(null); }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{opcoesDecisao(grupo).map((d) => <SelectItem key={d} value={d}>{DECISAO_LABEL[d]}</SelectItem>)}</SelectContent></Select></div>
            {decisao === "definir_preco_mestre" && <div className="grid grid-cols-3 gap-2"><div><label className="text-xs font-medium">R$/kg ou L</label><Input type="number" min="0" step="0.01" value={precoKg} onChange={(e) => { setPrecoKg(e.target.value); setSimulacao(null); }} className="mt-1" placeholder="0,00" /></div><div><label className="text-xs font-medium">R$ embalagem</label><Input type="number" min="0" step="0.01" value={precoEmb} onChange={(e) => { setPrecoEmb(e.target.value); setSimulacao(null); }} className="mt-1" placeholder="opcional" /></div><div><label className="text-xs font-medium">g/ml embalagem</label><Input type="number" min="0" step="1" value={pesoEmb} onChange={(e) => { setPesoEmb(e.target.value); setSimulacao(null); }} className="mt-1" placeholder="opcional" /></div></div>}
          </div>
          {decisao === "definir_preco_mestre" && <p className="text-[11px] text-amber-800 mt-2 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Preço mestre é referência global e pode afetar todas as receitas que usam este ingrediente. A simulação mostra o alcance total antes de aplicar.</p>}
          {decisao === "reapontar_ingrediente" && <div className="mt-3 space-y-2"><Input value={buscaDestino} onChange={(e) => setBuscaDestino(e.target.value)} placeholder="Buscar ingrediente mestre de destino..." /><div className="flex flex-wrap gap-1.5 max-h-36 overflow-auto">{candidatosDestino.map((c) => <button key={c.id} type="button" onClick={() => { setDestinoId(c.id); setSimulacao(null); }} className={`text-left rounded border px-2 py-1 text-xs ${destinoId === c.id ? "border-primary bg-primary/10" : "hover:bg-muted"}`}><span className="font-medium">{c.nome}</span><span className="text-muted-foreground"> · {c.categoria || "—"}{c.preco_por_kg_rs ? ` · R$ ${Number(c.preco_por_kg_rs).toFixed(2)}/kg` : " · sem preço"}</span></button>)}</div></div>}
          <div className="mt-3"><label className="text-xs font-medium">Observação da decisão</label><Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional — fundamento técnico ou decisão de cadastro" className="mt-1" /></div>
          {simulacao && <div className="mt-3 rounded border bg-secondary/30 p-3"><p className="text-xs font-semibold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Simulação confirmada — nenhum dado alterado ainda</p><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs"><div><span className="text-muted-foreground">Ocorrências</span><p className="font-bold">{simulacao.impacto_ocorrencias || 0}</p></div><div><span className="text-muted-foreground">Receitas do grupo</span><p className="font-bold">{simulacao.impacto_receitas || 0}</p></div><div><span className="text-muted-foreground">Impacto no catálogo</span><p className="font-bold">{simulacao.impacto_total_catalogo || 0}</p></div><div><span className="text-muted-foreground">Preço resultante</span><p className="font-bold">{simulacao.preco_por_kg_rs ? `R$ ${Number(simulacao.preco_por_kg_rs).toFixed(2)}/kg` : "—"}</p></div></div>{simulacao.ingrediente_destino && <p className="text-xs mt-2">Destino: <strong>{simulacao.ingrediente_destino.nome}</strong></p>}{simulacao.destino_sem_preco && <p className="text-[11px] text-amber-800 mt-2 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> O ingrediente de destino também está sem preço. O reapontamento corrige a identidade, mas a receita poderá continuar incompleta até o preço ser definido.</p>}</div>}
          <div className="flex justify-end gap-2 mt-3"><Button variant="outline" onClick={simular} disabled={processando} className="gap-1.5">{processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Simular impacto</Button><Button onClick={aplicar} disabled={processando || !simulacao?.assinatura} className="gap-1.5"><ShieldCheck className="w-4 h-4" /> Aplicar decisão</Button></div>
        </Card>
      )}

      {logs.length > 0 && <Card className="p-4"><h4 className="font-semibold text-sm mb-2">Histórico de decisões 10.2.1</h4><div className="space-y-1.5 text-xs">{logs.slice(0, 15).map((log) => <div key={log.id} className="border-t first:border-0 pt-1.5 first:pt-0 flex flex-wrap gap-x-3 gap-y-1"><span className="font-medium">{log.nome_pendencia || log.grupo_chave}</span><span>{DECISAO_LABEL[log.decisao] || log.decisao}</span><span>{log.impacto_receitas || 0} receita(s)</span><Badge variant={log.status === "aplicada" ? "secondary" : "outline"} className="text-[10px]">{log.status}</Badge><span className="text-muted-foreground">{log.executado_em ? new Date(log.executado_em).toLocaleString("pt-BR") : ""}</span></div>)}</div></Card>}
    </div>
  );
}
