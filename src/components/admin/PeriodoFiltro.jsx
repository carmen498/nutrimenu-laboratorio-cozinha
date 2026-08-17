import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PERIODOS } from "@/lib/periodoFiltro";

export default function PeriodoFiltro({
  periodoFiltro, setPeriodoFiltro,
  dataInicioCustom, setDataInicioCustom,
  dataFimCustom, setDataFimCustom,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap sm:items-center">
      <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
        <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {periodoFiltro === "personalizado" && (
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data inicial</label>
            <Input
              type="date"
              value={dataInicioCustom}
              onChange={(e) => setDataInicioCustom(e.target.value)}
              className="sm:w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data final</label>
            <Input
              type="date"
              value={dataFimCustom}
              onChange={(e) => setDataFimCustom(e.target.value)}
              className="sm:w-40"
            />
          </div>
        </div>
      )}
    </div>
  );
}