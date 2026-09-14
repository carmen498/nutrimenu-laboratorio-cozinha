// Direito de arrependimento (7 dias corridos da compra, art. 49 do CDC).
// A data/hora que vale é a do PEDIDO, gravada aqui no servidor — nunca a do
// atendimento. Não exige justificativa e vale mesmo com o conteúdo já acessado.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { OFERTAS_ZR } from "../../shared/guiaTecnicoZR.ts";
import {
  avisarSuporteDesistencia,
  criarChaveIdempotenciaReembolso,
  processarReembolsoDesistencia,
} from "../../shared/processarDesistencia.ts";

const DIAS_ARREPENDIMENTO = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

const NOMES: Record<string, string> = {
  mensal: "Plano 30 dias — Laboratório de Cozinha",
  anual: "Plano Anual — Laboratório de Cozinha",
  renovacao: "Renovação Anual — Laboratório de Cozinha",
  custos_mensal: "Laboratório de Custos — 30 dias",
  custos_anual: "Laboratório de Custos — Anual",
  ...Object.fromEntries(Object.entries(OFERTAS_ZR).map(([id, o]) => [id, `${o.nome} — Guia Técnico ZR`])),
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { pagamento_id, motivo = "" } = await req.json().catch(() => ({}));
    if (!pagamento_id) return Response.json({ error: "Informe a compra" }, { status: 400 });

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamento_id).catch(() => null);
    if (!pagamento || pagamento.usuario_id !== user.id) {
      return Response.json({ error: "Compra não encontrada" }, { status: 404 });
    }
    if (pagamento.status !== "approved") {
      return Response.json({ error: "Só é possível desistir de uma compra aprovada", code: "pagamento_nao_aprovado" }, { status: 409 });
    }

    const jaExistentes = await base44.asServiceRole.entities.PedidoDesistencia.filter({ pagamento_id });
    if ((jaExistentes || []).length) {
      return Response.json({ pedidoId: jaExistentes[0].id, status: jaExistentes[0].status, duplicado: true });
    }

    const solicitadoEm = new Date();
    const compraEm = new Date(pagamento.created_date);
    const prazoFinal = new Date(compraEm.getTime() + DIAS_ARREPENDIMENTO * DIA_MS);
    const dentroDoPrazo = solicitadoEm.getTime() <= prazoFinal.getTime();
    if (!dentroDoPrazo) {
      return Response.json({
        error: "O prazo de 7 dias para desistir desta compra já passou.",
        code: "prazo_expirado",
        prazo_final: prazoFinal.toISOString(),
      }, { status: 409 });
    }

    const pedido = await base44.asServiceRole.entities.PedidoDesistencia.create({
      usuario_id: user.id,
      usuario_nome: user.nome_completo || user.full_name || user.email || "",
      pagamento_id,
      plano: pagamento.plano,
      plano_nome: NOMES[pagamento.plano] || pagamento.plano,
      valor: Number(pagamento.valor || 0),
      compra_em: compraEm.toISOString(),
      solicitado_em: solicitadoEm.toISOString(),
      dentro_do_prazo_legal: true,
      prazo_atendimento_em: new Date(solicitadoEm.getTime() + DIAS_ARREPENDIMENTO * DIA_MS).toISOString(),
      motivo: String(motivo || "").slice(0, 500),
      status: "processando",
      mercadopago_order_id: pagamento.mercadopago_order_id || "",
      tentativas_reembolso: 0,
      suporte_aviso_status: "pendente",
      cliente_email_status: "pendente",
    });

    const idempotencyKey = criarChaveIdempotenciaReembolso(pedido.id);
    await base44.asServiceRole.entities.PedidoDesistencia.update(pedido.id, {
      idempotency_key_reembolso: idempotencyKey,
    });
    await base44.asServiceRole.entities.Pagamento.update(pagamento_id, {
      desistencia_solicitada_em: solicitadoEm.toISOString(),
    });

    const pedidoProcessavel = { ...pedido, idempotency_key_reembolso: idempotencyKey };
    const avisoSuporte = await avisarSuporteDesistencia(base44, pedidoProcessavel, pagamento, user);
    const resultado = await processarReembolsoDesistencia(base44, pedidoProcessavel, pagamento, {
      consultarAntes: false,
      origem: "clique_desistencia",
    });

    return Response.json({
      pedidoId: pedido.id,
      status: resultado.status,
      solicitado_em: solicitadoEm.toISOString(),
      aviso_suporte: avisoSuporte.ok ? "enviado" : "falhou",
      reembolso: resultado.resultado,
      proxima_tentativa_em: resultado.proxima_tentativa_em || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}