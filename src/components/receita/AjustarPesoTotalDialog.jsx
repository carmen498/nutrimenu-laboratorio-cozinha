import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Escala PERMANENTE do rendimento da receita: sobrescreve os pesos dos
// ingredientes na ficha (diferente do escalador de contexto, que é efêmero).
export default function AjustarPesoTotalDialog({ open, onClose, receitaId, rendimentoAtual, unidadeBase, itens, onSuccess }) {
  const [novoPeso, setNovoPeso] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const val = parseFloat(String(novoPeso).replace(",", "."));
  const valido = !isNaN(val) && val > 0;

  const handleConfirmar = async () => {
    if (!valido || !rendimentoAtual) return;
    setSaving(true);
    try {
      const fator = val / rendimentoAtual;
      const updates = (itens || [])
        .filter((i) => i.tipo !== "grupo")
        .map((i) => ({ id: i.id, quantidade_por_porcao: (i.quantidade_por_porcao || 0) * fator }));
      if (updates.length > 0) {
        await base44.entities.IngredienteReceita.bulkUpdate(updates);
      }
      await base44.entities.Receita.update(receitaId, { rendimento_total: val });
      toast.success("Receita ajustada para o novo peso total!");
      onSuccess(val);
      onClose();
    } catch (err) {
      toast.error("Erro ao ajustar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Ajustar para peso total</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Rendimento atual: <span className="font-semibold">{(rendimentoAtual || 0).toLocaleString("pt-BR")} {unidadeBase || "g"}</span>
          </p>
          <div>
            <Label>Novo peso total ({unidadeBase || "g"})</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={novoPeso}
              onChange={(e) => { setNovoPeso(e.target.value); setConfirmando(false); }}
              placeholder="Ex: 500"
              autoFocus
            />
          </div>
          {valido && !confirmando && (
            <Button className="w-full" onClick={() => setConfirmando(true)}>Continuar</Button>
          )}
          {valido && confirmando && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Isso vai reescrever permanentemente os pesos desta receita para render {val.toLocaleString("pt-BR")} {unidadeBase || "g"}. Não é reversível automaticamente. Confirmar?
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {confirmando && (
            <Button onClick={handleConfirmar} disabled={saving}>
              {saving ? "Ajustando..." : "Confirmar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}