import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Link as LinkIcon, Wand2, History } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { fetchAllPages } from "@/lib/fetchAllPages";

// Relatório de rendimento_total suspeito (provável erro de unidade, ex: kg em vez de g):
// - rendimento_total < 100 (quase certamente gravado em kg)
// - rendimento_total < soma dos pesos dos próprios ingredientes (não pode ser menor que os insumos que a compõem)
// O botão "Corrigir rendimentos" ajusta rendimento_total = soma dos ingredientes para
// toda receita com rendimento zerado ou menor que a soma dos insumos (ver função
// corrigirRendimentoReceitas). Cada correção gera um registro persistente em
// CorrecaoRendimentoLog, exibido abaixo.

export default function AuditoriaRendimento() {
  const [corrigindo, setCorrigindo] = useState(false);
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

  const isLoading = l1 || l2;

  const somaPorReceita = useMemo(() => {
    const map = {};
    itens.forEach(i => {
      if (i.tipo === "grupo") return;
      map[i.receita_id] = (map[i.receita_id] || 0) + (Number(i.quantidade_por_porcao) || 0) * 1; // por porção; multiplicado abaixo por porcoes_base
    });
    return map;
  }, [itens]);

  const suspeitas = useMemo(() => {
    return receitas
      .map(r => {
        const rendimento = Number(r.rendimento_total) || 0;
        if (rendimento <= 0) return null; // sem rendimento gravado = não preenchido, não é o defeito de unidade auditado aqui
        const somaBase = somaPorReceita[r.id] || 0;
        const somaIngredientes = somaBase * (Number(r.porcoes_base) || 1);
        const menorQue100 = rendimento < 100;
        const menorQueIngredientes = somaIngredientes > 0 && rendimento < somaIngredientes;
        if (!menorQue100 && !menorQueIngredientes) return null;
        return { id: r.id, nome: r.nome, rendimento_total: rendimento, somaIngredientes, menorQue100, menorQueIngredientes };
      })
      .filter(Boolean)
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [receitas, somaPorReceita]);

  const handleCorrigir = async () => {
    setCorrigindo(true);
    try {
      const res = await base44.functions.invoke("corrigirRendimentoReceitas", {});
      const { total_corrigido = 0 } = res?.data || {};
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["receitas"] }),
        queryClient.invalidateQueries({ queryKey: ["ingredientesReceitaTodos"] }),
        queryClient.invalidateQueries({ queryKey: ["correcaoRendimentoLog"] }),
      ]);
      toast({
        title: "Correção concluída",
        description: `${total_corrigido} receita${total_corrigido !== 1 ? "s" : ""} corrigida${total_corrigido !== 1 ? "s" : ""}. Veja o relatório abaixo.`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao corrigir", description: error.message });
    } finally {
      setCorrigindo(false);
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
      toast({
        title: "Correção concluída",
        description: `${total_corrigido} receita${total_corrigido !== 1 ? "s" : ""} corrigida${total_corrigido !== 1 ? "s" : ""} (8 Sopas + 23 Aves afetadas pela importação).`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao corrigir", description: error.message });
    } finally {
      setCorrigindoPorcoes(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Auditoria de Rendimento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista receitas com rendimento_total suspeito (possível erro de unidade — kg em vez de g).
          </p>
        </div>
        <Button onClick={handleCorrigir} disabled={corrigindo} className="gap-2">
          {corrigindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Corrigir rendimentos
        </Button>
      </div>

      <Badge variant="outline" className="text-xs">{suspeitas.length} receita{suspeitas.length !== 1 ? "s" : ""} suspeita{suspeitas.length !== 1 ? "s" : ""}</Badge>

      {suspeitas.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma receita suspeita encontrada.</Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50">
            <div className="flex-1">Receita</div>
            <div className="w-32 text-right">Rendimento gravado</div>
            <div className="w-32 text-right">Soma ingredientes</div>
            <div className="w-40 text-right">Motivo</div>
          </div>
          {suspeitas.map(s => (
            <div key={s.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-3 py-2.5 border-t border-border">
              <div className="flex-1 min-w-0">
                <Link to={`/receita/${s.id}`} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                  {s.nome} <LinkIcon className="w-3 h-3" />
                </Link>
              </div>
              <div className="w-full sm:w-32 text-right text-sm font-semibold">{s.rendimento_total.toLocaleString("pt-BR")} g</div>
              <div className="w-full sm:w-32 text-right text-sm text-muted-foreground">{s.somaIngredientes.toFixed(0)} g</div>
              <div className="w-full sm:w-40 text-right text-xs">
                {s.menorQue100 && <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Provável kg</Badge>}
                {s.menorQueIngredientes && <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 ml-1">Menor que insumos</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Relatório de Correções (persistente)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-2">
          Histórico de toda correção de rendimento_total já aplicada, com valores antes e depois.
        </p>

        {l3 ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logs.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma correção executada ainda.</Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50">
              <div className="flex-1">Receita</div>
              <div className="w-28 text-right">Antes</div>
              <div className="w-28 text-right">Depois</div>
              <div className="w-40 text-right">Data/hora</div>
            </div>
            {logs.map(log => (
              <div key={log.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-3 py-2.5 border-t border-border">
                <div className="flex-1 min-w-0 text-sm font-medium">{log.receita_nome}</div>
                <div className="w-full sm:w-28 text-right text-sm text-muted-foreground">{Number(log.rendimento_anterior).toLocaleString("pt-BR")} g</div>
                <div className="w-full sm:w-28 text-right text-sm font-semibold">{Number(log.rendimento_novo).toLocaleString("pt-BR")} g</div>
                <div className="w-full sm:w-40 text-right text-xs text-muted-foreground">
                  {log.created_date ? new Date(log.created_date).toLocaleString("pt-BR") : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Correção de Importação (porcoes_base)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Correção das receitas (8 Sopas e 23 Aves) cujo porcoes_base foi corrompido pelo importador de texto.
            </p>
          </div>
          <Button onClick={handleCorrigirPorcoes} disabled={corrigindoPorcoes} variant="outline" className="gap-2">
            {corrigindoPorcoes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Corrigir importação (Sopas + Aves)
          </Button>
        </div>

        {l4 ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logsPorcoes.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm mt-2">Nenhuma correção executada ainda.</Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden mt-2">
            <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50">
              <div className="flex-1">Receita</div>
              <div className="w-28 text-right">Porções (antes → depois)</div>
              <div className="w-28 text-right">PC g/porção (antes → depois)</div>
              <div className="w-36 text-right">Rendimento (antes → depois)</div>
            </div>
            {logsPorcoes.map(log => (
              <div key={log.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-3 py-2.5 border-t border-border">
                <div className="flex-1 min-w-0 text-sm font-medium">
                  <Link to={`/receita/${log.receita_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    {log.receita_nome} <LinkIcon className="w-3 h-3" />
                  </Link>
                </div>
                <div className="w-full sm:w-28 text-right text-xs">
                  {log.porcoes_base_anterior ?? "-"} → <strong>{log.porcoes_base_novo}</strong>
                </div>
                <div className="w-full sm:w-28 text-right text-xs">
                  {log.per_capita_g_anterior ?? "-"} → <strong>{log.per_capita_g_novo ?? "-"}</strong>
                </div>
                <div className="w-full sm:w-36 text-right text-xs">
                  {Number(log.rendimento_total_anterior || 0).toLocaleString("pt-BR")} → <strong>{Number(log.rendimento_total_novo || 0).toLocaleString("pt-BR")} g</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}