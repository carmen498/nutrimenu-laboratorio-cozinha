import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import GerenciarReferenciaDialog from "./GerenciarReferenciaDialog";

const TIPO_LABEL = {
  coquetel: "Coquetel",
  doce: "Doces",
  bebida: "Bebidas",
};

const CHIPS = ["todas", "coquetel", "doce", "bebida"];
const TIPO_ORDER = ["coquetel", "doce", "bebida"];

function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }

function fmtQtd(total, unidade) {
  if (unidade === "ml") return (total / 1000).toFixed(1).replace(".", ",") + " L";
  if (unidade === "un") return Math.ceil(total) + " un";
  return (total / 1000).toFixed(1).replace(".", ",") + " kg";
}

function unidadeCustoLabel(unidade) {
  if (unidade === "ml") return "L";
  if (unidade === "un") return "un";
  return "kg";
}

// Quantidade total bruta na unidade base do item (g/ml/un)
function calcQtdRaw(item, totalPessoas) {
  const pct = item.percentual || 0;
  const media = item.media || 0;
  return totalPessoas * pct / 100 * media;
}

// Converte a quantidade bruta para a unidade de custo (kg/L/un)
function calcQtdConvertida(totalRaw, unidade) {
  return unidade === "un" ? totalRaw : totalRaw / 1000;
}

// R$ total do item: qtd convertida × custo unitário (null se sem custo definido)
function calcRsTotal(item, totalPessoas) {
  const cu = item.custo_unitario;
  if (!cu) return null;
  const raw = calcQtdRaw(item, totalPessoas);
  const qtd = calcQtdConvertida(raw, item.unidade);
  return qtd * cu;
}

