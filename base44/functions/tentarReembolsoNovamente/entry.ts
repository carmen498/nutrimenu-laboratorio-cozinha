// Única ação manual do painel: tenta novamente um pedido em falha_reembolso.
// Reconsulta a order antes de repetir e exige administrador autenticado.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { processarReembolsoDesistencia } from "../../shared/processarDesistencia.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { pedido_id } = await req.json().catch(() => ({}));
    if (!pedido_id) return Response.json({ error: "pedido_id é obrigatório" }, { status: 400 });

    const pedido = await base44.asServiceRole.entities.PedidoDesistencia.get(pedido_id).catch(() => null);
    if (!pedido) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    if (pedido.status !== "falha_reembolso") {
      return Response.json({ error: "A tentativa manual só está disponível em falha_reembolso" }, { status: 409 });
    }

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pedido.pagamento_id).catch(() => null);
    if (!pagamento) return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });

    const resultado = await processarReembolsoDesistencia(base44, pedido, pagamento, {
      consultarAntes: true,
      origem: "reprocessamento_manual",
    });
    return Response.json(resultado);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
