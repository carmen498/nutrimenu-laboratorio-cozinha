import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { getCorHex, getCorLabel, getCorFamiliaKey, COR_SEM_COR } from "@/lib/coresReceita";

export default function BarraCoresCardapio({ gruposCalc, receitaMap }) {
  const { segments, legenda, alertaCor, total } = useMemo(() => {
    const allItems = gruposCalc.flatMap((g) => g.itens);
    const familyCounts = {};
    const familyLabel = {};
    let semCor = 0;
    const coloredSegments = [];

    for (const item of allItems) {
      const rec = receitaMap[item.receita_id];
      const corKey = rec?.cor_predominante;
      const familia = getCorFamiliaKey(corKey);
      if (familia) {
        familyCounts[familia] = (familyCounts[familia] || 0) + 1;
        familyLabel[familia] = getCorLabel(corKey);
        coloredSegments.push({ familia, hex: getCorHex(corKey) });
      } else {
        semCor++;
      }
    }

    const totalComCor = coloredSegments.length;
    const total = totalComCor + semCor;

    // Um segmento por prato colorido (pintado no tom específico), na ordem original
    const segments = coloredSegments.map((s, i) => ({
      key: `${s.familia}-${i}`,
      color: s.hex,
      pct: total > 0 ? (1 / total) * 100 : 0,
    }));
    if (semCor > 0) {
      segments.push({ key: "sem_cor", color: COR_SEM_COR, pct: total > 0 ? (semCor / total) * 100 : 0 });
    }

    // Legenda agrupada por família
    const legenda = Object.entries(familyCounts).map(([familia, count]) => ({
      key: familia,
      label: familyLabel[familia],
      count,
      color: getCorHex(familia),
    }));
    if (semCor > 0) legenda.push({ key: "sem_cor", label: "Sem cor", count: semCor, color: COR_SEM_COR });

    let alertaCor = null;
    if (totalComCor > 0) {
      for (const [familia, count] of Object.entries(familyCounts)) {
        const pct = (count / totalComCor) * 100;
        if (pct >= 60) {
          alertaCor = { label: familyLabel[familia], pct, count, totalComCor };
          break;
        }
      }
    }

    return { segments, legenda, alertaCor, total };
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

      {/* Color bar: um segmento por prato, pintado no tom específico */}
      <div className="flex h-6 rounded-md overflow-hidden border border-border">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="transition-all duration-300 border-r last:border-r-0 border-black/10"
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
          />
        ))}
      </div>

      {/* Legend: agrupada por família */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {legenda.map((leg) => (
          <div key={leg.key} className="flex items-center gap-1 text-[10px]">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: leg.color }}
            />
            <span className="text-muted-foreground">{leg.label}</span>
            <span className="font-medium tabular-nums">{leg.count}</span>
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