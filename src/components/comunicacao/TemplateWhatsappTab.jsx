import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Plus, ImageUp } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import TemplateWhatsappPreview from "./TemplateWhatsappPreview";

const STATUS_OPCOES = ["Aguardando envio", "Aguardando aprovação da Meta", "Aprovado", "Rejeitado"];

const VAZIO = { id: null, nome: "", cabecalho_url: "", corpo: "", rodape: "", status_aprovacao: "Aguardando envio" };

export default function TemplateWhatsappTab({ nomeInicial }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-whatsapp"],
    queryFn: () => base44.entities.TemplateWhatsApp.list("-created_date"),
  });

  useEffect(() => {
    if (nomeInicial) {
      setForm({ ...VAZIO, nome: nomeInicial });
    }
  }, [nomeInicial]);

  const selecionar = (template) => setForm(template);
  const novo = () => setForm(VAZIO);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoImagem(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, cabecalho_url: file_url }));
    } finally {
      setEnviandoImagem(false);
    }
  };

  const handleSalvar = async () => {
    if (!form.nome.trim() || !form.corpo.trim()) {
      toast({ title: "Nome e corpo são obrigatórios", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        cabecalho_url: form.cabecalho_url,
        corpo: form.corpo,
        rodape: form.rodape,
        status_aprovacao: form.status_aprovacao,
      };
      if (form.id) {
        await base44.entities.TemplateWhatsApp.update(form.id, payload);
      } else {
        const criado = await base44.entities.TemplateWhatsApp.create(payload);
        setForm(criado);
      }
      queryClient.invalidateQueries({ queryKey: ["templates-whatsapp"] });
      toast({ title: "Template salvo" });
    } finally {
      setSalvando(false);
    }
  };

  const handleCopiar = () => {
    const texto = `Nome: ${form.nome}\n\nCabeçalho: ${form.cabecalho_url || "(sem imagem)"}\n\nCorpo:\n${form.corpo}\n\nRodapé: ${form.rodape || "(sem rodapé)"}`;
    navigator.clipboard.writeText(texto);
    toast({ title: "Copiado para a área de transferência" });
  };

  return (
    <div className="grid md:grid-cols-[220px_1fr_280px] gap-6">
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={novo}>
          <Plus className="w-4 h-4 mr-1" /> Novo template
        </Button>
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => selecionar(t)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent ${form.id === t.id ? "bg-accent font-medium" : ""}`}
            >
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome do template</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex: pagamento_recusado_v1" />
        </div>
        <div className="space-y-1.5">
          <Label>Cabeçalho (imagem)</Label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={enviandoImagem}>
            {enviandoImagem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageUp className="w-4 h-4 mr-2" />}
            {form.cabecalho_url ? "Trocar imagem" : "Enviar imagem"}
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label>Corpo (use {"{{nome}}"} para personalizar)</Label>
          <Textarea rows={5} value={form.corpo} onChange={(e) => setForm({ ...form, corpo: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Rodapé (opcional)</Label>
          <Input value={form.rodape} onChange={(e) => setForm({ ...form, rodape: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Status de aprovação</Label>
          <Select value={form.status_aprovacao} onValueChange={(v) => setForm({ ...form, status_aprovacao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPCOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar template
          </Button>
          <Button variant="outline" onClick={handleCopiar}>
            <Copy className="w-4 h-4 mr-2" /> Copiar para colar no To Talk
          </Button>
        </div>
      </div>

      <TemplateWhatsappPreview cabecalhoUrl={form.cabecalho_url} corpo={form.corpo} rodape={form.rodape} />
    </div>
  );
}