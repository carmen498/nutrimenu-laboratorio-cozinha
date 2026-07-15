import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ruler } from "lucide-react";
import SinonimosSection from "@/components/ingrediente/SinonimosSection";
import CadastrarMedidaDialog from "@/components/receita/CadastrarMedidaDialog";

export default function MedidaSinonimosCard({ ingrediente }) {
  const [showMedida, setShowMedida] = useState(false);

  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas-caseiras"],
    queryFn: () => base44.entities.MedidaCaseira.list("-created_date", 500),
    staleTime: 60 * 1000,
  });

  const { data: utensilios = [] } = useQuery({
    queryKey: ["utensilios-padrao"],
    queryFn: () => base44.entities.UtensilioPadrao.list("simbolo", 200),
    staleTime: 60 * 1000,
  });

  const medidaExistente = medidas.find((m) => m.alimento === ingrediente.id) || null;
  const uteMap = {};
  utensilios.forEach((u) => { uteMap[u.id] = u; });
  const ute = medidaExistente ? uteMap[medidaExistente.utensilio] : null;

  return (
    <Card className="p-4">
      <h3 className="font-display font-bold mb-3 flex items-center gap-1.5">
        <Ruler className="w-4 h-4" /> Medida caseira e sinônimos
      </h3>

      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1">Medida atual</p>
        {medidaExistente ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {ute ? `1 ${ute.descricao_singular}` : "Medida cadastrada"}
              {medidaExistente.so_gramas ? "" : medidaExistente.referencia_g != null && ` (${medidaExistente.referencia_g} g)`}
            </span>
            {medidaExistente.so_gramas && <Badge variant="secondary" className="text-xs">Só gramas</Badge>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma medida cadastrada.</p>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full mb-4" onClick={() => setShowMedida(true)}>
        Editar medida
      </Button>

      <SinonimosSection ingredienteId={ingrediente.id} />

      <CadastrarMedidaDialog
        open={showMedida}
        onClose={() => setShowMedida(false)}
        ingrediente={ingrediente}
        utensilios={utensilios}
        medidaExistente={medidaExistente}
      />
    </Card>
  );
}