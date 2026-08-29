import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { ChefHat, ArrowRight } from "lucide-react";

export default function UsoReceitasCard({ ingrediente }) {
  const { data: linhas = [], isLoading } = useQuery({
    queryKey: [
      "uso-receitas-detalhado",
      ingrediente.id,
      ingrediente.updated_date,
      ingrediente.preco_por_g_rs,
      ingrediente.fator_correcao,
    ],
    queryFn: async () => {
      const resposta = await base44.functions.invoke("usosIngrediente", {
        ingrediente_id: ingrediente.id,
        preco_por_g_rs: ingrediente.preco_por_g_rs || 0,
        fator_correcao: ingrediente.fator_correcao || 1,
      });
      return resposta.data.linhas || [];
    },
    staleTime: 5 * 60 * 1000,
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