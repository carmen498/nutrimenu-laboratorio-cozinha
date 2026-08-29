import { revogarAcessoEstorno } from "./revogarAcessoEstorno.ts";

export async function revogarCompraEstorno(base44: any, pagamento: any) {
  const tipo = pagamento?.produto_compra || "laboratorio_cozinha";
  const resultados: Record<string, any> = {};

  if (["laboratorio_cozinha", "cozinha_mais_custos"].includes(tipo)) {
    resultados.cozinha = await revogarAcessoEstorno(base44, pagamento);
  }

  if (["laboratorio_custos", "cozinha_mais_custos"].includes(tipo) || ["custos_mensal", "custos_anual"].includes(pagamento?.plano)) {
    const acessos = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({
      user_id: pagamento.usuario_id,
      modulo: "laboratorio_custos",
    });
    const alvo = (acessos || []).find((a: any) => a.referencia_pagamento_id === pagamento.id);
    if (!alvo) {
      resultados.custos = { revogado: false, motivo: "entitlement_pagamento_nao_encontrado" };
    } else if (alvo.status === "cancelado") {
      resultados.custos = { revogado: false, motivo: "entitlement_ja_cancelado" };
    } else {
      await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.update(alvo.id, {
        status: "cancelado",
        cancelado_em: new Date().toISOString(),
        observacao: `${alvo.observacao || ""} Estornado pelo pagamento ${pagamento.id}.`.trim(),
      });
      resultados.custos = { revogado: true, motivo: "pagamento_custos_estornado" };
    }
  }

  return resultados;
}
