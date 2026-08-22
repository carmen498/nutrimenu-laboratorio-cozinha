import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const PADRAO = {
  nome_remetente: "Laboratório de Cozinha",
  tagline: "Receitas que se Multiplicam",
  cor_cabecalho: "#5c7a5f",
  assinatura_rodape: "Carmen Reinstein · Laboratório de Cozinha",
  email_contato: "",
  endereco_rodape: "",
  texto_cancelamento: "Cancelar inscrição",
};

export default function ConfiguracoesEmailTab() {
  const [id, setId] = useState(null);
  const [form, setForm] = useState(PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    base44.entities.ConfiguracaoEmail.list()
      .then((registros) => {
        const registro = registros?.[0];
        if (registro) {
          setId(registro.id);
          setForm({ ...PADRAO, ...registro });
        }
      })
      .finally(() => setCarregando(false));
  }, []);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      if (id) {
        await base44.entities.ConfiguracaoEmail.update(id, form);
      } else {
        const criado = await base44.entities.ConfiguracaoEmail.create(form);
        setId(criado.id);
      }
      toast({ title: "Configurações de e-mail salvas" });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome de exibição do remetente</Label>
          <Input value={form.nome_remetente} onChange={set("nome_remetente")} />
        </div>
        <div className="space-y-1.5">
          <Label>Tagline do cabeçalho</Label>
          <Input value={form.tagline} onChange={set("tagline")} />
        </div>
        <div className="space-y-1.5">
          <Label>Cor de fundo do cabeçalho</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.cor_cabecalho}
              onChange={set("cor_cabecalho")}
              className="h-9 w-12 rounded border border-input cursor-pointer bg-transparent"
            />
            <Input value={form.cor_cabecalho} onChange={set("cor_cabecalho")} className="max-w-[140px]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Assinatura do rodapé</Label>
          <Input value={form.assinatura_rodape} onChange={set("assinatura_rodape")} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail de contato (rodapé)</Label>
          <Input value={form.email_contato} onChange={set("email_contato")} />
        </div>
        <div className="space-y-1.5">
          <Label>Endereço (rodapé)</Label>
          <Input value={form.endereco_rodape} onChange={set("endereco_rodape")} />
        </div>
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>

      <div>
        <Label className="mb-2 block">Preview</Label>
        <div className="rounded-lg overflow-hidden border shadow-sm max-w-[380px]">
          <div style={{ background: form.cor_cabecalho }} className="px-6 py-7 text-center">
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="text-white text-xl font-semibold">
              {form.nome_remetente}
            </div>
            <div className="text-white/85 text-xs mt-1">{form.tagline}</div>
          </div>
          <div className="px-6 py-8 bg-white text-sm text-neutral-800 leading-relaxed space-y-3">
            <p>Olá Fulana, este é um exemplo de corpo de e-mail.</p>
            <a
              href="#"
              style={{ background: form.cor_cabecalho, fontFamily: "Georgia, 'Times New Roman', serif" }}
              className="inline-block text-white px-6 py-2.5 rounded-md text-sm no-underline"
            >
              Acessar o app
            </a>
          </div>
          <div className="px-6 py-5 border-t text-center text-xs text-neutral-400 space-y-0.5">
            <div>{form.assinatura_rodape}</div>
            {form.email_contato && <div>{form.email_contato}</div>}
            {form.endereco_rodape && <div>{form.endereco_rodape}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}