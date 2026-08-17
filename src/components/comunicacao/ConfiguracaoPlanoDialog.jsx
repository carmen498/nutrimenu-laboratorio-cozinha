import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ConfiguracaoPlanoDialog({ open, onOpenChange, plano, onSaved }) {
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open && plano) {
      setForm({ ...plano, beneficios: (plano.beneficios || []).join("\n") });
    }
  }, [open, plano]);

  if (!form) return null;

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const setNum = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value === "" ? "" : parseFloat(e.target.value) }));

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const dados = {
        nome: form.nome,
        subtitulo: form.subtitulo || "",
        preco_exibido: Number(form.preco_exibido) || 0,
        periodo_exibido: form.periodo_exibido,
        preco_detalhe: form.preco_detalhe || "",
        valor_cobranca: Number(form.valor_cobranca) || 0,
        beneficios: form.beneficios.split("\n").map((b) => b.trim()).filter(Boolean),
        mais_popular: !!form.mais_popular,
      };
      await base44.entities.ConfiguracaoPlano.update(plano.id, dados);
      toast({ title: "Plano salvo" });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar plano — {plano.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={set("nome")} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo/destaque</Label>
              <Input value={form.subtitulo} onChange={set("subtitulo")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço exibido (R$)</Label>
              <Input type="number" step="0.01" value={form.preco_exibido} onChange={setNum("preco_exibido")} />
            </div>
            <div className="space-y-1.5">
              <Label>Período de cobrança</Label>
              <Select value={form.periodo_exibido} onValueChange={(v) => setForm((f) => ({ ...f, periodo_exibido: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Por mês</SelectItem>
                  <SelectItem value="ano">Por ano</SelectItem>
                  <SelectItem value="unico">Valor único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Texto complementar (linha pequena abaixo do preço)</Label>
            <Input value={form.preco_detalhe} onChange={set("preco_detalhe")} placeholder="Ex: R$ 198/ano" />
          </div>

          <div className="space-y-1.5">
            <Label>Valor cobrado no checkout (R$)</Label>
            <Input type="number" step="0.01" value={form.valor_cobranca} onChange={setNum("valor_cobranca")} />
            <p className="text-xs text-muted-foreground">
              Este é o valor efetivamente cobrado via Mercado Pago quando o cliente assina este plano.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Benefícios (um por linha)</Label>
            <Textarea rows={5} value={form.beneficios} onChange={set("beneficios")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Mais popular</Label>
              <p className="text-xs text-muted-foreground">Exibe o destaque "Mais popular" neste card</p>
            </div>
            <Switch checked={!!form.mais_popular} onCheckedChange={(v) => setForm((f) => ({ ...f, mais_popular: v }))} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}