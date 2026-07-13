import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Regra 3 — Cadastro de MedidaCaseira a partir da ficha da receita.
 * Usuário escolhe utensílio (g_medio pré-preenchido, ajustável) → grava → vale imediatamente.
 */
export default function CadastrarMedidaDialog({ open, onClose, ingrediente, utensilios = [], medidaExistente = null }) {
  const qc = useQueryClient();
  const [utensilioId, setUtensilioId] = useState("");
  const [referenciaG, setReferenciaG] = useState("");
  const [medidaProntoG, setMedidaProntoG] = useState("");
  const [soGramas, setSoGramas] = useState(false);
  const [userTouchedRef, setUserTouchedRef] = useState(false);

  const uteMap = {};
  utensilios.forEach((u) => { uteMap[u.id] = u; });

  // Quando o usuário troca o utensílio, pré-preenche referencia_g com g_medio (se não tocou manualmente)
  useEffect(() => {
    if (!utensilioId) return;
    const ute = uteMap[utensilioId];
    if (ute && !userTouchedRef) {
      setReferenciaG(ute.g_medio != null ? String(ute.g_medio) : "");
    }
  }, [utensilioId]);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      if (medidaExistente) {
        setUtensilioId(medidaExistente.utensilio || "");
        setReferenciaG(medidaExistente.referencia_g != null ? String(medidaExistente.referencia_g) : "");
        setMedidaProntoG(medidaExistente.medida_pronto_g != null ? String(medidaExistente.medida_pronto_g) : "");
        setSoGramas(!!medidaExistente.so_gramas);
      } else {
        setUtensilioId("");
        setReferenciaG("");
        setMedidaProntoG("");
        setSoGramas(false);
      }
      setUserTouchedRef(false);
    }
  }, [open, medidaExistente]);

  const handleSave = async () => {
    if (!utensilioId) {
      toast.error("Selecione um utensílio");
      return;
    }
    const ute = uteMap[utensilioId];
    const refG = referenciaG !== "" ? parseFloat(referenciaG.replace(",", ".")) : null;
    if (!soGramas && (!refG || refG <= 0)) {
      toast.error("Informe a referência em gramas (ou marque 'Só gramas')");
      return;
    }
    try {
      if (medidaExistente) {
        await base44.entities.MedidaCaseira.update(medidaExistente.id, {
          utensilio: utensilioId,
          referencia_g: refG,
          medida_pronto_g: medidaProntoG !== "" ? parseFloat(medidaProntoG.replace(",", ".")) : null,
          so_gramas: soGramas,
          nome: `${ingrediente.nome} · ${ute.simbolo}`,
        });
        toast.success("Medida atualizada — conversão recalculada!");
      } else {
        await base44.entities.MedidaCaseira.create({
          nome: `${ingrediente.nome} · ${ute.simbolo}`,
          alimento: ingrediente.id,
          utensilio: utensilioId,
          referencia_g: refG,
          medida_pronto_g: medidaProntoG !== "" ? parseFloat(medidaProntoG.replace(",", ".")) : null,
          so_gramas: soGramas,
        });
        toast.success("Medida cadastrada — conversão ativa!");
      }
      qc.invalidateQueries({ queryKey: ["medidas-caseiras"] });
      onClose();
    } catch (err) {
      toast.error("Erro: " + (err.message || ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{medidaExistente ? "Editar" : "Cadastrar"} medida — {ingrediente?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Utensílio *</Label>
            <select
              value={utensilioId}
              onChange={(e) => setUtensilioId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm mt-1"
            >
              <option value="">Selecione...</option>
              {utensilios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.simbolo} — {u.descricao_singular}
                  {u.g_medio != null ? ` (g médio: ${u.g_medio})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Referência (g cru) {!soGramas && "*"}</Label>
              <Input
                type="text"
                value={referenciaG}
                onChange={(e) => { setReferenciaG(e.target.value); setUserTouchedRef(true); }}
                placeholder="ex: 200"
                disabled={soGramas}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Pronto (g) — opcional</Label>
              <Input
                type="text"
                value={medidaProntoG}
                onChange={(e) => setMedidaProntoG(e.target.value)}
                placeholder="—"
                className="mt-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soGramas}
              onChange={(e) => setSoGramas(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Só gramas (conversor nunca exibe medida caseira para este alimento)</span>
          </label>
        </div>
        <DialogFooter>
          {medidaExistente && (
            <Button variant="destructive" className="mr-auto" onClick={async () => {
              try {
                await base44.entities.MedidaCaseira.delete(medidaExistente.id);
                qc.invalidateQueries({ queryKey: ["medidas-caseiras"] });
                toast.success("Medida removida — linha volta a exibir apenas gramas");
                onClose();
              } catch (err) {
                toast.error("Erro ao remover: " + (err.message || ""));
              }
            }}>
              <Trash2 className="w-4 h-4 mr-1" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}