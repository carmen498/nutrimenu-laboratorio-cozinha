import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const DECISAO_LABEL = {
  confirmar_id_atual: "Confirmar ID atual e normalizar nome",
  reapontar_ingrediente: "Reapontar para outro ingrediente mestre",
  manter_pendente: "Manter pendente",
};

const WORKFLOW_LABEL = {
  nao_analisado: "Não analisado",
  em_analise: "Em análise",
  decisao_pendente: "Decisão pendente",
  mantido_pendente: "Mantido pendente",
  resolvido: "Resolvido",
};

const MOTIVO_LABEL = {
  sem_evidencia_exata: "sem evidência exata",
  evidencia_exata_conflitante: "evidências exatas conflitantes",
  sinonimo_exato_outro_id_requer_curadoria: "sinônimo aponta para outro ID",
  mesma_fonte_com_evidencias_conflitantes: "fonte com evidências conflitantes",
};

const PRIORIDADE_LABEL = { alta: "P0 · Alta", media: "P1 · Média", baixa: "P2 · Baixa" };
const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function GrupoCard({ grupo, onCurar }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex flex-wrap justify-between gap-2 items-start">
        <div className="min-w-0">
          <p className="font-semibold truncate" title={grupo.nome_cache}>{grupo.nome_cache}</p>
          <p className="text-[11px] text-muted-foreground truncate" title={grupo.ingrediente_origem_nome}>
            ID atual → {grupo.ingrediente_origem_nome || grupo.ingrediente_origem_id}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px]">{MOTIVO_LABEL[grupo.tipo_conflito] || grupo.tipo_conflito}</Badge>
            {grupo.categoria && <Badge variant="secondary" className="text-[10px]">{grupo.categoria}</Badge>}
            <Badge variant={grupo.prioridade === "alta" ? "destructive" : "secondary"} className="text-[10px]">
              Prioridade {PRIORIDADE_LABEL[grupo.prioridade] || grupo.prioridade}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{WORKFLOW_LABEL[grupo.workflow_status] || grupo.workflow_status}</Badge>
          </div>
        </div>
        <Button size="sm" onClick={() => onCurar(grupo)} className="gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Curar grupo
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-muted-foreground">Receitas</span><p className="font-bold">{grupo.receitas || 0}</p></div>
        <div><span className="text-muted-foreground">Ocorrências</span><p className="font-bold">{grupo.ocorrencias || 0}</p></div>
        <div><span className="text-muted-foreground">Fontes</span><p className="font-bold">{grupo.source_item_ids?.length || 0}</p></div>
      </div>
      {grupo.exemplos?.length > 0 && <p className="text-[11px] text-muted-foreground line-clamp-2">Ex.: {grupo.exemplos.join(" · ")}</p>}
    </Card>
  );
}

