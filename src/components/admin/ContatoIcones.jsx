import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/statusAssinaturaUsuario";

export default function ContatoIcones({ email, telefone }) {
  const wpp = whatsappHref(telefone);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {email && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" asChild>
          <a href={`mailto:${email}`} title={`Enviar e-mail para ${email}`}>
            <Mail className="w-3.5 h-3.5" /> E-mail
          </a>
        </Button>
      )}
      {wpp && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-green-700 hover:text-green-800" asChild>
          <a
            href={wpp}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abrir WhatsApp ${telefone || ""}`}
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        </Button>
      )}
      {!email && !wpp && <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
}