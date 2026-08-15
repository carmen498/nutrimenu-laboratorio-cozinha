import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function TemplateEmailDialog({ open, onOpenChange, tipo, titulo, assuntoPadrao, corpoPadrao }) {
  const [templateId, setTemplateId] = useState(null);
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    base44.entities.TemplateEmail.filter({ tipo })
      .then((templates) => {
        const template = templates?.[0];
        setTemplateId(template?.id || null);
        setAssunto(template?.assunto || assuntoPadrao);
        setCorpo(template?.corpo || corpoPadrao);
      })
      .finally(() => setCarregando(false));
  }, [open, tipo, assuntoPadrao, corpoPadrao]);

  const handleSalvar = async () => {
    if (!assunto.trim() || !corpo.trim()) {
      toast({ title: "Assunto e corpo são obrigatórios", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      if (templateId) {
        await base44.entities.TemplateEmail.update(templateId, { assunto, corpo });
      } else {
        const criado = await base44.entities.TemplateEmail.create({ tipo, assunto, corpo });
        setTemplateId(criado.id);
      }
      toast({ title: "Template salvo" });
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Use {"{{nome}}"} no assunto ou no corpo para personalizar com o nome do destinatário.
          </DialogDescription>
        </DialogHeader>
        {carregando ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="template-email-assunto">Assunto</Label>
              <Input id="template-email-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-email-corpo">Corpo (texto/HTML simples)</Label>
              <Textarea
                id="template-email-corpo"
                rows={8}
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={handleSalvar} disabled={carregando || salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}