// Consulta e reprocessa estornos automáticos pendentes a cada 15 minutos.
// Não aceita IDs ou qualquer alvo vindo da requisição.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { processarReembolsoDesistencia } from "../../shared/processarDesistencia.ts";
import { protegerExecucaoAgendada } from "../../shared/protecoesAutomacao.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await protegerExecucaoAgendada(base44, req, {
      chave: "reprocessarDesistencias",
      cooldownHoras: 0.2,
      janela: { inicioMinuto: 0, fimMinuto: 1439 },
    });
    if (gate.response) return gate.response;

    const [aguardando, falhas] = await Promise.all([
      base44.asServiceRole.entities.PedidoDesistencia.filter({ status: "aguardando_confirmacao" }),
      base44.asServiceRole.entities.PedidoDesistencia.filter({ status: "falha_reembolso" }),
    ]);
    const agora = Date.now();
    const pedidos = [...(aguardando || []), ...(falhas || [])]
      .filter((p: any) => !p.proxima_tentativa_em || Date.parse(p.proxima_tentativa_em) <= agora)
      .slice(0, 50);

    const resultados = [];
    for (const pedido of pedidos) {
      const pagamento = await base44.asServiceRole.entities.Pagamento.get(pedido.pagamento_id).catch(() => null);
      if (!pagamento) {
        resultados.push({ pedido_id: pedido.id, status: "falha_reembolso", resultado: "pagamento_nao_encontrado" });
        continue;
      }
      const resultado = await processarReembolsoDesistencia(base44, pedido, pagamento, {
        consultarAntes: true,
        origem: "reprocessamento_automatico",
      });
      resultados.push({ pedido_id: pedido.id, ...resultado });
    }
    return Response.json({ processados: resultados.length, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
