import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Scale } from "lucide-react";

export default function EscalarReceitaDialog({ open, onClose, pc, onConfirm }) {
  const [porcoesDesejadas, setPorcoesDesejadas] = useState("");
  const [preview, setPreview] = useState(null); // { totalG }
  const [confirming, setConfirming] = useState(false);

  const handleClose = () => {
    setPorcoesDesejadas("");
    setPreview(null);
    onClose();
  };

  const handleCalcular = () => {
    const n = parseFloat(String(porcoesDesejadas).replace(",", "."));
    if (isNaN(n) || n <= 0 || !pc || pc <= 0) return;
    setPreview({ totalG: Math.round(n * pc) });
  };

  const handleConfirmar = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      await onConfirm(preview.totalG);
      handleClose();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Escalar receita
          </DialogTitle>
          <DialogDescription>
            Informe quantas porções deseja produzir. Vamos calcular a quantidade total e reescalar todos os ingredientes proporcionalmente.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Número de porções desejado</Label>
              <Input
                type="text"
                inputMode="decimal"
                autoFocus
                value={porcoesDesejadas}
                onChange={(e) => setPorcoesDesejadas(e.target.value)}
                placeholder="Ex: 22"
                onKeyDown={(e) => { if (e.key === "Enter") handleCalcular(); }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleCalcular} disabled={!porcoesDesejadas}>Calcular</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Isso vai gerar <span className="font-bold text-primary">{preview.totalG.toLocaleString("pt-BR")}g</span> de receita — deseja recalcular os ingredientes para esta quantidade?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPreview(null)} disabled={confirming}>Voltar</Button>
              <Button onClick={handleConfirmar} disabled={confirming}>
                {confirming ? "Escalando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}