export default function DocesBebidasSection({ totalPessoas, docesBebidas, onChange }) {
  const [showGerenciar, setShowGerenciar] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todas");

  const { data: referencias = [], refetch } = useQuery({
    queryKey: ["referencia-evento"],
    queryFn: () => base44.entities.ReferenciaEvento.list("tipo", 100),
  });

  const selectedMap = useMemo(() => {
    const map = {};
    (docesBebidas || []).forEach(item => { map[item.item] = item; });
    return map;
  }, [docesBebidas]);

  const toggleItem = (ref) => {
    if (selectedMap[ref.item]) {
      onChange((docesBebidas || []).filter(i => i.item !== ref.item));
    } else {
      const novo = {
        referencia_id: ref.id,
        item: ref.item,
        tipo: ref.tipo,
        unidade: ref.unidade,
        percentual: ref.sem_padrao ? null : ref.percentual_padrao,
        media: ref.sem_padrao ? null : ref.media_padrao,
        custo_unitario: null,
      };
      onChange([...(docesBebidas || []), novo]);
    }
  };

  const updateField = (itemName, field, value) => {
    onChange((docesBebidas || []).map(i => i.item === itemName ? { ...i, [field]: value } : i));
  };

  const groupedRefs = useMemo(() => {
    const groups = {};
    referencias.forEach(r => {
      if (!groups[r.tipo]) groups[r.tipo] = [];
      groups[r.tipo].push(r);
    });
    return groups;
  }, [referencias]);

  const tiposVisiveis = TIPO_ORDER.filter(t => filtroTipo === "todas" || filtroTipo === t);

  const custoTotalDoces = useMemo(() => {
    return (docesBebidas || []).reduce((s, i) => {
      const rs = calcRsTotal(i, totalPessoas);
      return s + (rs || 0);
    }, 0);
  }, [docesBebidas, totalPessoas]);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Cabeçalho único */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Doces & Bebidas</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal bg-muted text-muted-foreground">
              etapa opcional
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 h-7 text-primary"
            onClick={() => setShowGerenciar(true)}>
            <Settings2 className="w-3.5 h-3.5" /> Gerenciar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Calculados separadamente — não somam no total de comida (kg)
        </p>
      </div>

      {/* Chips de filtro */}
      <div className="flex flex-wrap gap-1.5 p-3">
        {CHIPS.map(c => (
          <button key={c} type="button"
            onClick={() => setFiltroTipo(c)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filtroTipo === c ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
            }`}
          >{c === "todas" ? "Todas" : TIPO_LABEL[c]}</button>
        ))}
      </div>

      {/* Cabeçalho de colunas */}
      <div className="hidden sm:flex items-center gap-3 px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        <div className="w-4 shrink-0" />
        <div className="flex-1">Item</div>
        <div className="w-16 text-right shrink-0">PC médio</div>
        <div className="w-20 text-right shrink-0">Qtd. total</div>
        <div className="w-28 text-right shrink-0">Custo unit.</div>
        <div className="w-24 text-right shrink-0">R$ total</div>
        <div className="w-16 text-right shrink-0">% ref.</div>
      </div>

      <div className="border-t border-border">
        {tiposVisiveis.map(tipo => {
          const items = groupedRefs[tipo] || [];
          if (items.length === 0) return null;
          return (
            <div key={tipo}>
              <div className="px-3 py-1.5 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {TIPO_LABEL[tipo]}
              </div>
              {items.map(ref => {
                const sel = selectedMap[ref.item];
                const isChecked = !!sel;
                const qtdRaw = isChecked ? calcQtdRaw(sel, totalPessoas) : 0;
                const rsTotal = isChecked ? calcRsTotal(sel, totalPessoas) : null;
                return (
                  <div key={ref.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0">
                    <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(ref)} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ref.item}</p>
                      {isChecked && ref.sem_padrao && (
                        <span className="text-[10px] text-amber-600">sem padrão — preencher</span>
                      )}
                    </div>
                    {isChecked ? (
                      <>
                        <div className="w-16 shrink-0">
                          <Input type="number" step="1" value={sel.media ?? ""}
                            onChange={e => updateField(ref.item, "media", e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                            className="h-7 text-sm text-right tabular-nums px-1" placeholder="0" />
                        </div>
                        <div className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">
                          {fmtQtd(qtdRaw, ref.unidade)}
                        </div>
                        <div className="w-28 shrink-0 flex items-center justify-end gap-1">
                          <span className="text-[10px] text-muted-foreground shrink-0">R$/{unidadeCustoLabel(ref.unidade)}</span>
                          <Input type="number" step="0.01" value={sel.custo_unitario ?? ""}
                            onChange={e => updateField(ref.item, "custo_unitario", e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                            className="w-16 h-7 text-sm text-right tabular-nums px-1" placeholder="0,00" />
                        </div>
                        <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                          {rsTotal != null ? fmtRs(rsTotal) : "—"}
                        </div>
                        <div className="w-16 shrink-0 flex items-center justify-end gap-1">
                          <Input type="number" step="0.5" value={sel.percentual ?? ""}
                            onChange={e => updateField(ref.item, "percentual", e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                            className="w-10 h-7 text-sm text-right tabular-nums px-1" placeholder="0" />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 shrink-0" />
                        <div className="w-20 shrink-0" />
                        <div className="w-28 shrink-0" />
                        <div className="w-24 shrink-0" />
                        <div className="w-16 shrink-0" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Linha de total: mesma grade de colunas das linhas de item */}
        <div className="flex items-center gap-3 px-3 py-3 border-t-2 border-border bg-secondary/50">
          <div className="w-4 shrink-0" />
          <div className="flex-1 min-w-0 text-sm font-semibold">
            Total Doces & Bebidas · separado do total de comida
          </div>
          <div className="w-16 shrink-0" />
          <div className="w-20 shrink-0" />
          <div className="w-28 shrink-0" />
          <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{fmtRs(custoTotalDoces)}</div>
          <div className="w-16 shrink-0" />
        </div>
      </div>

      <GerenciarReferenciaDialog
        open={showGerenciar}
        onClose={() => setShowGerenciar(false)}
        onChanged={() => refetch()}
      />
    </div>
  );
}