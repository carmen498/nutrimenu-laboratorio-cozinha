import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const PUBLICOS = [
  { value: "todos_ativos", label: "Todos ativos" },
  { value: "trial_nao_convertido", label: "Trial não convertido" },
  { value: "plano_mensal", label: "Plano mensal" },
  { value: "plano_anual", label: "Plano anual" },
  { value: "trial_vencido_30d", label: "Trial vencido há 30+ dias" },
];

export default function CampanhasTab() {
  const [publico, setPublico] = useState("todos_ativos");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [contagem, setContagem] = useState(null);
  const [contando, setContando] = useState(false);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [disparando, setDisparando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setContando(true);
    base44.functions
      .invoke("campanhaEmail", { acao: "contar", publico })
      .then((res) => { if (ativo) setContagem(res.data?.total ?? 0); })
      .catch(() => { if (ativo) setContagem(null); })
      .finally(() => { if (ativo) setContando(false); });
    return () => { ativo = false; };
  }, [publico]);

  const handleTeste = async () => {
    setEnviandoTeste(true);
    try {
      const res = await base44.functions.invoke("campanhaEmail", { acao: "teste", publico, assunto, corpo });
      if (res.data?.success) {
        toast({ title: "E-mail de teste enviado" });
      } else {
        toast({ title: "Falha ao enviar teste", description: res.data?.error, variant: "destructive" });
      }
    } finally {
      setEnviandoTeste(false);
    }
  };

  const handleDisparar = async () => {
    if (!window.confirm(`Enviar esta campanha para ${contagem ?? "..."} destinatário(s)?`)) return;
    setDisparando(true);
    try {
      const res = await base44.functions.invoke("campanhaEmail", { acao: "disparar", publico, assunto, corpo });
      toast({ title: "Campanha disparada", description: `${res.data?.enviados ?? 0} de ${res.data?.total ?? 0} e-mails enviados.` });
    } finally {
      setDisparando(false);
    }
  };

  const podeEnviar = assunto.trim() && corpo.trim();

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label>Público-alvo</Label>
        <Select value={publico} onValueChange={setPublico}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PUBLICOS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {contando ? "Calculando destinatários..." : `${contagem ?? 0} destinatário(s) estimado(s)`}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="campanha-assunto">Assunto</Label>
        <Input id="campanha-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="campanha-corpo">Corpo</Label>
        <Textarea id="campanha-corpo" rows={8} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleTeste} disabled={!podeEnviar || enviandoTeste}>
          {enviandoTeste && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar teste para mim
        </Button>
        <Button onClick={handleDisparar} disabled={!podeEnviar || disparando}>
          {disparando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Disparar campanha
        </Button>
      </div>
    </div>
  );
}