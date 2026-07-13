import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Cadastro centralizado de Medidas Caseiras da receita.
 * Lista todos os ingredientes, um por linha, com seletor de utensílio + referência_g.
 * Salva tudo de uma vez (cria/atualiza registros em MedidaCaseira).
 * Ao salvar, invalida ["medidas-caseiras"] → a ficha converte imediatamente.
 */
export default function MedidasCaseirasReceitaDialog({
  open,
  onClose,
  itens = [],
  medidaByIngrediente = {},
  utensilios = [],
  uteMap = {},
  getMedidaDisplay,
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const newRows = {};
      itens.forEach(item => {
        if (!item.ing) return;
        const mc = medidaByIngrediente[item.ing.id];
        if (mc) {
          newRows[item.ing.id] = {
            utensilioId: mc.utensilio || "",
            referenciaG: mc.referencia_g != null ? String(mc.referencia_g) : "",
            soGramas: !!mc.so_gramas,
            existingMc: mc,
          };
        } else {
          newRows[item.ing.id] = {
            utensilioId: "",
            referenciaG: "",
            soGramas: false,
            existingMc: null,
          };
        }
      });
      setRows(newRows);
    }
  }, [open, itens, medidaByIngrediente]);

  const updateRow = (ingId, patch) => {
    setRows(prev => ({ ...prev, [ingId]: { ...prev[ingId], ...patch } }));
  };

  const handleUtensilioChange = (ingId, utensilioId) => {
    const ute = uteMap[utensilioId];
    updateRow(ingId, {
      utensilioId,
      referenciaG: ute && ute.g_medio != null ? String(ute.g_medio) : "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    let created = 0, updated = 0;
    try {
      for (const item of itens) {
        if (!item.ing) continue;
        const row = rows[item.ing.id];
        if (!row || !row.utensilioId) continue;

        const refG = row.referenciaG !== "" ? parseFloat(row.referenciaG.replace(",", ".")) : null;
        if (!row.soGramas && (!refG || refG <= 0)) continue;

        const ute = uteMap[row.utensilioId];
        const nome = `${item.ing.nome} · ${ute?.simbolo || ""}`;

        if (row.existingMc) {
          await base44.entities.MedidaCaseira.update(row.existingMc.id, {
            utensilio: row.utensilioId,
            referencia_g: refG,
            so_gramas: row.soGramas,
            medida_pronto_g: row.existingMc.medida_pronto_g,
            nome,
          });
          updated++;
        } else {
          await base44.entities.MedidaCaseira.create({
            nome,
            alimento: item.ing.id,
            utensilio: row.utensilioId,
            referencia_g: refG,
            so_gramas: row.soGramas,
          });
          created++;
        }
      }
      qc.invalidateQueries({ queryKey: ["medidas-caseiras"] });
      toast.success(`${created} criada(s), ${updated} atualizada(s) — conversões atualizadas!`);
      onClose();
    } catch (err) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Medidas Caseiras da Receita</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 items-center py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b">
            <div className="col-span-4">Ingrediente · Medida atual</div>
            <div className="col-span-5">Utensílio</div>
            <div className="col-span-2 text-center">Ref. (g)</div>
            <div className="col-span-1 text-center" title="Só gramas">só g</div>
          </div>
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum ingrediente na receita.</p>
          )}
          {itens.map(item => {
            if (!item.ing) return null;
            const row = rows[item.ing.id] || { utensilioId: "", referenciaG: "", soGramas: false, existingMc: null };
            const md = getMedidaDisplay ? getMedidaDisplay(item) : null;
            const display = row.soGramas ? "só gramas" : (md?.texto || "— sem medida");
            return (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-border/50">
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-medium truncate">{item.ing.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{display}</p>
                </div>
                <div className="col-span-5">
                  <select
                    value={row.utensilioId}
                    onChange={e => handleUtensilioChange(item.ing.id, e.target.value)}
                    disabled={row.soGramas}
                    className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="">— utensílio —</option>
                    {utensilios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.simbolo} {u.g_medio != null ? `(${u.g_medio}g)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={row.referenciaG}
                    onChange={e => updateRow(item.ing.id, { referenciaG: e.target.value })}
                    disabled={row.soGramas}
                    placeholder="g"
                    className="w-full h-8 text-xs border rounded px-1 text-center"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={row.soGramas}
                    onChange={e => updateRow(item.ing.id, { soGramas: e.target.checked })}
                    className="w-4 h-4"
                    title="Só gramas — conversor nunca exibe medida caseira"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            Salvar tudo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}