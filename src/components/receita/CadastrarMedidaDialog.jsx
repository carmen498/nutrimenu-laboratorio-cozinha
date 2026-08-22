import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  chaveCanonicaMedida,
  getPesoPorMedidaG,
  getUtensilioIdMedida,
  normalizarPayloadMedidaCaseira,
} from "@/lib/medidaCaseiraModel";

export default function CadastrarMedidaDialog({ open, onClose, ingrediente, utensilios = [], medidaExistente = null }) {
  const qc = useQueryClient();
  const [utensilioId, setUtensilioId] = useState("");
  const [referenciaG, setReferenciaG] = useState("");
  const [estadoAlimento, setEstadoAlimento] = useState("cru");
  const [fonte, setFonte] = useState("Medição própria");
  const [soGramas, setSoGramas] = useState(false);

  const uteMap = {};
  utensilios.forEach((u) => { uteMap[u.id] = u; });

  useEffect(() => {
    if (!open) return;
    if (medidaExistente) {
      setUtensilioId(getUtensilioIdMedida(medidaExistente) || "");
      const peso = getPesoPorMedidaG(medidaExistente);
      setReferenciaG(peso != null ? String(peso) : "");
      setEstadoAlimento(medidaExistente.estado_alimento || "não informado");
      setFonte(medidaExistente.fonte || "Medição própria");
      setSoGramas(!!medidaExistente.so_gramas);
    } else {
      setUtensilioId("");
      setReferenciaG("");
      setEstadoAlimento("cru");
      setFonte("Medição própria");
      setSoGramas(false);
    }
  }, [open, medidaExistente]);

  const handleSave = async () => {
    if (!ingrediente?.id) { toast.error("Ingrediente inválido"); return; }
    if (!soGramas && !utensilioId) { toast.error("Selecione um utensílio"); return; }

    const ute = uteMap[utensilioId];
    const refG = referenciaG !== "" ? parseFloat(referenciaG.replace(",", ".")) : null;
    if (!soGramas && (!refG || refG <= 0)) {
      toast.error("Informe o peso correspondente à medida (ou marque 'Só gramas')");
      return;
    }

    const payload = normalizarPayloadMedidaCaseira({
      nome: soGramas ? `${ingrediente.nome} · só gramas` : `${ingrediente.nome} · ${ute?.simbolo || ute?.nome || "medida"}`,
      ingrediente_id: ingrediente.id,
      utensilio_id: soGramas ? "" : utensilioId,
      quantidade_utensilio: 1,
      peso_g: soGramas ? null : refG,
      estado_alimento: estadoAlimento,
      fonte: fonte.trim() || "Medição própria",
      so_gramas: soGramas,
    });

    try {
      if (!medidaExistente) {
        const existentes = await base44.entities.MedidaCaseira.list("-created_date", 1000);
        const novaChave = chaveCanonicaMedida(payload);
        if (existentes.some((mc) => chaveCanonicaMedida(mc) === novaChave)) {
          toast.error("Já existe uma equivalência para este ingrediente, utensílio e estado.");
          return;
        }
      }

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
            <Label className="text-xs">Estado do alimento *</Label>
            <select value={estadoAlimento} onChange={(e) => setEstadoAlimento(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm mt-1">
              <option value="cru">Cru / antes do preparo</option>
              <option value="pronto">Pronto / depois do preparo</option>
              <option value="não informado">Não informado</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Utensílio {!soGramas && "*"}</Label>
            <select value={utensilioId} onChange={(e) => setUtensilioId(e.target.value)} disabled={soGramas} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm mt-1 disabled:opacity-50">
              <option value="">Selecione...</option>
              {utensilios.map((u) => (
                <option key={u.id} value={u.id}>{u.simbolo} — {u.descricao_singular || u.nome}{u.capacidade_ml != null ? ` (${u.capacidade_ml} ml)` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Peso correspondente a 1 medida (g) {!soGramas && "*"}</Label>
            <Input type="text" value={referenciaG} onChange={(e) => setReferenciaG(e.target.value)} placeholder="ex: 120" disabled={soGramas} className="mt-1" />
            {!soGramas && <p className="text-[11px] text-muted-foreground mt-1">Informe a massa medida para este alimento; o app não usa gramatura genérica do utensílio.</p>}
          </div>
          <div>
            <Label className="text-xs">Fonte</Label>
            <Input value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="Ex.: medição própria, fabricante, literatura" className="mt-1" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={soGramas} onChange={(e) => setSoGramas(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm">Exibir só gramas (oculta a medida caseira)</span>
          </label>
        </div>
        <DialogFooter>
          {medidaExistente && (
            <Button variant="destructive" className="mr-auto" onClick={async () => {
              try {
                await base44.entities.MedidaCaseira.delete(medidaExistente.id);
                qc.invalidateQueries({ queryKey: ["medidas-caseiras"] });
                toast.success("Medida removida");
                onClose();
              } catch (err) { toast.error("Erro ao remover: " + (err.message || "")); }
            }}><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
