import { useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";

const WHATSAPP_NUMERO = "555134160886"; // +55 (51) 3416-0886
const ASSUNTOS = ["Dúvida", "Bug/Problema técnico", "Sugestão", "Outro"];

export default function Suporte() {
  const { user } = useAuth();
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleEnviar = () => {
    if (!assunto || !mensagem.trim()) return;
    const texto = `*Suporte - Laboratório de Cozinha*\n\nDe: ${user?.email || ""}\nAssunto: ${assunto}\nMensagem: ${mensagem.trim()}`;
    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
    abrirUrlHttpsSegura(url);
    toast.success("WhatsApp aberto. Envie a mensagem na conversa para concluir o contato.");
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-6 h-6" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Suporte</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Preencha o formulário abaixo para entrar em contato com nossa equipe.
      </p>

      <Card className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>De</Label>
          <Input value={user?.email || ""} disabled />
        </div>

        <div className="space-y-1.5">
          <Label>Assunto</Label>
          <Select value={assunto} onValueChange={setAssunto}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o assunto" />
            </SelectTrigger>
            <SelectContent>
              {ASSUNTOS.map((op) => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Mensagem</Label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            placeholder="Descreva sua dúvida, problema ou sugestão..."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <Button
          className="w-full gap-1.5"
          style={{ backgroundColor: "#2A4E3D" }}
          disabled={!assunto || !mensagem.trim()}
          onClick={handleEnviar}
        >
          <Send className="w-4 h-4" /> Abrir WhatsApp
        </Button>
      </Card>
    </div>
  );
}