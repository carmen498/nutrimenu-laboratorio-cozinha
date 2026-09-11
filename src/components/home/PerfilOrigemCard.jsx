import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEGMENTOS, ORIGENS } from "@/lib/statusAssinaturaUsuario";
import { toast } from "@/components/ui/use-toast";
import { X, Loader2 } from "lucide-react";

const CHAVE_DISPENSA = "perfil_origem_dispensado";

/**
 * Plano 4.4 — rastreabilidade de canal: pergunta origem e segmento (opcional)
 * a quem ainda não tem esses dados preenchidos. Some após salvar ou dispensar.
 */
export default function PerfilOrigemCard({ user, onSalvo }) {
  const [origem, setOrigem] = useState("");
  const [segmento, setSegmento] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [oculto, setOculto] = useState(() => localStorage.getItem(CHAVE_DISPENSA) === "1");

  if (oculto || !user || user.role === "admin" || user.origem || user.segmento) return null;

  const dispensar = () => {
    localStorage.setItem(CHAVE_DISPENSA, "1");
    setOculto(true);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = {};
      if (origem) dados.origem = origem;
      if (segmento) dados.segmento = segmento;
      await base44.auth.updateMe(dados);
      localStorage.setItem(CHAVE_DISPENSA, "1");
      setOculto(true);
      toast({ title: "Obrigada! Isso nos ajuda a melhorar o Laboratório." });
      onSalvo?.();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: err.message, variant: "destructive" });
      setSalvando(false);
    }
  };

  return (
    <Card className="p-4 border" style={{ borderColor: "#E8E0D5" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-foreground">Conte um pouco sobre você</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Duas respostas rápidas e opcionais.</p>
        </div>
        <button onClick={dispensar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={origem} onValueChange={setOrigem}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Como você nos conheceu?" /></SelectTrigger>
          <SelectContent>
            {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={segmento} onValueChange={setSegmento}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Sua área de atuação" /></SelectTrigger>
          <SelectContent>
            {SEGMENTOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={salvar} disabled={salvando || (!origem && !segmento)} className="sm:w-auto">
          {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </Card>
  );
}