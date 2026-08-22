import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, HelpCircle } from "lucide-react";
import { resolverRendimentoReceita, formatarStatusRendimento } from "@/lib/rendimentoReceita";

function fmt(v, unidade) {
  return `${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidade}`;
}

function statusClass(status) {
  if (status === "confirmado") return "text-green-700 border-green-300 bg-green-50";
  if (status === "a_validar") return "text-amber-700 border-amber-300 bg-amber-50";
  if (status === "estimado") return "text-blue-700 border-blue-300 bg-blue-50";
  return "text-muted-foreground";
}

export default function RendimentoTecnicoCard({
  receita,
  itens,
  pesoBruto,
  pdpValue,
  setPdpValue,
  onSavePDP,
  onPDPChange,
}) {
  const info = resolverRendimentoReceita(receita, itens);
  const unidade = receita?.unidade_base === "ml" ? "ml" : "g";
  const pdp = Number(pdpValue) || info.pesoPosPreparoInformado || 0;
  const pre = info.pesoPrePreparo || 0;
  const fator = pre > 0 && pdp > 0 ? pdp / pre : null;
  const variacao = fator == null ? null : (fator - 1) * 100;
  const tipo = variacao == null || Math.abs(variacao) < 0.05
    ? "estável"
    : variacao > 0 ? "ganho" : "perda";

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="font-display text-sm font-bold">Rendimento técnico</h3>
        <Badge variant="outline" className={`text-[10px] ${statusClass(info.rendimentoStatus)}`}>
          {formatarStatusRendimento(info.rendimentoStatus)}
        </Badge>
        <span className="text-[10px] text-muted-foreground">origem: {info.rendimentoOrigem || "—"}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Pré-preparo líquido</p>
          <p className="font-semibold mt-0.5">{fmt(pre, unidade)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-[10px] uppercase text-muted-foreground">PB de compra</p>
            <span title="Peso Bruto = PL × FC. É usado para compra/custo, não para o fator de cocção.">
              <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
            </span>
          </div>
          <p className="font-semibold mt-0.5">{fmt(pesoBruto, unidade)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">PDP medido</p>
          <div className="flex items-center gap-1 mt-1">
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => onPDPChange(Math.max(1, pdp - 50))}>
              <Minus className="w-3 h-3" />
            </Button>
            <div className="relative">
              <Input
                type="number"
                min={1}
                value={pdpValue || ""}
                onChange={(e) => setPdpValue(e.target.value)}
                onBlur={() => onSavePDP(parseFloat(pdpValue) || 0)}
                onKeyDown={(e) => { if (e.key === "Enter") onSavePDP(parseFloat(pdpValue) || 0); }}
                className="text-center text-sm font-bold h-7 w-24 pr-7"
                placeholder={info.rendimentoEstimado ? "medir" : ""}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">{unidade}</span>
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => onPDPChange((pdp || pre || 0) + 50)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Fator rendimento</p>
          <p className="font-semibold mt-0.5">{fator == null ? "—" : fator.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</p>
          <p className="text-[10px] text-muted-foreground">PDP ÷ pré-preparo</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Variação</p>
          <p className={`font-semibold mt-0.5 ${variacao > 0 ? "text-blue-600" : variacao < 0 ? "text-primary" : ""}`}>
            {variacao == null ? "—" : `${tipo}: ${variacao > 0 ? "+" : ""}${variacao.toFixed(1).replace(".", ",")}%`}
          </p>
        </div>
      </div>

      {info.rendimentoStatus === "a_validar" && (
        <p className="text-[11px] text-amber-700 mt-3 border-t pt-2">
          O PDP existente ainda não foi confirmado neste modelo técnico ou os ingredientes mudaram desde a medição. Pesar a preparação pronta e salvar o PDP confirma o rendimento.
        </p>
      )}
      {info.rendimentoEstimado && (
        <p className="text-[11px] text-muted-foreground mt-3 border-t pt-2">
          Sem PDP medido: o sistema usa o peso pré-preparo apenas como estimativa operacional para escala/custo. Isso não equivale a rendimento confirmado.
        </p>
      )}
    </Card>
  );
}
