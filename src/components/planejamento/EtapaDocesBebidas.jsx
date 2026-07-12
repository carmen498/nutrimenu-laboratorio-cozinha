import { Button } from "@/components/ui/button";
import { ArrowLeft, Cookie } from "lucide-react";
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
      <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
        <Cookie className="w-5 h-5 text-purple-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-purple-700">Etapa opcional</p>
          <p className="text-xs text-purple-600">Doces & Bebidas são calculados separadamente e não afetam o total de comida (kg).</p>
        </div>
      </div>

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