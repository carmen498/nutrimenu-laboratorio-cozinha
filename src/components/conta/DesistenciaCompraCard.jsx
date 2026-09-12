import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const DIA_MS = 24 * 60 * 60 * 1000;
const PRAZO_DIAS = 7;

const diasRestantes = (compraEm) => {
  const compra = new Date(compraEm).getTime();
  if (!Number.isFinite(compra)) return -1;
  return Math.ceil((compra + PRAZO_DIAS * DIA_MS - Date.now()) / DIA_MS);
};

const formatar = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

// Direito de arrependimento: 7 dias corridos da compra, sem justificativa.
// O que conta o prazo é o pedido — por isso a data/hora é gravada no servidor.
export default function DesistenciaCompraCard({ usuarioId, pagamentos = [] }) {
  const qc = useQueryClient();
  const [enviandoId, setEnviandoId] = useState(null);

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos-desistencia", usuarioId],
    queryFn: () => base44.entities.PedidoDesistencia.filter({ usuario_id: usuarioId }, "-solicitado_em", 50),
    enabled: !!usuarioId,
  });
  const pedidoPorPagamento = Object.fromEntries(pedidos.map((p) => [p.pagamento_id, p]));
  const elegiveis = pagamentos.filter((p) => diasRestantes(p.created_date) > 0);

  const solicitar = async (pagamentoId) => {
    setEnviandoId(pagamentoId);
    try {
      await base44.functions.invoke("solicitarDesistenciaCompra", { pagamento_id: pagamentoId });
      await qc.invalidateQueries({ queryKey: ["pedidos-desistencia", usuarioId] });
      toast.success("Pedido de desistência registrado. A devolução integral será processada.");
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Não foi possível registrar o pedido.");
    } finally {
      setEnviandoId(null);
    }
  };

  if (!elegiveis.length && !pedidos.length) return null;

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide">Desistência da compra</h2>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
        Você tem 7 dias corridos, contados da compra, para desistir e receber a devolução integral — sem precisar justificar.
      </p>

      {elegiveis.map((pagamento) => {
        const pedido = pedidoPorPagamento[pagamento.id];
        const dias = diasRestantes(pagamento.created_date);
        return (
          <div key={pagamento.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{pagamento.plano}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(pagamento.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · comprado em {formatar(pagamento.created_date)}
                </p>
              </div>
              <Badge variant="outline">{dias} {dias === 1 ? "dia restante" : "dias restantes"}</Badge>
            </div>
            {pedido ? (
              <p className="text-xs text-primary font-medium">
                Pedido registrado em {formatar(pedido.solicitado_em)} · situação: {pedido.status.replace("_", " ")}
              </p>
            ) : (
              <Button variant="outline" size="sm" className="w-full" disabled={enviandoId === pagamento.id} onClick={() => solicitar(pagamento.id)}>
                {enviandoId === pagamento.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Desistir da compra
              </Button>
            )}
          </div>
        );
      })}

      {pedidos.filter((p) => !elegiveis.some((e) => e.id === p.pagamento_id)).map((pedido) => (
        <div key={pedido.id} className="rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium text-foreground">{pedido.plano_nome || pedido.plano}</p>
          <p className="text-xs text-muted-foreground">
            Pedido em {formatar(pedido.solicitado_em)} · situação: {pedido.status.replace("_", " ")}
            {pedido.concluido_em ? ` · concluído em ${formatar(pedido.concluido_em)}` : ""}
          </p>
        </div>
      ))}
    </Card>
  );
}