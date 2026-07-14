import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";

// Relatório SOMENTE LEITURA — não altera nenhum dado.
// Sinaliza receitas com rendimento_total suspeito (provável erro de unidade, ex: kg em vez de g):
// - rendimento_total < 100 (quase certamente gravado em kg)
// - rendimento_total < soma dos pesos dos próprios ingredientes (não pode ser menor que os insumos que a compõem)

export default function AuditoriaRendimento() {
  const { data: receitas = [], isLoading: l1 } = useQuery({
    queryKey: ["receitas"],
    queryFn: () => base44.entities.Receita.list("-nome", 2000),
  });

  const { data: itens = [], isLoading: l2 } = useQuery({
    queryKey: ["ingredientesReceitaTodos"],
    queryFn: () => base44.entities.IngredienteReceita.list("-created_date", 5000),
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Auditoria de Rendimento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relatório apenas leitura. Lista receitas com rendimento_total suspeito (possível erro de unidade — kg em vez de g).
          Nenhum dado é alterado aqui.
        </p>
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
    </div>
  );
}