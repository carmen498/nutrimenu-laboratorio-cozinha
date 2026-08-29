import { ChefHat } from "lucide-react";

function formatWeight(g, unit) {
  if (unit === "ml") return g >= 1000 ? `${(g / 1000).toFixed(2).replace(".", ",")} lt` : `${g.toFixed(0)} ml`;
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(".", ",")} kg` : `${g.toFixed(0)} g`;
}

function formatCusto(item) {
  if (item.isSubreceita) return "—";
  if (!item.ing || !(Number(item.ing.preco_por_g_rs) > 0)) return "Sem preço";
  if (item.custo > 0 && item.custo < 0.01) return `R$ ${item.custo.toFixed(4).replace(".", ",")}`;
  return `R$ ${item.custo.toFixed(2).replace(".", ",")}`;
}

export default function TabelaFichaTecnica({ itens, unidadeBase, medidaDisplayMap }) {
  const totalPesoLiq = itens.filter((i) => !i.isGrupo).reduce((s, i) => s + (i.qtdNova || 0), 0);
  const totalPBruto = itens.filter((i) => !i.isGrupo).reduce((s, i) => s + (i.qtdComprar || 0), 0);
  const totalCusto = itens.reduce((s, i) => s + (i.custo || 0), 0);

  const formatPercent = (item) => {
    if (item.isSubreceita || !totalCusto) return "—";
    return `${((item.custo / totalCusto) * 100).toFixed(1).replace(".", ",")}%`;
  };

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b-2 border-primary/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <th className="text-left py-1.5 px-1">Ingrediente</th>
          <th className="text-left py-1.5 px-1">Preparo</th>
          <th className="text-right py-1.5 px-1">Peso Líq. (g)</th>
          <th className="text-center py-1.5 px-1">FC</th>
          <th className="text-right py-1.5 px-1">P. Bruto (g)</th>
          <th className="text-right py-1.5 px-1">R$</th>
          <th className="text-right py-1.5 px-1">%</th>
          <th className="text-left py-1.5 px-1">Medida Caseira</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => {
          if (item.isGrupo) {
            return (
              <tr key={item.id} style={{ breakInside: "avoid", breakAfter: "avoid" }}>
                <td colSpan={8} className="pt-3 pb-1 px-1 font-bold text-primary uppercase text-[11px] tracking-wide">
                  {item.titulo_grupo}
                </td>
              </tr>
            );
          }
          const fc = Number(item.fcEfetivo) > 0 ? Number(item.fcEfetivo) : (item.ing?.fator_correcao || 1);
          const nomeSubreceita = item.receitaBase?.nome || item.subreceita_nome || "Sub-receita";
          const nomeIngrediente = item.ing?.nome || item.ingrediente_nome || "Ingrediente";
          return (
            <tr key={item.id} className="border-b border-border/40" style={{ breakInside: "avoid" }}>
              <td className="py-1 px-1">
                {item.isSubreceita ? (
                  <span className="inline-flex items-center gap-1">
                    <ChefHat className="w-3 h-3 text-amber-600" />
                    {nomeSubreceita}
                  </span>
                ) : (
                  nomeIngrediente
                )}
              </td>
              <td className="py-1 px-1 text-muted-foreground">{!item.isSubreceita ? (item.pre_preparo || "") : ""}</td>
              <td className="py-1 px-1 text-right">{formatWeight(item.qtdNova, unidadeBase)}</td>
              <td className="py-1 px-1 text-center">{item.isSubreceita ? "—" : fc.toFixed(2).replace(".", ",")}</td>
              <td className="py-1 px-1 text-right">{item.isSubreceita ? "—" : formatWeight(item.qtdComprar, unidadeBase)}</td>
              <td className="py-1 px-1 text-right font-medium">{formatCusto(item)}</td>
              <td className="py-1 px-1 text-right text-muted-foreground">{formatPercent(item)}</td>
              <td className="py-1 px-1 text-muted-foreground">{item.isSubreceita ? "—" : (medidaDisplayMap[item.id] || "—")}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-primary/50 font-bold bg-primary/5">
          <td className="py-1.5 px-1">Total</td>
          <td className="py-1.5 px-1" />
          <td className="py-1.5 px-1 text-right">{formatWeight(totalPesoLiq, unidadeBase)}</td>
          <td className="py-1.5 px-1" />
          <td className="py-1.5 px-1 text-right">{formatWeight(totalPBruto, unidadeBase)}</td>
          <td className="py-1.5 px-1 text-right text-primary">R$ {totalCusto.toFixed(2).replace(".", ",")}</td>
          <td className="py-1.5 px-1 text-right">{totalCusto > 0 ? "100%" : "—"}</td>
          <td className="py-1.5 px-1" />
        </tr>
      </tfoot>
    </table>
  );
}