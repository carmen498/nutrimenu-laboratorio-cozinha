import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, Info, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GerenciarReferenciaDialog from "./GerenciarReferenciaDialog";
import DecimalInput from "./DecimalInput";

const TIPO_LABEL = {
  coquetel: "Coquetel",
  doce: "Doces",
  bebida: "Bebidas",
};

const CHIPS = ["todas", "coquetel", "doce", "bebida"];
const TIPO_ORDER = ["coquetel", "doce", "bebida"];

function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }

function unidadeCustoLabel(unidade) {
  if (unidade === "ml") return "L";
  if (unidade === "un") return "un";
  return "kg";
}

// ─── Fórmulas originais — NÃO ALTERAR ───
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
// ─── Fim das fórmulas originais ───

// Quantidade final automática (calculada), arredondada para exibição/edição
function qtdFinalAutomatica(item, totalPessoas) {
  const conv = calcQtdConvertida(calcQtdRaw(item, totalPessoas), item.unidade);
  return item.unidade === "un" ? Math.ceil(conv) : Math.round(conv * 10) / 10;
}

// Quantidade final efetiva: usa o ajuste manual quando existir, senão a automática
function qtdFinalEfetiva(item, totalPessoas) {
  return item.quantidade_ajustada != null ? item.quantidade_ajustada : qtdFinalAutomatica(item, totalPessoas);
}

