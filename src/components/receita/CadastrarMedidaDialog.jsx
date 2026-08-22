import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Cadastro de MedidaCaseira a partir da ficha da receita.
 * Fase 4: grava os campos canônicos (ingrediente_id, utensilio_id, peso_g)
 * e mantém os campos legados espelhados durante a migração.
 */
export default function CadastrarMedidaDialog({ open, onClose, ingrediente, utensilios = [], medidaExistente = null }) {
  const qc = useQueryClient();
  const [utensilioId, setUtensilioId] = useState("");
  const [referenciaG, setReferenciaG] = useState("");
  const [soGramas, setSoGramas] = useState(false);
  const [userTouchedRef, setUserTouchedRef] = useState(false);

  const uteMap = {};
  utensilios.forEach((u) => { uteMap[u.id] = u; });

  useEffect(() => {
    if (!utensilioId) return;
    const ute = uteMap[utensilioId];
    if (ute && !userTouchedRef) {
      setReferenciaG(ute.g_medio != null ? String(ute.g_medio) : "");
    }
  }, [utensilioId]);

  useEffect(() => {
    if (open) {
      if (medidaExistente) {
        setUtensilioId(medidaExistente.utensilio_id || medidaExistente.utensilio || "");
        const peso = medidaExistente.peso_g ?? medidaExistente.referencia_g ?? medidaExistente.equivalencia_g;
        setReferenciaG(peso != null ? String(peso) : "");
        setSoGramas(!!medidaExistente.so_gramas);
      } else {
        setUtensilioId("");
        setReferenciaG("");
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

    const payload = {
      nome: `${ingrediente.nome} · ${ute.simbolo}`,
      ingrediente_id: ingrediente.id,
      utensilio_id: utensilioId,
      quantidade_utensilio: 1,
      peso_g: refG,
      estado_alimento: "cru",
      so_gramas: soGramas,
      // Compatibilidade temporária
      alimento: ingrediente.id,
      utensilio: utensilioId,
      referencia_g: refG,
      equivalencia_g: refG,
    };

    try {
      if (medidaExistente) {
        await base44.entities.MedidaCaseira.update(medidaExistente.id, payload);
        toast.success("Medida atualizada — conversão recalculada!");
      } else {
        await base44.entities.MedidaCaseira.create(payload);
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soGramas}
              onChange={(e) => setSoGramas(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" title="Marcado, este ingrediente mostra apenas o peso em g; a medida caseira não é exibida nas fichas.">
              Exibir só gramas (oculta a medida caseira)
            </span>
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
