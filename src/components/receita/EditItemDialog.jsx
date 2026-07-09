import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function EditItemDialog({ open, onClose, item, porcoesBase, fator, onSave, saving }) {
  const [qtd, setQtd] = useState("");
  const [prePreparo, setPrePreparo] = useState("");

  useEffect(() => {
    if (item) {
      setQtd(String(Math.round(item.qtdNova || 0)));
      setPrePreparo(item.pre_preparo || "");
    }
  }, [item]);

  if (!item) return null;

  const isSubreceita = item.tipo === "subreceita";
  const isFixo = item.proporcional === false;
  const baseTotal = isFixo ? (porcoesBase || 1) : (porcoesBase || 1) * (fator || 1);
  const numPorcoes = Math.round((porcoesBase || 1) * (fator || 1));

  const handleSave = () => {
    const val = parseFloat(qtd);
    if (isNaN(val) || val < 0) return;
    const qtdPorPorcao = baseTotal > 0 ? val / baseTotal : val;
    onSave({ itemId: item.id, quantidade_por_porcao: qtdPorPorcao, pre_preparo: prePreparo });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Editar — {isSubreceita ? item.subreceita_nome : (item.ingrediente_nome || item.ing?.nome)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quantidade total (para {numPorcoes} porções)</Label>
            <Input
              type="number"
              step="0.1"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className="mt-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          {!isSubreceita && (
            <div>
              <Label>Pré-preparo</Label>
              <Input
                value={prePreparo}
                onChange={(e) => setPrePreparo(e.target.value)}
                placeholder="Ex: picado, em cubos"
                className="mt-1"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}