// R$ total considerando a quantidade final (ajustada ou automática) — não altera
// calcRsTotal, apenas usa a mesma multiplicação (qtd × custo) com a qtd efetiva.
function calcRsTotalFinal(item, totalPessoas) {
  const cu = item.custo_unitario;
  if (!cu) return null;
  return qtdFinalEfetiva(item, totalPessoas) * cu;
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
        custo_unitario_input: null,
        base_custo: "un",
        quantidade_ajustada: null,
      };
      onChange([...(docesBebidas || []), novo]);
    }
  };

  const updateField = (itemName, field, value) => {
    onChange((docesBebidas || []).map(i => i.item === itemName ? { ...i, [field]: value } : i));
  };

  // Atualiza o valor digitado de custo, convertendo para R$/un quando a base for "cento"
  const updateCustoInput = (itemName, base, inputValue) => {
    const custoUnitario = base === "cento" ? (inputValue == null ? null : inputValue / 100) : inputValue;
    onChange((docesBebidas || []).map(i => i.item === itemName
      ? { ...i, base_custo: base, custo_unitario_input: inputValue, custo_unitario: custoUnitario }
      : i));
  };

  // Troca a base de cotação (un/cento), recalculando o custo unitário efetivo a partir do valor já digitado
  const updateBaseCusto = (itemName, novoBase) => {
    onChange((docesBebidas || []).map(i => {
      if (i.item !== itemName) return i;
      const inputVal = i.custo_unitario_input ?? i.custo_unitario ?? null;
      const custoUnitario = novoBase === "cento" ? (inputVal == null ? null : inputVal / 100) : inputVal;
      return { ...i, base_custo: novoBase, custo_unitario_input: inputVal, custo_unitario: custoUnitario };
    }));
  };

  const updateQtdAjustada = (itemName, value) => {
    onChange((docesBebidas || []).map(i => i.item === itemName ? { ...i, quantidade_ajustada: value } : i));
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
      const rs = calcRsTotalFinal(i, totalPessoas);
      return s + (rs || 0);
    }, 0);
  }, [docesBebidas, totalPessoas]);

  const custoSubtotalAba = useMemo(() => {
    if (filtroTipo === "todas") return null;
    return (docesBebidas || [])
      .filter(i => i.tipo === filtroTipo)
      .reduce((s, i) => s + (calcRsTotalFinal(i, totalPessoas) || 0), 0);
  }, [docesBebidas, totalPessoas, filtroTipo]);

  return (
    <TooltipProvider>
    <div className="rounded-lg border border-border bg-card">
      {/* Cabeçalho único */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Doces & Bebidas</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal bg-muted text-muted-foreground">
              etapa opcional
            </Badge>
            <span className="text-xs text-muted-foreground">para {totalPessoas || 0} pessoas</span>
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
        <div className="w-24 text-right shrink-0">Qtd. final</div>
        <div className="w-48 text-right shrink-0">Custo unit.</div>
        <div className="w-24 text-right shrink-0">R$ total</div>
        <div className="w-24 text-right shrink-0 flex items-center justify-end gap-1">
          % Adesão
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] normal-case font-normal">
              Percentual dos convidados que consomem este item. Ex.: 50% = metade das pessoas.
            </TooltipContent>
          </Tooltip>
        </div>
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
                const rsTotal = isChecked ? calcRsTotalFinal(sel, totalPessoas) : null;
                const base = sel?.base_custo || "un";
                const ajustado = isChecked && sel.quantidade_ajustada != null;
                return (
                  <div key={ref.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0">
                    <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(ref)} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{ref.item}</p>
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
                        <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                          <DecimalInput
                            value={qtdFinalEfetiva(sel, totalPessoas)}
                            onChange={v => updateQtdAjustada(ref.item, v)}
                            className="w-16 h-7 text-sm text-right tabular-nums px-1" placeholder="0" />
                          <span className="text-[10px] text-muted-foreground shrink-0">{unidadeCustoLabel(ref.unidade)}</span>
                          {ajustado && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" onClick={() => updateQtdAjustada(ref.item, null)}
                                  className="text-muted-foreground hover:text-primary shrink-0">
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="normal-case font-normal">Voltar ao automático</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="w-48 shrink-0 flex flex-col items-end gap-0.5">
                          {ref.unidade === "un" ? (
                            <div className="flex gap-0.5">
                              <button type="button" onClick={() => updateBaseCusto(ref.item, "un")}
                                className={`text-[9px] px-1.5 py-0.5 rounded ${base === "un" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                R$/un
                              </button>
                              <button type="button" onClick={() => updateBaseCusto(ref.item, "cento")}
                                className={`text-[9px] px-1.5 py-0.5 rounded ${base === "cento" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                R$/cento
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0">R$/{unidadeCustoLabel(ref.unidade)}</span>
                          )}
                          <DecimalInput value={sel.custo_unitario_input ?? sel.custo_unitario ?? null}
                            onChange={v => updateCustoInput(ref.item, base, v)}
                            className="w-24 h-7 text-sm text-right tabular-nums px-1" placeholder="0,00" />
                        </div>
                        <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                          {rsTotal != null ? fmtRs(rsTotal) : "—"}
                        </div>
                        <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                          <Input type="number" step="0.5" value={sel.percentual ?? ""}
                            onChange={e => updateField(ref.item, "percentual", e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")))}
                            className="w-14 h-7 text-sm text-right tabular-nums px-1" placeholder="0" />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 shrink-0" />
                        <div className="w-24 shrink-0" />
                        <div className="w-48 shrink-0" />
                        <div className="w-24 shrink-0" />
                        <div className="w-24 shrink-0" />
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
            {filtroTipo === "todas"
              ? "Total Doces & Bebidas · separado do total de comida"
              : `Subtotal ${TIPO_LABEL[filtroTipo]} · total geral à direita`}
          </div>
          <div className="w-16 shrink-0" />
          <div className="w-24 shrink-0" />
          <div className="w-48 shrink-0" />
          <div className="w-24 shrink-0 text-right">
            {filtroTipo !== "todas" && (
              <div className="text-[9px] text-muted-foreground font-normal uppercase">Subtotal {TIPO_LABEL[filtroTipo]}</div>
            )}
            <div className="text-sm font-semibold tabular-nums">
              {fmtRs(filtroTipo === "todas" ? custoTotalDoces : custoSubtotalAba)}
            </div>
            {filtroTipo !== "todas" && (
              <div className="text-[9px] text-muted-foreground mt-0.5">Total (todas): {fmtRs(custoTotalDoces)}</div>
            )}
          </div>
          <div className="w-24 shrink-0" />
        </div>
      </div>

      <GerenciarReferenciaDialog
        open={showGerenciar}
        onClose={() => setShowGerenciar(false)}
        onChanged={() => refetch()}
      />
    </div>
    </TooltipProvider>
  );
}