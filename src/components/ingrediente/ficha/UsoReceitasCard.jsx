import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { ChefHat, ArrowRight } from "lucide-react";
import { fetchAllPages } from "@/lib/fetchAllPages";

export default function UsoReceitasCard({ ingrediente }) {
  const { data: itensDoIngrediente = [] } = useQuery({
    queryKey: ["itens-ingrediente-uso", ingrediente.id],
    queryFn: () => base44.entities.IngredienteReceita.filter({ ingrediente_id: ingrediente.id }, "-created_date", 500),
  });

  const { data: todasReceitas = [] } = useQuery({
    queryKey: ["todas-receitas-uso"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const { data: todosIngredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
    staleTime: 60 * 1000,
  });

  const receitaIds = useMemo(
    () => [...new Set(itensDoIngrediente.map((i) => i.receita_id))],
    [itensDoIngrediente]
  );

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["uso-receitas-detalhado", ingrediente.id, receitaIds.join(",")],
    enabled: receitaIds.length > 0 && todosIngredientes.length > 0,
    queryFn: async () => {
      const ingMap = {};
      todosIngredientes.forEach((i) => { ingMap[i.id] = i; });
      ingMap[ingrediente.id] = ingrediente;

      const resultados = [];
      for (const recId of receitaIds) {
        const receita = todasReceitas.find((r) => r.id === recId);
        if (!receita) continue;
        const [itensReceita, insumos, esquecidos] = await Promise.all([
          base44.entities.IngredienteReceita.filter({ receita_id: recId }),
          base44.entities.InsumoReceita.filter({ receita_id: recId }),
          base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: recId }),
        ]);
        const porcoesBase = receita.porcoes_base || 1;

        // Custo total ao vivo da receita (ingredientes + insumos + esquecidos)
        let custoIngredientes = 0;
        for (const item of itensReceita) {
          if (item.tipo !== "ingrediente" || !item.ingrediente_id) continue;
          const ing = ingMap[item.ingrediente_id];
          const qtd = (item.quantidade_por_porcao || 0) * porcoesBase;
          const fc = ing?.fator_correcao || 1;
          custoIngredientes += qtd * fc * (ing?.preco_por_g_rs || 0);
        }
        const custoInsumos = insumos.reduce((s, i) => s + (i.custo_total || 0), 0);
        const custoEsquecidos = esquecidos.reduce((s, i) => s + (i.custo_total || 0), 0);
        const custoTotalReceita = custoIngredientes + custoInsumos + custoEsquecidos;

        const itemDeste = itensReceita.find((i) => i.ingrediente_id === ingrediente.id && i.tipo === "ingrediente");
        if (!itemDeste) continue;

        const qtd = (itemDeste.quantidade_por_porcao || 0) * porcoesBase;
        const fc = ingrediente.fator_correcao || 1;
        const custoLinha = qtd * fc * (ingrediente.preco_por_g_rs || 0);
        const pct = custoTotalReceita > 0 ? (custoLinha / custoTotalReceita) * 100 : 0;

        resultados.push({ receita_id: recId, receita_nome: receita.nome, qtd, custo: custoLinha, pct });
      }
      return resultados;
    },
  });

  return (
    <Card className="p-4">
      <h3 className="font-display font-bold mb-3 flex items-center gap-1.5">
        <ChefHat className="w-4 h-4" /> Usado em {linhas.length} receita{linhas.length === 1 ? "" : "s"}
      </h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Calculando...</p>
      ) : linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Não utilizado em receitas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Receita</th>
                <th className="py-2 px-2 text-right">Qtd. (g)</th>
                <th className="py-2 px-2 text-right">Custo (R$)</th>
                <th className="py-2 pl-2 text-right">% do custo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.receita_id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-1.5 pr-2">
                    <Link to={`/receita/${l.receita_id}`} className="flex items-center gap-1 text-primary hover:underline">
                      {l.receita_nome} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap">{l.qtd.toFixed(0)} g</td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap">R$ {l.custo.toFixed(2).replace(".", ",")}</td>
                  <td className="py-1.5 pl-2 text-right whitespace-nowrap">{l.pct.toFixed(1).replace(".", ",")}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}