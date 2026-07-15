import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History } from "lucide-react";

export default function HistoricoPrecosCard({ ingrediente }) {
  const [fonteFiltro, setFonteFiltro] = useState("todas");
  const historico = ingrediente.historico_precos || [];

  const fontes = useMemo(() => [...new Set(historico.map((h) => h.fonte).filter(Boolean))], [historico]);

  const filtrado = fonteFiltro === "todas" ? historico : historico.filter((h) => h.fonte === fonteFiltro);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold flex items-center gap-1.5">
          <History className="w-4 h-4" /> Histórico de preços ({historico.length})
        </h3>
        {fontes.length > 1 && (
          <Select value={fonteFiltro} onValueChange={setFonteFiltro}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as fontes</SelectItem>
              {fontes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtrado.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atualização de preço registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Data</th>
                <th className="py-2 px-2 text-right">Preço/kg</th>
                <th className="py-2 px-2 text-center">Variação</th>
                <th className="py-2 px-2">Fornecedor</th>
                <th className="py-2 pl-2">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((h, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(h.data).toLocaleDateString("pt-BR")}</td>
                  <td className="py-1.5 px-2 text-right font-medium whitespace-nowrap">
                    R$ {(h.preco_por_kg || 0).toFixed(2).replace(".", ",")}
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <span className={h.variacao_percentual > 0 ? "text-red-600" : h.variacao_percentual < 0 ? "text-green-600" : "text-gray-400"}>
                      {h.variacao_percentual > 0 ? "+" : ""}{h.variacao_percentual ?? 0}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">{h.fornecedor || "—"}</td>
                  <td className="py-1.5 pl-2"><Badge variant="secondary" className="text-[10px]">{h.fonte}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}