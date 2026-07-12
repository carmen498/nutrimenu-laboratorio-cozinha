import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, Cookie } from "lucide-react";
import GerenciarReferenciaDialog from "./GerenciarReferenciaDialog";

const TIPO_LABEL = {
  bebida: "Bebidas",
  coquetel: "Coquetel",
  doce: "Doces",
};

const TIPO_ORDER = ["bebida", "coquetel", "doce"];

function formatResultado(total, unidade) {
  if (unidade === "ml") return (total / 1000).toFixed(1).replace(".", ",") + " L";
  if (unidade === "un") return Math.ceil(total) + " un";
  return (total / 1000).toFixed(1).replace(".", ",") + " kg";
}

export default function DocesBebidasSection({ totalPessoas, docesBebidas, onChange }) {
  const [showGerenciar, setShowGerenciar] = useState(false);

  const { data: referencias = [], refetch } = useQuery({
    queryKey: ["referencia-evento"],
    queryFn: () => base44.entities.ReferenciaEvento.list("tipo", 100),
  });

  // Map for quick lookup
  const refMap = useMemo(() => {
    const map = {};
    referencias.forEach(r => { map[r.id] = r; });
    return map;
  }, [referencias]);

  // Map of selected items by item name (unique in ReferenciaEvento)
  const selectedMap = useMemo(() => {
    const map = {};
    (docesBebidas || []).forEach(item => {
      map[item.item] = item;
    });
    return map;
  }, [docesBebidas]);

  const toggleItem = (ref) => {
    if (selectedMap[ref.item]) {
      // Remove
      onChange((docesBebidas || []).filter(i => i.item !== ref.item));
    } else {
      // Add with defaults from reference
      const novo = {
        referencia_id: ref.id,
        item: ref.item,
        tipo: ref.tipo,
        unidade: ref.unidade,
        percentual: ref.sem_padrao ? null : ref.percentual_padrao,
        media: ref.sem_padrao ? null : ref.media_padrao,
        custo_manual: 0,
      };
      onChange([...(docesBebidas || []), novo]);
    }
  };

  const updateField = (itemName, field, value) => {
    onChange((docesBebidas || []).map(i => {
      if (i.item === itemName) {
        return { ...i, [field]: value };
      }
      return i;
    }));
  };

  const calcTotal = (item) => {
    const pct = item.percentual || 0;
    const media = item.media || 0;
    return totalPessoas * pct / 100 * media;
  };

  // Group referencias by tipo
  const groupedRefs = useMemo(() => {
    const groups = {};
    referencias.forEach(r => {
      if (!groups[r.tipo]) groups[r.tipo] = [];
      groups[r.tipo].push(r);
    });
    return groups;
  }, [referencias]);

  const custoTotalDoces = (docesBebidas || []).reduce((s, i) => s + (i.custo_manual || 0), 0);

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/30">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <Cookie className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">Doces & Bebidas</span>
          <span className="text-[10px] text-muted-foreground">(não incluído no total de comida)</span>
        </div>
        <Button variant="ghost" size="sm" className="text-purple-600 gap-1 h-7"
          onClick={() => setShowGerenciar(true)}>
          <Settings2 className="w-3.5 h-3.5" /> Gerenciar
        </Button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {TIPO_ORDER.map(tipo => {
          const items = groupedRefs[tipo] || [];
          if (items.length === 0) return null;
          return (
            <div key={tipo}>
              <Badge variant="secondary" className="mb-2 bg-purple-100 text-purple-700">
                {TIPO_LABEL[tipo]}
              </Badge>
              <div className="space-y-1">
                {items.map(ref => {
                  const sel = selectedMap[ref.item];
                  const isChecked = !!sel;
                  const total = sel ? calcTotal(sel) : 0;
                  return (
                    <Card key={ref.id} className={`p-2.5 flex items-center gap-2 flex-wrap transition-colors ${isChecked ? "bg-purple-50 border-purple-200" : "bg-card"}`}>
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(ref)} />
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-sm font-medium">{ref.item}</p>
                        {ref.sem_padrao && (
                          <span className="text-[10px] text-amber-600">sem padrão — preencher</span>
                        )}
                      </div>
                      {isChecked && (
                        <>
                          <div className="flex items-center gap-1 shrink-0">
                            <Input type="number" step="0.5" value={sel.percentual ?? ""}
                              onChange={e => updateField(ref.item, "percentual", e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                              className="w-16 h-7 text-sm text-center tabular-nums px-1" placeholder="%" />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Input type="number" step="1" value={sel.media ?? ""}
                              onChange={e => updateField(ref.item, "media", e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                              className="w-20 h-7 text-sm text-center tabular-nums px-1" placeholder="média" />
                            <span className="text-xs text-muted-foreground">{ref.unidade}</span>
                          </div>
                          <div className="shrink-0 w-20 text-right">
                            <span className="text-sm font-semibold text-purple-700 tabular-nums">
                              {formatResultado(total, ref.unidade)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground">R$</span>
                            <Input type="number" step="0.01" value={sel.custo_manual || ""}
                              onChange={e => updateField(ref.item, "custo_manual", e.target.value === "" ? 0 : parseFloat(e.target.value.replace(",", ".")))}
                              className="w-20 h-7 text-sm text-center tabular-nums px-1" placeholder="0,00" />
                          </div>
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {docesBebidas && docesBebidas.length > 0 && custoTotalDoces > 0 && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-purple-200">
            <span className="font-medium text-purple-700">Custo total Doces & Bebidas</span>
            <span className="font-bold text-purple-700 tabular-nums">
              R$ {custoTotalDoces.toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}
      </div>

      <GerenciarReferenciaDialog
        open={showGerenciar}
        onClose={() => setShowGerenciar(false)}
        onChanged={() => refetch()}
      />
    </div>
  );
}