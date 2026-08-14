import { Link } from "react-router-dom";
import { Plus, BookOpen, CalendarDays, Apple, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ACOES = [
  { label: "Nova Receita", sub: "Criar do zero", icon: Plus, to: "/receitas?nova=manual", destaque: true },
  { label: "Minhas Receitas", sub: "Ver e editar", icon: BookOpen, to: "/minhas-receitas", key: "minhasReceitas" },
  { label: "Criar Cardápio", sub: "Organizar refeições", icon: CalendarDays, to: "/cardapios" },
  { label: "Ingredientes", sub: "Gerenciar itens", icon: Apple, to: "/ingredientes" },
  { label: "Calcular Per Capita", sub: "Planejar por pessoa", icon: Gauge, to: "/percapita" },
];

export default function AcoesPrincipaisHome({ minhasReceitasCount = 0 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {ACOES.map(({ label, sub, icon: Icon, to, destaque, key }) => (
        <Link key={label} to={to}>
          <div
            className={`h-full rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-md border ${
              destaque ? "text-white border-transparent" : "bg-white border-border hover:border-primary/30"
            }`}
            style={destaque ? { background: "#1B4332" } : undefined}
          >
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${destaque ? "bg-white/15" : "bg-muted"}`}>
                <Icon className={`w-5 h-5 stroke-[1.5] ${destaque ? "text-white" : "text-primary"}`} />
              </div>
              {key === "minhasReceitas" && (
                <Badge className="bg-primary/10 text-primary border-0">{minhasReceitasCount}</Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-bold">{label}</p>
              <p className={`text-xs ${destaque ? "text-white/70" : "text-muted-foreground"}`}>{sub}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}