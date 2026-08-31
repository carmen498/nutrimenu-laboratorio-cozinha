import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Database, Layers3 } from "lucide-react";
import { listarCardapiosPeriodo } from "@/lib/cardapioPeriodo";

export default function CardapiosBase() {
  const { data: cardapios = [], isLoading, error } = useQuery({
    queryKey: ["cardapios-periodo-base"],
    queryFn: () => listarCardapiosPeriodo(),
    staleTime: 60 * 1000,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Cardápios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Base técnica do planejador semanal — acesso interno de validação.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <CalendarRange className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">Período semanal</p>
          <p className="text-xs text-muted-foreground mt-1">Sete datas consecutivas por cardápio.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Layers3 className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">Três origens</p>
          <p className="text-xs text-muted-foreground mt-1">Refeições, Receitas e Ingredientes.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Database className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">Base isolada</p>
          <p className="text-xs text-muted-foreground mt-1">Sem alterar os cadastros de Refeições.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Estado da base</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-2">Verificando entidades...</p>
        ) : error ? (
          <p className="text-sm text-destructive mt-2">Não foi possível consultar a base técnica.</p>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Estrutura disponível. {cardapios.length} {cardapios.length === 1 ? "cardápio do período acessível" : "cardápios do período acessíveis"} para este usuário.
          </p>
        )}
      </div>
    </div>
  );
}
