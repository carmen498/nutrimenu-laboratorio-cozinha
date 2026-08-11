import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

export function formatEmbalagem(pesoEmbalagemG, unidadeCompra) {
  const u = unidadeCompra?.toUpperCase();
  if (!pesoEmbalagemG) return `1 ${unidadeCompra?.toLowerCase() || "un"}`;
  if (["G", "KG"].includes(u)) {
    return pesoEmbalagemG >= 1000
      ? `${(pesoEmbalagemG / 1000).toFixed(pesoEmbalagemG % 1000 === 0 ? 0 : 2).replace(".", ",")} kg`
      : `${pesoEmbalagemG} g`;
  }
  if (["ML", "LT"].includes(u)) {
    return pesoEmbalagemG >= 1000
      ? `${(pesoEmbalagemG / 1000).toFixed(pesoEmbalagemG % 1000 === 0 ? 0 : 2).replace(".", ",")} L`
      : `${pesoEmbalagemG} ml`;
  }
  return `1 ${unidadeCompra?.toLowerCase() || "un"}`;
}

export default function CarrinhoItemRow({ item, ingrediente, qtdInput, custo, onChangeQtd, onBlurQtd, onToggleComprado, onRemove }) {
  const embalagemLabel = formatEmbalagem(ingrediente?.peso_embalagem_g, ingrediente?.unidade_compra);
  const nome = ingrediente?.nome || item.ingrediente_nome || "Ingrediente";

  return (
    <Card className={`p-3 flex items-center gap-2 flex-wrap transition-opacity ${item.comprado ? "opacity-40" : ""}`}>
      <Checkbox checked={!!item.comprado} onCheckedChange={(v) => onToggleComprado(!!v)} />
      <p className={`flex-1 min-w-[100px] text-sm font-medium ${item.comprado ? "line-through" : ""}`}>
        {nome}
      </p>
      <div className="flex items-center gap-1 shrink-0 bg-primary/5 border border-primary/20 rounded-md px-2 py-1">
        <Input
          type="text"
          inputMode="decimal"
          value={qtdInput}
          onChange={(e) => onChangeQtd(e.target.value)}
          onBlur={onBlurQtd}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          className="w-14 h-7 text-sm text-center tabular-nums border-none bg-transparent focus-visible:ring-0"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">× {embalagemLabel}</span>
      </div>
      <span className="text-sm font-semibold text-primary shrink-0 tabular-nums w-20 text-right">
        {formatCurrency(custo)}
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={onRemove}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </Card>
  );
}