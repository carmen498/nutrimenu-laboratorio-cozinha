import { Button } from "@/components/ui/button";
import { ChevronDown, Mail, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function AcoesEmMassa({ quantidade, onDispararEmail, onDispararWhatsapp, onAtivar, onDesativar }) {
  if (quantidade === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-muted/50 border rounded-lg px-4 py-2.5">
      <p className="text-sm font-medium">{quantidade} usuário(s) selecionado(s)</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto">
            Ações <ChevronDown className="w-4 h-4 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDispararEmail}>
            <Mail className="w-4 h-4 mr-2" /> Enviar E-mail
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDispararWhatsapp}>
            <MessageCircle className="w-4 h-4 mr-2" /> Enviar WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAtivar}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Ativar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDesativar}>
            <XCircle className="w-4 h-4 mr-2" /> Desativar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}