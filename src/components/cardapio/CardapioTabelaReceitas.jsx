import { useState, useEffect, useRef, useMemo } from "react";
import CardapioPratoLinha from "./CardapioPratoLinha";

const REFEICOES = [
  { key: "cafe_da_manha", label: "Café da manhã" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

function fmtKg(v) { return (v || 0).toFixed(2).replace(".", ",") + " kg"; }
function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }

// Lista direta de pratos (sem linhas de seção/cabeçalho de categoria).
// Os chips no topo continuam filtrando por categoria.
export default function CardapioTabelaReceitas({
  receitas, receitaMap, isBuffet, num, cardapioTipo, temDias, diasOptions,
  custoReceitasTotal, filtroDia, onUpdateReceita, onRemoveReceita, onMoveReceita,
}) {
  const [filtroSecao, setFiltroSecao] = useState("todas");
  const [selectedId, setSelectedId] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setSelectedId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const kgOf = (rec) => isBuffet ? Number(rec.quantidade_total_g || 0) : Number(rec.quantidade_total_g || 0) / 1000;

  const categorias = useMemo(() => {
    const seen = [];
    receitas.forEach(r => {
      const c = r.receita_categoria || "Sem categoria";
      if (!seen.includes(c)) seen.push(c);
    });
    return seen;
  }, [receitas]);

  const filtradas = useMemo(() => receitas.filter(r =>
    (filtroDia === "todos" || r.dia_semana === filtroDia) &&
    (filtroSecao === "todas" || (r.receita_categoria || "Sem categoria") === filtroSecao)
  ), [receitas, filtroDia, filtroSecao]);

  const totalKg = receitas.reduce((s, r) => s + kgOf(r), 0);
  const pcSuffix = isBuffet ? "kg/un" : `g/${cardapioTipo === "marmitas" ? "marm" : "pessoa"}`;

  const handleSelect = (id) => setSelectedId(prev => prev === id ? null : id);

  return (
    <div ref={rootRef}>
      {/* Chips de seção (filtro) */}
      <div className="flex flex-wrap gap-1.5 mb-3 no-print">
        <button
          onClick={() => setFiltroSecao("todas")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filtroSecao === "todas" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
          }`}
        >Todas</button>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setFiltroSecao(filtroSecao === cat ? "todas" : cat)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filtroSecao === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
            }`}
          >{cat}</button>
        ))}
      </div>

      {/* Cabeçalho de colunas */}
      <div className="hidden sm:flex items-center gap-3 px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        <div className="flex-1">Prato</div>
        <div className="w-20 text-center">PC g/p</div>
        <div className="w-20 text-right">kg</div>
        <div className="w-20 text-right">R$</div>
        <div className="w-14 text-right">%</div>
        <div className="w-7 shrink-0" />
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma receita adicionada ainda.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {filtradas.map((rec) => {
            const idxGlobal = receitas.findIndex(r => r.id === rec.id);
            const pct = custoReceitasTotal > 0 ? ((Number(rec.custo_total) || 0) / custoReceitasTotal) * 100 : 0;
            return (
              <CardapioPratoLinha
                key={rec.id}
                rec={rec}
                descritivo={receitaMap[rec.receita_id]?.descritivo_menu}
                pcSuffix={pcSuffix}
                kg={kgOf(rec)}
                pct={pct}
                selected={selectedId === rec.id}
                onSelect={handleSelect}
                onUpdatePC={(val) => { onUpdateReceita(rec.id, "per_capita_g", val); onUpdateReceita(rec.id, "quantidade_total_g", val * num); }}
                onUpdateField={(field, val) => onUpdateReceita(rec.id, field, val)}
                onRemove={() => onRemoveReceita(rec.id)}
                onMoveUp={() => onMoveReceita(rec.id, -1)}
                onMoveDown={() => onMoveReceita(rec.id, 1)}
                canMoveUp={idxGlobal > 0}
                canMoveDown={idxGlobal < receitas.length - 1}
                temDias={temDias}
                diasOptions={diasOptions}
                refeicoesOptions={REFEICOES}
                showTrashInRow
              />
            );
          })}
          {/* Linha de total: mesma grade de colunas das linhas de receita (flex-1 | w-20 | w-20 | w-20 | w-14) */}
          <div className="flex items-center gap-3 px-3 py-3 border-t-2 border-border bg-secondary/50">
            <div className="flex-1 min-w-0 text-sm font-semibold">Total</div>
            <div className="w-20 shrink-0" />
            <div className="w-20 text-right shrink-0 text-sm font-semibold">{fmtKg(totalKg)}</div>
            <div className="w-20 text-right shrink-0 text-sm font-semibold whitespace-nowrap">{fmtRs(custoReceitasTotal)}</div>
            <div className="w-14 shrink-0" />
            <div className="w-7 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}