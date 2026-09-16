import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { formatarMoeda, STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_CLASSNAME } from "@/lib/pagamentosUsuario";

export default function ExcluirUsuarioDialog({
  open,
  onOpenChange,
  usuarios = [],
  pagamentosPorUsuario = new Map(),
  movimentacaoPorUsuario = new Map(),
  onConfirm,
  excluindo,
}) {
  const bloqueados = usuarios.filter((u) => {
    const pags = pagamentosPorUsuario.get(u.id) || [];
    return pags.some((p) => p.status === "approved");
  });
  const podeExcluir = bloqueados.length === 0 && usuarios.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Excluir cadastro</DialogTitle>
          <DialogDescription>
            {usuarios.length === 1
              ? "O cadastro e todos os dados vinculados serão removidos permanentemente da base do app."
              : `${usuarios.length} cadastros e todos os dados vinculados serão removidos permanentemente da base do app.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {usuarios.map((u) => {
            const pags = pagamentosPorUsuario.get(u.id) || [];
            const mov = movimentacaoPorUsuario.get(u.id) || { receitas: 0, refeicoes: 0, cardapios: 0, eventos: 0 };
            const temAprovado = pags.some((p) => p.status === "approved");
            const valorTotal = pags.reduce((s, p) => s + (p.valor || 0), 0);

            return (
              <div
                key={u.id}
                className={`rounded-lg border p-3 space-y-2 ${temAprovado ? "border-destructive/40 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.nome_completo || u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {temAprovado && (
                    <Badge variant="destructive" className="flex-shrink-0">Pagamento aprovado</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Pagamentos: <strong className="text-foreground">{pags.length}</strong>{pags.length > 0 && ` (${formatarMoeda(valorTotal)})`}</span>
                  <span>Receitas: <strong className="text-foreground">{mov.receitas}</strong></span>
                  <span>Cardápios: <strong className="text-foreground">{mov.cardapios}</strong></span>
                  <span>Eventos: <strong className="text-foreground">{mov.eventos}</strong></span>
                </div>
                {pags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pags.slice(0, 5).map((p) => (
                      <Badge key={p.id} variant="outline" className={`text-xs ${STATUS_PAGAMENTO_CLASSNAME[p.status] || ""}`}>
                        {formatarMoeda(p.valor)} · {STATUS_PAGAMENTO_LABEL[p.status] || p.status}
                      </Badge>
                    ))}
                    {pags.length > 5 && <Badge variant="outline" className="text-xs">+{pags.length - 5}</Badge>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!podeExcluir && bloqueados.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {bloqueados.length === 1
                ? "Não é possível excluir: há pagamento aprovado e não estornado. Estorne no Mercado Pago antes de apagar o cadastro."
                : `${bloqueados.length} usuário(s) possuem pagamento aprovado e não estornado. Estorne no Mercado Pago antes de apagar.`}
            </span>
          </div>
        )}

        <p className="text-sm font-medium text-destructive">⚠ Esta ação não pode ser desfeita.</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={excluindo}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!podeExcluir || excluindo}>
            {excluindo ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}