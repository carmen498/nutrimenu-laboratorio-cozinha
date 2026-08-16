import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

export default function AcoesEmMassa({ quantidade, onDispararEmail, onDispararWhatsapp }) {
  if (quantidade === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-muted/50 border rounded-lg px-4 py-2.5">
      <p className="text-sm font-medium">{quantidade} usuário(s) selecionado(s)</p>
      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onDispararEmail}>
          <Mail className="w-4 h-4 mr-1.5" /> Disparar e-mail
        </Button>
        <Button variant="outline" size="sm" onClick={onDispararWhatsapp}>
          <MessageCircle className="w-4 h-4 mr-1.5" /> Disparar WhatsApp
        </Button>
      </div>
    </div>
  );
}