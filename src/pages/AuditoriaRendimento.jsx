import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Link as LinkIcon, RefreshCw, History, CheckCircle2, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { resolverRendimentoReceita, formatarStatusRendimento } from "@/lib/rendimentoReceita";
import { formatarDataHoraBrasilia } from "@/lib/fusoBrasilia";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtFator = (v) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

function statusClass(status) {
  if (status === "confirmado") return "text-green-700 border-green-300 bg-green-50";
  if (status === "a_validar") return "text-amber-700 border-amber-300 bg-amber-50";
  if (status === "estimado") return "text-blue-700 border-blue-300 bg-blue-50";
  return "text-muted-foreground";
}

export default function AuditoriaRendimento() {
  const [normalizando, setNormalizando] = useState(false);
  const [corrigindoPorcoes, setCorrigindoPorcoes] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: receitas = [], isLoading: l1 } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });
  const { data: itens = [], isLoading: l2 } = useQuery({
    queryKey: ["ingredientesReceitaTodos"],
    queryFn: () => fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
  });
  const { data: logs = [], isLoading: l3 } = useQuery({
    queryKey: ["correcaoRendimentoLog"],
    queryFn: () => base44.entities.CorrecaoRendimentoLog.list("-created_date", 500),
  });
  const { data: logsPorcoes = [], isLoading: l4 } = useQuery({
    queryKey: ["correcaoPorcoesBaseLog"],
    queryFn: () => base44.entities.CorrecaoPorcoesBaseLog.list("-created_date", 50),
  });

  const itensPorReceita = useMemo(() => {
    const map = {};
    itens.forEach((item) => {
      if (!map[item.receita_id]) map[item.receita_id] = [];
      map[item.receita_id].push(item);
    });
    return map;
  }, [itens]);

  const auditoria = useMemo(() => receitas
    .map((receita) => {
      const info = resolverRendimentoReceita(receita, itensPorReceita[receita.id] || []);
      return {
        id: receita.id,
        nome: receita.nome,
        unidade: receita.unidade_base || "g",
        ...info,
      };
    })
    .sort((a, b) => {
      const pesoStatus = /** @type {Record<string, number>} */ ({ pendente: 0, a_validar: 1, estimado: 2, confirmado: 3 });
      return (pesoStatus[a.rendimentoStatus] ?? 9) - (pesoStatus[b.rendimentoStatus] ?? 9)
        || (a.nome || "").localeCompare(b.nome || "");
    }), [receitas, itensPorReceita]);

  const contagens = useMemo(() => auditoria.reduce((/** @type {Record<string, number>} */ acc, r) => {
    acc[r.rendimentoStatus] = (acc[r.rendimentoStatus] || 0) + 1;
    return acc;
  }, {}), [auditoria]);

  const handleNormalizar = async () => {
    setNormalizando(true);
    try {
      const res = await base44.functions.invoke("corrigirRendimentoReceitas", {});
      const { total_normalizado = 0 } = res?.data || {};
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["receitas"] }),
        queryClient.invalidateQueries({ queryKey: ["ingredientesReceitaTodos"] }),
      ]);
      toast({
        title: "Rendimentos normalizados",
        description: `${total_normalizado} receita${total_normalizado !== 1 ? "s" : ""} recebeu/receberam metadados técnicos. Nenhum PDP foi substituído automaticamente.`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao normalizar", description: error.message });
    } finally {
      setNormalizando(false);
    }
  };

  const handleCorrigirPorcoes = async () => {
    setCorrigindoPorcoes(true);
    try {
      const res = await base44.functions.invoke("corrigirPorcoesBaseImportacao", {});
      const { total_corrigido = 0 } = res?.data || {};
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["receitas"] }),
        queryClient.invalidateQueries({ queryKey: ["ingredientesReceitaTodos"] }),
        queryClient.invalidateQueries({ queryKey: ["correcaoPorcoesBaseLog"] }),
      ]);
      toast({ title: "Correção concluída", description: `${total_corrigido} receita${total_corrigido !== 1 ? "s" : ""} corrigida${total_corrigido !== 1 ? "s" : ""}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao corrigir", description: error.message });
    } finally {
      setCorrigindoPorcoes(false);
    }
  };

  if (l1 || l2) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" /> Auditoria de Rendimento
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Rendimento técnico = peso pós-preparo (PDP) ÷ peso líquido pré-preparo. Peso Bruto com FC pertence à compra/custo e não é usado para medir perda de cocção.
          </p>
        </div>
        <Button onClick={handleNormalizar} disabled={normalizando} className="gap-2">
          {normalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Normalizar metadados
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Confirmados</p><p className="text-xl font-bold text-green-700">{contagens.confirmado || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">A validar</p><p className="text-xl font-bold text-amber-700">{contagens.a_validar || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Estimados</p><p className="text-xl font-bold text-blue-700">{contagens.estimado || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-xl font-bold">{contagens.pendente || 0}</p></Card>
      </div>

      <Card className="p-3 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-900">
          <strong>Regra de segurança:</strong> PDP menor que o peso pré-preparo não é erro automático. Pode representar evaporação, drenagem, redução ou outra perda real do processo.
        </p>
      </Card>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.6fr_.8fr_.8fr_.6fr_.8fr_.9fr] gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50">
          <div>Receita</div><div className="text-right">Pré-preparo</div><div className="text-right">PDP</div><div className="text-right">Fator</div><div className="text-right">Variação</div><div className="text-right">Status</div>
        </div>
        {auditoria.map((r) => (
          <div key={r.id} className="grid grid-cols-2 lg:grid-cols-[1.6fr_.8fr_.8fr_.6fr_.8fr_.9fr] gap-3 px-3 py-2.5 border-t border-border items-center">
            <div className="col-span-2 lg:col-span-1 min-w-0">
              <Link to={`/receita/${r.id}`} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                {r.nome} <LinkIcon className="w-3 h-3" />
              </Link>
              <p className="text-[10px] text-muted-foreground">origem: {r.rendimentoOrigem || "—"}{r.rendimentoEstimado ? " · operacionalmente estimado" : ""}</p>
            </div>
            <div className="text-right text-sm"><span className="lg:hidden text-xs text-muted-foreground mr-1">Pré:</span>{fmt(r.pesoPrePreparo)} {r.unidade}</div>
            <div className="text-right text-sm font-semibold"><span className="lg:hidden text-xs text-muted-foreground mr-1">PDP:</span>{r.pesoPosPreparoInformado > 0 ? `${fmt(r.pesoPosPreparoInformado)} ${r.unidade}` : "—"}</div>
            <div className="text-right text-sm"><span className="lg:hidden text-xs text-muted-foreground mr-1">FR:</span>{fmtFator(r.fatorRendimento)}</div>
            <div className={`text-right text-sm ${r.variacaoPercentual > 0 ? "text-blue-700" : r.variacaoPercentual < 0 ? "text-amber-700" : ""}`}>
              {r.variacaoPercentual == null ? "—" : `${r.variacaoPercentual > 0 ? "+" : ""}${r.variacaoPercentual.toFixed(1).replace(".", ",")}%`}
            </div>
            <div className="text-right">
              <Badge variant="outline" className={`text-xs ${statusClass(r.rendimentoStatus)}`}>{formatarStatusRendimento(r.rendimentoStatus)}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Histórico legado de correções</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-2">
          Registros anteriores à Fase 5 são mantidos para rastreabilidade. A regra automática antiga não é mais executada.
        </p>
        {l3 ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logs.length === 0 ? (
          <Card className="p-5 text-center text-muted-foreground text-sm">Nenhuma correção histórica registrada.</Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {logs.slice(0, 100).map((log) => (
              <div key={log.id} className="flex flex-wrap gap-2 items-center px-3 py-2 border-t border-border text-sm">
                <div className="flex-1 min-w-[220px]">{log.receita_nome}</div>
                <div className="text-muted-foreground">{fmt(log.rendimento_anterior)} → <strong>{fmt(log.rendimento_novo)} g</strong></div>
                <div className="text-xs text-muted-foreground">{formatarDataHoraBrasilia(log.created_date) || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold flex items-center gap-2"><Clock3 className="w-5 h-5 text-primary" /> Correção de Importação (porções base)</h2>
            <p className="text-sm text-muted-foreground mt-1">Rotina independente da medição de rendimento, mantida sem alteração.</p>
          </div>
          <Button onClick={handleCorrigirPorcoes} disabled={corrigindoPorcoes} variant="outline" className="gap-2">
            {corrigindoPorcoes ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Corrigir importação
          </Button>
        </div>
        {l4 ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logsPorcoes.length > 0 ? (
          <p className="text-xs text-muted-foreground mt-2">{logsPorcoes.length} registro{logsPorcoes.length !== 1 ? "s" : ""} no histórico de correção de porções.</p>
        ) : null}
      </div>
    </div>
  );
}