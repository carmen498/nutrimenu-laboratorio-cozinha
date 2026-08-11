import { useNavigate } from "react-router-dom";
import { Calculator, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function IntegracoesReceitaHome() {
  const navigate = useNavigate();

  return (
    <Card className="p-5 bg-white border" style={{ borderColor: "#E8E0D5" }}>
      <h3 className="font-display text-lg font-bold mb-1" style={{ color: "#2A4E3D" }}>
        Integrações da sua Receita
      </h3>
      <p className="text-sm text-muted-foreground mb-4">Transforme suas receitas em mais possibilidades.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border p-4" style={{ borderColor: "#E8E0D5" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#E7F0EA" }}>
              <Calculator className="w-4 h-4" style={{ color: "#2A4E3D" }} />
            </div>
            <p className="text-sm font-semibold">Calcular custo</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Calcule quanto custa produzir esta receita.</p>
          <button
            onClick={() => navigate("/receitas")}
            className="w-full text-sm font-semibold text-white py-2 rounded-md transition-colors hover:opacity-90"
            style={{ background: "#2A4E3D" }}
          >
            Calcular custo desta receita
          </button>
        </div>
        <div className="rounded-lg border p-4 opacity-70" style={{ borderColor: "#E8E0D5" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F5EDE0" }}>
              <Tag className="w-4 h-4" style={{ color: "#B8860B" }} />
            </div>
            <p className="text-sm font-semibold">Transformar em Produto</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Prepare esta receita para iniciar o processo de rotulagem.</p>
          <button
            disabled
            className="w-full text-sm font-semibold py-2 rounded-md border cursor-not-allowed"
            style={{ borderColor: "#E8E0D5", color: "#9C9184" }}
          >
            Em breve
          </button>
        </div>
      </div>
    </Card>
  );
}