import { ativarPlanoEEnviarEmail } from "./ativarAssinaturaPagamento.ts";
import { avaliarAcessoAssinaturaServer } from "./acessoAssinatura.ts";
import { sendEmailViaResend } from "./resendEmail.ts";
import { renderTemplateEmail } from "./templateEmail.ts";
import { registrarLogEmail } from "./governancaLogs.ts";

const MODULO = "laboratorio_custos";

function planoCustosDoPagamento(pagamento: any): string | null {
  if (pagamento?.addon_plano_id) return pagamento.addon_plano_id;
  if (["custos_mensal", "custos_anual"].includes(pagamento?.plano)) return pagamento.plano;
  return null;
}

function diasCustos(planoId: string): number {
  return planoId === "custos_anual" ? 365 : 30;
}

function modalidadeCustos(planoId: string): "30_dias" | "anual" {
  return planoId === "custos_anual" ? "anual" : "30_dias";
}

async function ativarCustos(base44: any, pagamento: any): Promise<void> {
  if (!pagamento?.id || !pagamento?.usuario_id) return;
  const planoId = planoCustosDoPagamento(pagamento);
  if (!planoId) return;

  const existentes = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({
    user_id: pagamento.usuario_id,
    modulo: MODULO,
  });
  if ((existentes || []).some((a: any) => a.referencia_pagamento_id === pagamento.id)) return;

  const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  if (!usuario) throw new Error("Usuário não encontrado ao ativar Laboratório de Custos");
  const acessoBase = avaliarAcessoAssinaturaServer(usuario);
  if (!acessoBase.temAcesso) throw new Error("Laboratório de Cozinha precisa estar ativo para ativar o Laboratório de Custos");

  const inicio = new Date();
  const fim = new Date(inicio.getTime() + diasCustos(planoId) * 24 * 60 * 60 * 1000);
  const oferta = (await base44.asServiceRole.entities.ConfiguracaoPlano.filter({ plano_id: planoId, produto: "laboratorio_custos" }))?.[0] || null;

  // Um pagamento aprovado substitui qualquer acesso anterior ainda ativo (ex.: trial),
  // preservando-o no histórico sem manter dois entitlements simultaneamente ativos.
  for (const anterior of existentes || []) {
    if (anterior.status !== "ativo" || anterior.referencia_pagamento_id === pagamento.id) continue;
    await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.update(anterior.id, {
      status: "cancelado",
      cancelado_em: inicio.toISOString(),
      observacao: `${anterior.observacao || ""} Substituído por plano pago aprovado (${pagamento.id}).`.trim(),
    });
  }

  await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.create({
    user_id: pagamento.usuario_id,
    modulo: MODULO,
    status: "ativo",
    modalidade: modalidadeCustos(planoId),
    plano_id: planoId,
    origem: "checkout",
    inicio_em: inicio.toISOString(),
    fim_em: fim.toISOString(),
    referencia_pagamento_id: pagamento.id,
    oferta_versao: oferta?.versao_oferta || "",
    observacao: "Acesso concedido por pagamento aprovado.",
  });

  if (usuario.email) {
    const nome = usuario.nome_completo || usuario.full_name || "";
    const dataExpiracao = fim.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const nomePlano = planoId === "custos_anual" ? "Anual" : "30 dias";
    const { assunto, html, ativo } = await renderTemplateEmail(
      base44,
      "custos_pagamento_aprovado",
      nome,
      "Laboratório de Custos ativado",
      `<p>Olá {{nome}}, seu pagamento foi aprovado.</p><p>Seu plano {{plano}} do Laboratório de Custos está ativo até {{data_expiracao}}.</p>`,
      { plano: nomePlano, data_expiracao: dataExpiracao },
    );
    if (ativo) {
      const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
      await registrarLogEmail(base44, { usuarioId: usuario.id, email: usuario.email, tipo: "custos_pagamento_aprovado", resultado });
    }
  }
}

export async function ativarCompraPagamento(base44: any, pagamento: any): Promise<void> {
  const tipo = pagamento?.produto_compra || "laboratorio_cozinha";
  if (["laboratorio_cozinha", "cozinha_mais_custos"].includes(tipo)) {
    await ativarPlanoEEnviarEmail(base44, pagamento);
  }
  if (["laboratorio_custos", "cozinha_mais_custos"].includes(tipo) || ["custos_mensal", "custos_anual"].includes(pagamento?.plano)) {
    await ativarCustos(base44, pagamento);
  }
}
