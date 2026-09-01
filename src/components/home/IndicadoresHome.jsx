import { Card } from "@/components/ui/card";
import { BookOpen, Apple, CalendarDays, TrendingUp } from "lucide-react";

const ITENS = [
  { key: "receitas", label: "Receitas", icon: BookOpen, cor: "#4E7C63" },
  { key: "ingredientes", label: "Ingredientes", icon: Apple, cor: "#A5643E" },
  { key: "cardapios", label: "Meus Cardápios", icon: CalendarDays, cor: "#7FA38C" },
  { key: "receitasAtualizadas", label: "Receitas atualizadas recentemente", icon: TrendingUp, cor: "#C9A24B" },
];

export default function IndicadoresHome({ receitas, ingredientes, cardapios, receitasAtualizadas, loading }) {
  const valores = {
    receitas,
    ingredientes,
    cardapios,
    receitasAtualizadas,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ITENS.map(({ key, label, icon: Icon, cor }) => (
        <Card key={key} className="p-4 bg-white border flex flex-col items-center text-center gap-1.5" style={{ borderColor: "#E8E0D5" }}>
          <Icon className="w-5 h-5 stroke-[1.5]" style={{ color: cor }} />
          <span className="text-2xl font-bold" style={{ color: "#2A4E3D" }}>
            {loading ? "…" : valores[key]}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">{label}</span>
        </Card>
      ))}
    </div>
  );
}