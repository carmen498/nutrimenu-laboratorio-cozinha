import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ExcluirIngredienteDialog({ open, onClose, ingrediente, mode = "delete", onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [receitas, setReceitas] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open && ingrediente) {
      setLoading(true);
      setReceitas([]);
      base44.functions.invoke("verificarExcluirIngrediente", {
        ingrediente_id: ingrediente.id,
        acao: "verificar"
      }).then(res => {
        setReceitas(res.data?.receitas || []);
      }).catch(() => {
        setReceitas([]);
      }).finally(() => setLoading(false));
    }
  }, [open, ingrediente]);

  const handleConfirm = async () => {
    if (mode === "delete") {
      setActionLoading(true);
      try {
        await base44.functions.invoke("verificarExcluirIngrediente", {
          ingrediente_id: ingrediente.id,
          acao: "excluir"
        });
        toast.success(`Ingrediente excluído${receitas.length > 0 ? ` · ${receitas.length} receitas marcadas para revisão` : ""}`);
        onConfirm?.();
      } catch (err) {
        toast.error("Erro ao excluir: " + (err.message || ""));
      } finally {
        setActionLoading(false);
      }
    } else {
      onConfirm?.();
    }
  };

  if (!ingrediente) return null;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            {mode === "delete" ? `Excluir ${ingrediente.nome}?` : `Editar ${ingrediente.nome}`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {loading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando uso...
                </div>
              ) : receitas.length > 0 ? (
                <div className="space-y-2">
                  <p>
                    Este ingrediente é usado em <strong>{receitas.length} receita{receitas.length > 1 ? "s" : ""}</strong>:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-0.5 max-h-32 overflow-y-auto">
                    {receitas.map(r => <li key={r.id}>{r.nome}</li>)}
                  </ul>
                  {mode === "delete" ? (
                    <p className="text-destructive font-medium">Excluir vai remover essas linhas e alterar o custo.</p>
                  ) : (
                    <p className="text-muted-foreground">As alterações de nome ou unidade se refletem em todas as receitas acima.</p>
                  )}
                </div>
              ) : (
                <p>Este ingrediente não está em uso em nenhuma receita.</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || actionLoading}
            className={mode === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {actionLoading ? "Processando..." : mode === "delete" ? "Excluir mesmo assim" : "Continuar editando"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}