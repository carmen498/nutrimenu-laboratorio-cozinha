import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { EVENTOS_WASCRIPT, TEXTOS_PADRAO_WASCRIPT } from "@/lib/eventosWascript";
import TemplateWascriptPreview from "./TemplateWascriptPreview";

export default function TemplateWascriptTab({ tipoInicial }) {
  const queryClient = useQueryClient();
  const [tipoSelecionado, setTipoSelecionado] = useState(tipoInicial || EVENTOS_WASCRIPT[0].tipo);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-wascript"],
    queryFn: () => base44.entities.TemplateWascript.list(),
  });

  useEffect(() => {
    if (tipoInicial) setTipoSelecionado(tipoInicial);
  }, [tipoInicial]);

  useEffect(() => {
    const existente = templates.find((t) => t.tipo === tipoSelecionado);
    if (existente) {
      setForm(existente);
    } else {
      // Sem template salvo: o sistema usa o texto padrão como ativo (ver notificarWascript.ts).
      setForm({ id: null, tipo: tipoSelecionado, texto: TEXTOS_PADRAO_WASCRIPT[tipoSelecionado] || "", status: "ativo" });
    }
  }, [tipoSelecionado, templates]);

  if (!form) return null;

  const handleSalvar = async () => {
    if (!form.texto.trim()) {
      toast({ title: "O texto é obrigatório", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const payload = { tipo: form.tipo, texto: form.texto, status: form.status };
      if (form.id) {
        await base44.entities.TemplateWascript.update(form.id, payload);
      } else {
        const criado = await base44.entities.TemplateWascript.create(payload);
        setForm(criado);
      }
      await queryClient.invalidateQueries({ queryKey: ["templates-wascript"] });
      toast({ title: "Template salvo" });
    } finally {
      setSalvando(false);
    }
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(form.texto);
    toast({ title: "Copiado para a área de transferência" });
  };

  return (
    <div className="grid md:grid-cols-[220px_1fr_280px] gap-6">
      <div className="space-y-1">
        {EVENTOS_WASCRIPT.map((ev) => (
          <button
            key={ev.tipo}
            onClick={() => setTipoSelecionado(ev.tipo)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent ${tipoSelecionado === ev.tipo ? "bg-accent font-medium" : ""}`}
          >
            {ev.evento}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Evento</Label>
          <p className="text-sm font-medium">{EVENTOS_WASCRIPT.find((e) => e.tipo === form.tipo)?.evento}</p>
        </div>
        <div className="space-y-1.5">
          <Label>Texto da mensagem (use {"{{nome}}"} para personalizar)</Label>
          <Textarea rows={6} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar template
          </Button>
          <Button variant="outline" onClick={handleCopiar}>
            <Copy className="w-4 h-4 mr-2" /> Copiar texto
          </Button>
        </div>
      </div>

      <TemplateWascriptPreview texto={form.texto} />
    </div>
  );
}