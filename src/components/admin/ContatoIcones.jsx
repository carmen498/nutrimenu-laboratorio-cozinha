import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/statusAssinaturaUsuario";

export default function ContatoIcones({ email, telefone, nome }) {
  const emailLimpo = String(email || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const nomeLimpo = String(nome || "").replace(/[<>"]/g, "").trim();
  const destinatario = nomeLimpo && nomeLimpo.toLowerCase() !== emailLimpo.toLowerCase()
    ? `${nomeLimpo} <${emailLimpo}>`
    : emailLimpo;
  const wpp = whatsappHref(telefone);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {emailLimpo && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" asChild>
          <a href={`mailto:${destinatario}`} title={`Enviar e-mail para ${emailLimpo}`}>
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
      {!emailLimpo && !wpp && <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
}