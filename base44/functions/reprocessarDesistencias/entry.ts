// Reprocessa estornos automáticos pendentes. O modo manual aceita um pedido
// específico somente para administrador; o modo agendado não aceita alvos externos.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { processarReembolsoDesistencia } from "../../shared/processarDesistencia.ts";
import { protegerExecucaoAgendada } from "../../shared/protecoesAutomacao.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    let pedidos: any[] = [];

    if (body?.pedido_id) {
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      const pedido = await base44.asServiceRole.entities.PedidoDesistencia.get(body.pedido_id).catch(() => null);
      if (!pedido) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
      if (pedido.status !== "falha_reembolso") {
        return Response.json({ error: "A tentativa manual só está disponível em falha_reembolso" }, { status: 409 });
      }
      pedidos = [pedido];
    } else {
      const gate = await protegerExecucaoAgendada(base44, req, {
        chave: "reprocessarDesistencias",
        cooldownHoras: 0.2,
      });
      if (gate.response) return gate.response;

      const [aguardando, falhas] = await Promise.all([
        base44.asServiceRole.entities.PedidoDesistencia.filter({ status: "aguardando_confirmacao" }),
        base44.asServiceRole.entities.PedidoDesistencia.filter({ status: "falha_reembolso" }),
      ]);
      const agora = Date.now();
      pedidos = [...(aguardando || []), ...(falhas || [])]
        .filter((p: any) => !p.proxima_tentativa_em || Date.parse(p.proxima_tentativa_em) <= agora)
        .slice(0, 50);
    }

    const resultados = [];
    for (const pedido of pedidos) {
      const pagamento = await base44.asServiceRole.entities.Pagamento.get(pedido.pagamento_id).catch(() => null);
      if (!pagamento) {
        resultados.push({ pedido_id: pedido.id, status: "falha_reembolso", resultado: "pagamento_nao_encontrado" });
        continue;
      }
      const resultado = await processarReembolsoDesistencia(base44, pedido, pagamento, {
        consultarAntes: true,
        origem: user ? "reprocessamento_manual" : "reprocessamento_automatico",
      });
      resultados.push({ pedido_id: pedido.id, ...resultado });
    }

    if (body?.pedido_id) return Response.json(resultados[0] || { status: "sem_resultado" });
    return Response.json({ processados: resultados.length, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
