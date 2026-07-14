import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DocesBebidasSection from "./DocesBebidasSection";

export default function EtapaDocesBebidas({
  totalPessoas, docesBebidas, onDocesBebidasChange,
  gruposConfig, onSalvar, onVoltar, salvando
}) {
  const handleSalvar = () => {
    onSalvar({
      grupos: gruposConfig,
      doces_bebidas: docesBebidas,
    });
  };

  return (
    <div className="space-y-4">
      <DocesBebidasSection
        totalPessoas={totalPessoas}
        docesBebidas={docesBebidas}
        onChange={onDocesBebidasChange}
      />

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onVoltar} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button variant="secondary" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Evento"}
        </Button>
      </div>
    </div>
  );
}