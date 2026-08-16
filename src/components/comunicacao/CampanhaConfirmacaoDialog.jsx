import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function CampanhaConfirmacaoDialog({ open, onOpenChange, destinatarios, enviando, onConfirmar }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revisar campanha</DialogTitle>
          <DialogDescription>
            Esta campanha será enviada para {destinatarios.length} destinatário(s):
          </DialogDescription>
        </DialogHeader>
        <div className="border rounded-lg max-h-60 overflow-y-auto p-3 space-y-1">
          {destinatarios.map((u) => (
            <p key={u.id} className="text-sm truncate">{u.nome_completo || u.full_name || u.email}</p>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Voltar
          </Button>
          <Button onClick={onConfirmar} disabled={enviando || destinatarios.length === 0}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Disparar campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}