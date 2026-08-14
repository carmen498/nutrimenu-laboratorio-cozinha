import React from "react";
import {
  ChefHat,
  CalendarDays,
  Layers,
  Scale,
  ClipboardList,
  Sparkles,
  DollarSign,
  Users,
  Lightbulb,
} from "lucide-react";

const ITENS = [
  { icon: ChefHat, texto: "Gestão de produção" },
  { icon: CalendarDays, texto: "Cardápios" },
  { icon: Layers, texto: "Sub-receitas" },
  { icon: Scale, texto: "Escalador de receitas" },
  { icon: ClipboardList, texto: "Planejamento de eventos" },
  { icon: Sparkles, texto: "Importar receita com IA" },
  { icon: DollarSign, texto: "Formação de preço" },
  { icon: Users, texto: "Per capita automático" },
  { icon: Lightbulb, texto: "Dicas da Carmen" },
];

export default function IncluidoTodosPlanos() {
  return (
    <div className="mt-12">
      <h2 className="font-heading text-xl font-semibold text-foreground text-center mb-6">
        Incluído em todos os planos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {ITENS.map(({ icon: Icon, texto }) => (
          <div
            key={texto}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}