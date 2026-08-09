// Tabela "Composição do Custo" — relatório de custo puro (sem preparo/medida caseira),
// ordenada por % decrescente. Reutiliza os campos já calculados por montarFichaTecnica
// (qtdNova, qtdComprar, custo) — não recalcula nada.
function formatG(g) {
  return Math.round(g || 0).toLocaleString("pt-BR");
}
function formatMoney(v) {
  return (v || 0).toFixed(2).replace(".", ",");
}

export default function TabelaComposicaoCusto({ itensOrdenados, totalCusto }) {
  const totalPesoLiq = itensOrdenados.reduce((s, i) => s + (i.qtdNova || 0), 0);
  const totalPBruto = itensOrdenados.reduce((s, i) => s + (i.qtdComprar || 0), 0);

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b-2 border-primary/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <th className="text-left py-1.5 px-1">Ingrediente</th>
          <th className="text-right py-1.5 px-1">Peso Líq. (g)</th>
          <th className="text-center py-1.5 px-1">FC</th>
          <th className="text-right py-1.5 px-1">P. Bruto (g)</th>
          <th className="text-right py-1.5 px-1">R$</th>
          <th className="text-right py-1.5 px-1">%</th>
        </tr>
      </thead>
      <tbody>
        {itensOrdenados.map((item, idx) => {
          const fc = item.ing?.fator_correcao || 1;
          const pct = totalCusto > 0 ? (item.custo / totalCusto) * 100 : 0;
          const destaque = idx < 2;
          return (
            <tr key={item.id} className={`border-b border-border/40 ${destaque ? "bg-primary/5" : ""}`} style={{ breakInside: "avoid" }}>
              <td className={`py-1 px-1 ${destaque ? "font-semibold" : ""}`}>{item.ing?.nome || item.ingrediente_nome}</td>
              <td className="py-1 px-1 text-right">{formatG(item.qtdNova)}</td>
              <td className="py-1 px-1 text-center">{fc.toFixed(2).replace(".", ",")}</td>
              <td className="py-1 px-1 text-right">{formatG(item.qtdComprar)}</td>
              <td className="py-1 px-1 text-right font-medium">{formatMoney(item.custo)}</td>
              <td className={`py-1 px-1 text-right ${destaque ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {pct.toFixed(1).replace(".", ",")}%
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-primary/50 font-bold bg-primary/5">
          <td className="py-1.5 px-1">Total</td>
          <td className="py-1.5 px-1 text-right">{formatG(totalPesoLiq)}</td>
          <td className="py-1.5 px-1" />
          <td className="py-1.5 px-1 text-right">{formatG(totalPBruto)}</td>
          <td className="py-1.5 px-1 text-right text-primary">{formatMoney(totalCusto)}</td>
          <td className="py-1.5 px-1 text-right">{totalCusto > 0 ? "100%" : "—"}</td>
        </tr>
      </tfoot>
    </table>
  );
}