export default function CuradoriaDivergenciasIngrediente() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [workflow, setWorkflow] = useState("todos");
  const [prioridade, setPrioridade] = useState("todas");
  const [grupo, setGrupo] = useState(null);
  const [decisao, setDecisao] = useState("confirmar_id_atual");
  const [destinoId, setDestinoId] = useState("");
  const [buscaDestino, setBuscaDestino] = useState("");
  const [observacao, setObservacao] = useState("");
  const [simulacao, setSimulacao] = useState(null);
  const [processando, setProcessando] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["curadoria-divergencias-ingrediente"],
    queryFn: async () => (await base44.functions.invoke("curadoriaDivergenciasIngrediente", { acao: "listar" }))?.data || {},
    staleTime: 0,
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["curadoria-divergencias-ingredientes-mestre"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "nome"),
    staleTime: 5 * 60 * 1000,
  });

  const grupos = useMemo(() => {
    const termo = norm(busca).trim();
    return (data?.grupos || []).filter((g) => {
      if (workflow !== "todos" && g.workflow_status !== workflow) return false;
      if (prioridade !== "todas" && g.prioridade !== prioridade) return false;
      if (!termo) return true;
      return norm(g.nome_cache).includes(termo)
        || norm(g.ingrediente_origem_nome).includes(termo)
        || (g.exemplos || []).some((x) => norm(x).includes(termo));
    });
  }, [data, busca, workflow, prioridade]);

  const candidatos = useMemo(() => {
    if (!grupo || decisao !== "reapontar_ingrediente") return [];
    const termo = norm(buscaDestino).trim();
    const sugeridos = grupo.sugestoes || [];
    if (!termo) return sugeridos.slice(0, 10);
    const usados = new Set();
    const out = [];
    for (const s of sugeridos) {
      if ((norm(s.nome).includes(termo) || norm(s.categoria).includes(termo)) && !usados.has(s.id)) {
        out.push(s); usados.add(s.id);
      }
    }
    for (const i of ingredientes) {
      if (out.length >= 24) break;
      if (!i?.id || i.id === grupo.ingrediente_origem_id || usados.has(i.id)) continue;
      if (norm(i.nome).includes(termo) || norm(i.categoria).includes(termo)) {
        out.push({ id: i.id, nome: i.nome, categoria: i.categoria, evidencia: "busca", score: null });
        usados.add(i.id);
      }
    }
    return out;
  }, [grupo, decisao, buscaDestino, ingredientes]);

  const abrir = (g) => {
    setGrupo(g);
    setDecisao("confirmar_id_atual");
    setDestinoId("");
    setBuscaDestino("");
    setObservacao(g.workflow_observacao || "");
    setSimulacao(null);
  };

  const payload = (acao) => ({
    acao,
    grupo_chave: grupo?.grupo_chave,
    decisao,
    ingrediente_destino_id: destinoId || undefined,
    observacao: observacao || undefined,
  });

  const sincronizarFila = async () => {
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("curadoriaDivergenciasIngrediente", { acao: "sincronizar_fila" });
      const s = res?.data?.sincronizacao || {};
      await refetch();
      toast.success(`Fila 10.4.2: ${s.grupos_vivos || 0} grupo(s), ${s.criados || 0} novo(s), ${s.resolvidos || 0} encerrado(s).`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Erro ao sincronizar fila 10.4.2.");
    } finally { setProcessando(false); }
  };

  const atualizarStatus = async (status) => {
    if (!grupo) return;
    setProcessando(true);
    try {
      await base44.functions.invoke("curadoriaDivergenciasIngrediente", {
        acao: "atualizar_workflow",
        grupo_chave: grupo.grupo_chave,
        workflow_status: status,
        observacao: observacao || undefined,
      });
      setGrupo((g) => g ? { ...g, workflow_status: status } : g);
      await refetch();
      toast.success(`Status: ${WORKFLOW_LABEL[status] || status}.`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Erro ao atualizar status.");
    } finally { setProcessando(false); }
  };

  const simular = async () => {
    if (!grupo) return;
    if (decisao === "reapontar_ingrediente" && !destinoId) return toast.error("Selecione o ingrediente mestre de destino.");
    if (decisao !== "manter_pendente" && observacao.trim().length < 8) return toast.error("Informe uma justificativa técnica com pelo menos 8 caracteres.");
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("curadoriaDivergenciasIngrediente", payload("simular"));
      setSimulacao(res?.data?.simulacao || null);
      toast.success("Impacto simulado. Nenhuma alteração foi aplicada.");
    } catch (error) {
      setSimulacao(null);
      toast.error(error?.response?.data?.error || error?.message || "Erro ao simular curadoria.");
    } finally { setProcessando(false); }
  };

  const aplicar = async () => {
    if (!simulacao?.assinatura) return;
    const texto = decisao === "manter_pendente"
      ? `Registrar este grupo como mantido pendente?`
      : `${DECISAO_LABEL[decisao]} em ${simulacao.impacto_fontes || 0} fonte(s) / ${simulacao.impacto_receitas || 0} receita(s)?`;
    if (!window.confirm(texto)) return;
    setProcessando(true);
    try {
      const res = await base44.functions.invoke("curadoriaDivergenciasIngrediente", {
        ...payload("aplicar"),
        assinatura: simulacao.assinatura,
        confirmar: true,
      });
      const dados = res?.data || {};
      if (dados.status === "aplicada") {
        if (dados.requer_sincronizacao_subreceitas) {
          await base44.functions.invoke("sincronizarSubreceita", { todos_desatualizados: true, dry_run: false });
        }
        if ((dados.receita_ids_recalcular || []).length > 0) {
          await base44.functions.invoke("normalizarCustosReceitas", { dry_run: false, receita_ids: dados.receita_ids_recalcular });
        }
      }
      setGrupo(null);
      setSimulacao(null);
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ["auditoria-custos-receitas"] }),
        qc.invalidateQueries({ queryKey: ["receitas"] }),
        qc.invalidateQueries({ queryKey: ["itens-receita"] }),
      ]);
      toast.success(dados.status === "mantida_pendente" ? "Grupo mantido pendente e decisão auditada." : "Curadoria aplicada, dependências invalidadas e custos recalculados.");
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
            <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Fases 10.4.2–10.4.2.1 — Curadoria ID × nome</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Fila humana para divergências residuais, com P0/P1 curados por evidência contextual do próprio cadastro. Similaridade é apenas sugestão; toda mudança de identidade exige justificativa e confirmação explícita.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="px-3 py-1.5 rounded border text-center"><p className="text-[10px] text-muted-foreground">Ocorrências</p><p className="font-bold">{data?.ocorrencias_residuais || 0}</p></div>
            <div className="px-3 py-1.5 rounded border text-center"><p className="text-[10px] text-muted-foreground">Grupos</p><p className="font-bold">{data?.total_grupos || 0}</p></div>
            <div className="px-3 py-1.5 rounded border text-center"><p className="text-[10px] text-muted-foreground">P0 abertos</p><p className="font-bold">{data?.prioridades?.alta || 0}</p></div>
            <Button variant="outline" size="sm" onClick={sincronizarFila} disabled={processando} className="gap-1.5">
              {processando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sincronizar fila
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ingrediente ou receita..." className="pl-8" />
        </div>
        <Select value={workflow} onValueChange={setWorkflow}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="nao_analisado">Não analisado</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="decisao_pendente">Decisão pendente</SelectItem>
            <SelectItem value="mantido_pendente">Mantido pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={prioridade} onValueChange={setPrioridade}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas prioridades</SelectItem>
            <SelectItem value="alta">P0 · Alta · 20+</SelectItem>
            <SelectItem value="media">P1 · Média · 5–19</SelectItem>
            <SelectItem value="baixa">P2 · Baixa · 1–4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid xl:grid-cols-2 gap-3">
        {grupos.map((g) => <GrupoCard key={g.grupo_chave} grupo={g} onCurar={abrir} />)}
      </div>
      {grupos.length === 0 && <Card className="p-8 text-center"><CheckCircle2 className="w-7 h-7 mx-auto text-primary mb-2" /><p>Nenhuma divergência residual corresponde ao filtro.</p></Card>}

      {grupo && (
        <Card className="p-4 border-primary/50 sticky bottom-4 shadow-lg bg-background z-20">
          <div className="flex flex-wrap justify-between gap-2 items-start">
            <div>
              <p className="font-semibold">Curar: {grupo.nome_cache}</p>
              <p className="text-xs text-muted-foreground">Atual: {grupo.ingrediente_origem_nome} · {grupo.ocorrencias} ocorrência(s) · {grupo.receitas} receita(s)</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setGrupo(null); setSimulacao(null); }} disabled={processando}>Fechar</Button>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs font-medium">Status da curadoria</label>
              <Select value={grupo.workflow_status || "nao_analisado"} onValueChange={atualizarStatus} disabled={processando || grupo.workflow_status === "mantido_pendente"}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_analisado">Não analisado</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="decisao_pendente">Decisão pendente</SelectItem>
                  {grupo.workflow_status === "mantido_pendente" && <SelectItem value="mantido_pendente">Mantido pendente</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium">Decisão</label>
              <Select value={decisao} onValueChange={(v) => { setDecisao(v); setSimulacao(null); if (v !== "reapontar_ingrediente") setDestinoId(""); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmar_id_atual">Confirmar ID atual e normalizar nome</SelectItem>
                  <SelectItem value="reapontar_ingrediente">Reapontar para outro ingrediente mestre</SelectItem>
                  <SelectItem value="manter_pendente">Manter pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {decisao === "confirmar_id_atual" && (
            <p className="text-[11px] text-amber-800 mt-2 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Confirme somente quando o nome-cache for sinônimo/descrição válida do mestre atual. O ID não muda.</p>
          )}
          {decisao === "reapontar_ingrediente" && (
            <div className="mt-3 space-y-2">
              <Input value={buscaDestino} onChange={(e) => setBuscaDestino(e.target.value)} placeholder="Buscar ingrediente mestre de destino..." />
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                {candidatos.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setDestinoId(c.id); setSimulacao(null); }} className={`text-left rounded border px-2 py-1 text-xs ${destinoId === c.id ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-muted-foreground"> · {c.categoria || "—"}{c.evidencia === "exata" ? " · evidência exata" : c.score != null ? ` · sugestão ${Number(c.score).toFixed(0)}/100` : ""}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-amber-800 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Score de similaridade não é evidência técnica e nunca é aplicado automaticamente.</p>
            </div>
          )}

          <div className="mt-3">
            <label className="text-xs font-medium">Justificativa técnica {decisao === "manter_pendente" ? "(opcional)" : "· obrigatória"}</label>
            <Input value={observacao} onChange={(e) => { setObservacao(e.target.value); setSimulacao(null); }} placeholder="Fundamento da decisão cadastral..." className="mt-1" />
          </div>

          {simulacao && (
            <div className="mt-3 rounded border bg-secondary/30 p-3">
              <p className="text-xs font-semibold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Simulação assinada — nenhum dado alterado ainda</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div><span className="text-muted-foreground">Fontes</span><p className="font-bold">{simulacao.impacto_fontes || 0}</p></div>
                <div><span className="text-muted-foreground">Ocorrências</span><p className="font-bold">{simulacao.impacto_ocorrencias || 0}</p></div>
                <div><span className="text-muted-foreground">Receitas</span><p className="font-bold">{simulacao.impacto_receitas || 0}</p></div>
              </div>
              {simulacao.ingrediente_destino && <p className="text-xs mt-2">Destino: <strong>{simulacao.ingrediente_destino.nome}</strong></p>}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={simular} disabled={processando} className="gap-1.5">{processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Simular impacto</Button>
            <Button onClick={aplicar} disabled={processando || !simulacao?.assinatura} className="gap-1.5"><ShieldCheck className="w-4 h-4" /> Aplicar decisão</Button>
          </div>
        </Card>
      )}

      {(data?.historico || []).length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2">Histórico de decisões 10.4.2</h4>
          <div className="space-y-1.5 text-xs">
            {data.historico.slice(0, 15).map((h) => (
              <div key={h.id} className="border-t first:border-0 pt-1.5 first:pt-0 flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-medium">{h.nome_cache || h.grupo_chave}</span>
                <span>{DECISAO_LABEL[h.decisao] || h.decisao}</span>
                <span>{h.impacto_receitas || 0} receita(s)</span>
                <Badge variant={h.status === "aplicada" ? "secondary" : "outline"} className="text-[10px]">{h.status}</Badge>
                <span className="text-muted-foreground">{h.executado_em ? new Date(h.executado_em).toLocaleString("pt-BR") : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
