import { Calendar, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function CardapioSeletorDia({ dias, value, onChange }) {
  const selecionado = dias.find(d => d.key === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {selecionado ? selecionado.label : "Todos os dias"}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange("todos")}>Todos os dias</DropdownMenuItem>
        {dias.map(d => (
          <DropdownMenuItem key={d.key} onClick={() => onChange(d.key)}>{d.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}