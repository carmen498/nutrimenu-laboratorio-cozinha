import { Mail, MessageCircle } from "lucide-react";
import { whatsappHref } from "@/lib/statusAssinaturaUsuario";

export default function ContatoIcones({ email, telefone }) {
  const wpp = whatsappHref(telefone);
  return (
    <div className="flex items-center gap-2.5">
      {email && (
        <a href={`mailto:${email}`} title="Enviar e-mail" className="text-muted-foreground hover:text-primary transition-colors">
          <Mail className="w-4 h-4" />
        </a>
      )}
      {wpp && (
        <a
          href={wpp}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir WhatsApp"
          className="text-muted-foreground hover:text-green-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}