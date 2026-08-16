import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import CampanhaConfirmacaoDialog from "./CampanhaConfirmacaoDialog";

export default function CampanhasTab({ destinatarios = [] }) {
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [disparando, setDisparando] = useState(false);

  const podeEnviar = assunto.trim() && corpo.trim() && destinatarios.length > 0;

  const handleTeste = async () => {
    setEnviandoTeste(true);
    try {
      const res = await base44.functions.invoke("campanhaEmail", { acao: "teste", assunto, corpo });
      if (res.data?.success) {
        toast({ title: "E-mail de teste enviado" });
      } else {
        toast({ title: "Falha ao enviar teste", description: res.data?.error, variant: "destructive" });
      }
    } finally {
      setEnviandoTeste(false);
    }
  };

  const handleConfirmarDisparo = async () => {
    setDisparando(true);
    try {
      const emails = destinatarios.map((u) => u.email).filter(Boolean);
      const res = await base44.functions.invoke("campanhaEmail", { acao: "disparar", destinatarios: emails, assunto, corpo });
      toast({ title: "Campanha disparada", description: `${res.data?.enviados ?? 0} de ${res.data?.total ?? 0} e-mails enviados.` });
      setConfirmacaoAberta(false);
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {destinatarios.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-muted/50 border rounded-lg px-4 py-3">
          Nenhum destinatário selecionado. Vá até a aba "Usuários", filtre e marque os destinatários desejados.
        </p>
      ) : (
        <p className="text-sm font-medium">{destinatarios.length} destinatário(s) selecionado(s)</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="campanha-assunto">Assunto</Label>
        <Input id="campanha-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="campanha-corpo">Corpo</Label>
        <Textarea id="campanha-corpo" rows={8} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleTeste} disabled={!assunto.trim() || !corpo.trim() || enviandoTeste}>
          {enviandoTeste && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar teste para mim
        </Button>
        <Button onClick={() => setConfirmacaoAberta(true)} disabled={!podeEnviar}>
          Revisar e disparar
        </Button>
      </div>

      <CampanhaConfirmacaoDialog
        open={confirmacaoAberta}
        onOpenChange={setConfirmacaoAberta}
        destinatarios={destinatarios}
        enviando={disparando}
        onConfirmar={handleConfirmarDisparo}
      />
    </div>
  );
}