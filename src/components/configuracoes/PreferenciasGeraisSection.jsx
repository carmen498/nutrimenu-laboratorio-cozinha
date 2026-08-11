import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const CHAVE = "unidade_padrao_receita";

export default function PreferenciasGeraisSection() {
  const qc = useQueryClient();
  const [unidade, setUnidade] = useState("g");

  const { data: config } = useQuery({
    queryKey: ["app-config", CHAVE],
    queryFn: async () => {
      const rows = await base44.entities.AppConfig.filter({ chave: CHAVE });
      return rows[0] || null;
    },
  });

  useEffect(() => {
    if (config?.valor) setUnidade(config.valor);
  }, [config]);

  const handleChange = async (valor) => {
    setUnidade(valor);
    try {
      if (config) {
        await base44.entities.AppConfig.update(config.id, { valor });
      } else {
        await base44.entities.AppConfig.create({ chave: CHAVE, valor });
      }
      qc.invalidateQueries({ queryKey: ["app-config", CHAVE] });
      toast.success("Preferência salva!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <SlidersHorizontal className="w-3.5 h-3.5" /> Preferências gerais
      </h2>

      <div className="space-y-1.5 max-w-xs">
        <Label>Unidade de medida padrão para novas receitas</Label>
        <Select value={unidade} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="g">Gramas (sólidos)</SelectItem>
            <SelectItem value="ml">Mililitros (líquidos)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-xs">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Moeda</Label>
          <p className="text-sm font-medium">Real (R$)</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Formato de data</Label>
          <p className="text-sm font-medium">DD/MM/AAAA</p>
        </div>
      </div>
    </Card>
  );
}