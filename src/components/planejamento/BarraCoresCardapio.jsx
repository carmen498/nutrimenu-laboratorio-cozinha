import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { CORES_RECEITA, COR_SEM_COR, getCorLabel } from "@/lib/coresReceita";

export default function BarraCoresCardapio({ gruposCalc, receitaMap }) {
  const { segments, alertaCor, totalComCor, totalSemCor, total } = useMemo(() => {
    const allItems = gruposCalc.flatMap((g) => g.itens);
    const counts = {};
    let semCor = 0;

    for (const item of allItems) {
      const rec = receitaMap[item.receita_id];
      const cor = rec?.cor_predominante;
      if (cor && CORES_RECEITA[cor]) {
        counts[cor] = (counts[cor] || 0) + 1;
      } else {
        semCor++;
      }
    }

    const totalComCor = Object.values(counts).reduce((s, v) => s + v, 0);
    const totalSemCor = semCor;
    const total = totalComCor + totalSemCor;

    const segments = [];
    for (const [corKey, corDef] of Object.entries(CORES_RECEITA)) {
      if (counts[corKey]) {
        segments.push({
          key: corKey,
          label: corDef.label,
          color: corDef.hex,
          count: counts[corKey],
          pct: total > 0 ? (counts[corKey] / total) * 100 : 0,
        });
      }
    }
    if (semCor > 0) {
      segments.push({
        key: "sem_cor",
        label: "Sem cor",
        color: COR_SEM_COR,
        count: semCor,
        pct: total > 0 ? (semCor / total) * 100 : 0,
      });
    }

    let alertaCor = null;
    if (totalComCor > 0) {
      for (const [corKey, count] of Object.entries(counts)) {
        const pct = (count / totalComCor) * 100;
        if (pct >= 60) {
          alertaCor = {
            cor: corKey,
            label: getCorLabel(corKey),
            pct,
            count,
            totalComCor,
          };
          break;
        }
      }
    }

    return { segments, alertaCor, totalComCor, totalSemCor, total };
  }, [gruposCalc, receitaMap]);

  if (total === 0) return null;

  return (
    <div className="space-y-2 p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cores do Cardápio
        </span>
        <span className="text-[10px] text-muted-foreground">
          {total} {total === 1 ? "prato" : "pratos"}
        </span>
      </div>

      {/* Color bar */}
      <div className="flex h-6 rounded-md overflow-hidden border border-border">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="transition-all duration-300"
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.count} (${seg.pct.toFixed(0)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1 text-[10px]">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium tabular-nums">{seg.count}</span>
          </div>
        ))}
      </div>

      {/* Monotony alert */}
      {alertaCor && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">
              ⚠️ Cardápio visualmente monótono — considere variar as cores dos pratos
            </p>
            <p className="text-xs mt-0.5">
              <span className="font-semibold">{alertaCor.label}</span> domina{" "}
              {alertaCor.pct.toFixed(0)}% dos pratos com cor ({alertaCor.count} de{" "}
              {alertaCor.totalComCor}).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}