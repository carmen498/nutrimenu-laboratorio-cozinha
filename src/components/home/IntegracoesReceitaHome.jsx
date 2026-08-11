import { useNavigate } from "react-router-dom";
import { DollarSign, Tag, Lock, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function IntegracoesReceitaHome() {
  const navigate = useNavigate();

  return (
    <Card className="p-5 bg-white border" style={{ borderColor: "#E8E0D5" }}>
      <h3 className="font-display text-lg font-bold mb-1" style={{ color: "#2A4E3D" }}>
        Integrações da sua Receita
      </h3>
      <p className="text-sm text-muted-foreground">Transforme suas receitas em mais possibilidades.</p>
      <p className="text-sm font-script italic mb-4" style={{ color: "#B8860B" }}>
        Da receita ao produto, tudo em um só lugar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
          <div className="rounded-lg border p-4 flex flex-col" style={{ borderColor: "#E8E0D5" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#E7F0EA" }}>
                <DollarSign className="w-4 h-4" style={{ color: "#2A4E3D" }} />
              </div>
              <p className="text-sm font-semibold">Calcular custo</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex-1">Calcule quanto custa produzir esta receita.</p>
            <button
              onClick={() => navigate("/receitas")}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white py-2 rounded-md transition-colors hover:opacity-90"
              style={{ background: "#2A4E3D" }}
            >
              Calcular custo desta receita <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-lg border p-4 opacity-70 flex flex-col" style={{ borderColor: "#E8E0D5" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#F5EDE0" }}>
                <Tag className="w-4 h-4" style={{ color: "#B8860B" }} />
              </div>
              <p className="text-sm font-semibold">Transformar em Produto</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex-1">Prepare esta receita para iniciar o processo de rotulagem.</p>
            <button
              disabled
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-md border cursor-not-allowed"
              style={{ borderColor: "#E8E0D5", color: "#9C9184" }}
            >
              <Lock className="w-3.5 h-3.5" /> Em breve
            </button>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-center">
          <img
            src="https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/aefcb3a8d_13ImagenscapaInico.png"
            alt="Bolo de chocolate com frutas vermelhas"
            className="w-full max-h-40 object-contain"
          />
        </div>
      </div>
    </Card>
  );
}