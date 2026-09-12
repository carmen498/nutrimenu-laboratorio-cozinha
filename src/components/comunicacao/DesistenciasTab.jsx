import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const formatar = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const STATUS_LABEL = { aberto: "Aberto", em_atendimento: "Em atendimento", concluido: "Concluído", recusado: "Recusado" };

// Fila dos pedidos de desistência (direito de arrependimento de 7 dias).
// O prazo corre do pedido do cliente, não do início do atendimento.
export default function DesistenciasTab() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos-desistencia-admin"],
    queryFn: () => base44.entities.PedidoDesistencia.list("-solicitado_em", 200),
  });

  const atualizar = async (pedido, dados, mensagem) => {
    try {
      await base44.entities.PedidoDesistencia.update(pedido.id, dados);
      await qc.invalidateQueries({ queryKey: ["pedidos-desistencia-admin"] });
      toast({ title: mensagem });
    } catch (err) {
      toast({ title: "Não foi possível atualizar", description: err.message || "", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const pendentes = pedidos.filter((p) => ["aberto", "em_atendimento"].includes(p.status));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Devolução integral é obrigatória por lei quando o pedido é feito em até 7 dias da compra. O estorno em si é executado no Mercado Pago; ao receber o aviso de reembolso, o acesso é revogado automaticamente.
      </p>

      {pendentes.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p><span className="font-medium">{pendentes.length}</span> {pendentes.length === 1 ? "pedido aguardando" : "pedidos aguardando"} devolução.</p>
        </div>
      )}

      {!pedidos.length && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido de desistência registrado.</p>}

      {pedidos.map((pedido) => {
        const atrasado = ["aberto", "em_atendimento"].includes(pedido.status) && new Date(pedido.prazo_atendimento_em) < new Date();
        return (
          <div key={pedido.id} className={`rounded-lg border p-4 space-y-2 ${atrasado ? "border-destructive/50 bg-destructive/5" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{pedido.usuario_nome || pedido.usuario_id}</p>
                <p className="text-sm text-muted-foreground">{pedido.plano_nome || pedido.plano} · R$ {Number(pedido.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex items-center gap-2">
                {atrasado && <Badge variant="destructive">Prazo estourado</Badge>}
                <Badge variant={pedido.status === "concluido" ? "outline" : "secondary"}>{STATUS_LABEL[pedido.status] || pedido.status}</Badge>
              </div>
            </div>

            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <p>Compra: {formatar(pedido.compra_em)}</p>
              <p>Pedido do cliente: <span className="font-medium text-foreground">{formatar(pedido.solicitado_em)}</span></p>
              <p>Prazo para concluir: {formatar(pedido.prazo_atendimento_em)}</p>
              <p>Responsável: {pedido.responsavel_nome || "—"}</p>
              {pedido.concluido_em && <p>Concluído em: {formatar(pedido.concluido_em)}</p>}
              {pedido.motivo && <p className="sm:col-span-2">Motivo informado: {pedido.motivo}</p>}
            </div>

            {["aberto", "em_atendimento"].includes(pedido.status) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {pedido.status === "aberto" && (
                  <Button variant="outline" size="sm" onClick={() => atualizar(pedido, { status: "em_atendimento", responsavel_nome: user?.nome_completo || user?.full_name || user?.email || "" }, "Pedido assumido")}>
                    Assumir atendimento
                  </Button>
                )}
                <Button size="sm" onClick={() => atualizar(pedido, { status: "concluido", concluido_em: new Date().toISOString(), responsavel_nome: pedido.responsavel_nome || user?.nome_completo || user?.full_name || "" }, "Devolução concluída")}>
                  Marcar devolução concluída
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}