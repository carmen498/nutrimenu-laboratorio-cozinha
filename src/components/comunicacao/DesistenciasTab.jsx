import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const formatar = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const STATUS_LABEL = {
  aberto: "Aberto",
  processando: "Processando",
  aguardando_confirmacao: "Aguardando confirmação",
  concluido: "Concluído",
  falha_reembolso: "Falha no estorno",
  reembolso_parcial: "Reembolso parcial",
};

// Painel de acompanhamento do direito de arrependimento e do estorno automático.
export default function DesistenciasTab() {
  const qc = useQueryClient();
  const [tentandoId, setTentandoId] = useState(null);
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos-desistencia-admin"],
    queryFn: () => base44.entities.PedidoDesistencia.list("-solicitado_em", 200),
  });

  const tentarNovamente = async (pedido) => {
    setTentandoId(pedido.id);
    try {
      const resposta = await base44.functions.invoke("tentarReembolsoNovamente", { pedido_id: pedido.id });
      await qc.invalidateQueries({ queryKey: ["pedidos-desistencia-admin"] });
      toast({
        title: resposta?.data?.status === "concluido" ? "Estorno confirmado" : "Nova tentativa registrada",
        description: resposta?.data?.resultado || "",
      });
    } catch (err) {
      toast({ title: "Não foi possível tentar novamente", description: err?.response?.data?.error || err.message || "", variant: "destructive" });
    } finally {
      setTentandoId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const requerAtencao = pedidos.filter((p) => p.status === "falha_reembolso" || p.status === "reembolso_parcial").length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Painel de acompanhamento dos pedidos de desistência. O sistema solicita o estorno automaticamente e só revoga o acesso depois da confirmação do Mercado Pago.
      </p>

      {requerAtencao > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p><span className="font-medium">{requerAtencao}</span> {requerAtencao === 1 ? "pedido exige" : "pedidos exigem"} acompanhamento.</p>
        </div>
      )}

      {!pedidos.length && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido de desistência registrado.</p>}

      {pedidos.map((pedido) => (
        <div key={pedido.id} className={`rounded-lg border p-4 space-y-3 ${pedido.status === "falha_reembolso" ? "border-destructive/50 bg-destructive/5" : pedido.status === "reembolso_parcial" ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{pedido.usuario_nome || pedido.usuario_id}</p>
              <p className="text-sm text-muted-foreground">{pedido.plano_nome || pedido.plano} · R$ {Number(pedido.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <Badge
              variant={pedido.status === "falha_reembolso" ? "destructive" : pedido.status === "concluido" ? "outline" : "secondary"}
              className={pedido.status === "reembolso_parcial" ? "bg-amber-100 text-amber-800 border-amber-300" : ""}
            >
              {STATUS_LABEL[pedido.status] || pedido.status}
            </Badge>
          </div>

          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>Hora do clique: <span className="font-medium text-foreground">{formatar(pedido.solicitado_em)}</span></p>
            <p>Tentativas: <span className="font-medium text-foreground">{Number(pedido.tentativas_reembolso || 0)}</span></p>
            <p className="sm:col-span-2">Último resultado do Mercado Pago: <span className="font-medium text-foreground">{pedido.codigo_resultado_reembolso || "—"}</span></p>
            {pedido.detalhe_reembolso && <p className="sm:col-span-2">Detalhe: {pedido.detalhe_reembolso}</p>}
            <p>Última tentativa: {formatar(pedido.ultima_tentativa_em)}</p>
            <p>Próxima tentativa: {formatar(pedido.proxima_tentativa_em)}</p>
            {pedido.concluido_em && <p>Concluído em: {formatar(pedido.concluido_em)}</p>}
            <p>Aviso ao suporte: {pedido.suporte_aviso_status || "—"}</p>
          </div>

          {pedido.status === "falha_reembolso" && (
            <Button size="sm" onClick={() => tentarNovamente(pedido)} disabled={tentandoId === pedido.id}>
              {tentandoId === pedido.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Tentar reembolso novamente
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}