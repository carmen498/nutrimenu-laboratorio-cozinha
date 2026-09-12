// Ofertas do Guia Técnico ZR e concessão/revogação das faixas de acesso.
// Regras: 12 meses por compra; as faixas ACUMULAM; recompra da mesma faixa
// estende o vencimento a partir da data maior; "acesso-livre" não é vendável.

export const MESES_ACESSO_ZR = 12;

export const OFERTAS_ZR: Record<string, { faixa: string; nome: string; renovacao: boolean; maxParcelas: number }> = {
  zr_tin: { faixa: "tin", nome: "ZR Tabela de Informação Nutricional", renovacao: false, maxParcelas: 3 },
  zr_tin_renovacao: { faixa: "tin", nome: "Renovação anual — ZR Tabela de Informação Nutricional", renovacao: true, maxParcelas: 3 },
  zr_full: { faixa: "full", nome: "ZR Profissional", renovacao: false, maxParcelas: 6 },
  zr_full_renovacao: { faixa: "full", nome: "Renovação anual — ZR Profissional", renovacao: true, maxParcelas: 6 },
  zr_arquitetura: { faixa: "arquitetura-do-rotulo", nome: "ZR Arquitetura do Rótulo", renovacao: false, maxParcelas: 2 },
  zr_arquitetura_renovacao: { faixa: "arquitetura-do-rotulo", nome: "Renovação anual — ZR Arquitetura do Rótulo", renovacao: true, maxParcelas: 2 },
};

export function ofertaZR(planoId: unknown) {
  return typeof planoId === "string" ? OFERTAS_ZR[planoId] || null : null;
}

function somarMeses(base: Date, meses: number): Date {
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d;
}

// Concede a faixa comprada. NUNCA cancela faixa anterior: cria um registro novo,
// cujo vencimento parte da data maior entre agora e o vencimento vigente da MESMA
// faixa — assim renovar adiantado não encurta prazo, e um estorno posterior
// derruba só este registro, devolvendo o cliente ao prazo anterior.
export async function ativarGuiaZR(base44: any, pagamento: any): Promise<void> {
  const oferta = ofertaZR(pagamento?.plano);
  if (!oferta || !pagamento?.id || !pagamento?.usuario_id) return;

  const registros = await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.filter({
    user_id: pagamento.usuario_id,
    faixa: oferta.faixa,
  });
  if ((registros || []).some((r: any) => r.referencia_pagamento_id === pagamento.id)) return;

  const agora = new Date();
  let base = agora;
  for (const registro of registros || []) {
    if (registro.status !== "ativo" || registro.vitalicio || !registro.fim_em) continue;
    const fim = new Date(registro.fim_em);
    if (Number.isFinite(fim.getTime()) && fim.getTime() > base.getTime()) base = fim;
  }

  await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.create({
    user_id: pagamento.usuario_id,
    faixa: oferta.faixa,
    status: "ativo",
    vitalicio: false,
    modalidade: "anual",
    origem: "checkout",
    inicio_em: agora.toISOString(),
    fim_em: somarMeses(base, MESES_ACESSO_ZR).toISOString(),
    referencia_pagamento_id: pagamento.id,
    observacao: oferta.renovacao
      ? "Renovação de 12 meses por pagamento aprovado (mantém acesso e atualizações)."
      : "Acesso de 12 meses concedido por pagamento aprovado.",
  });
}

// Revoga SOMENTE a faixa concedida por este pagamento. As outras faixas do
// usuário — e as concessões anteriores da mesma faixa — permanecem intactas.
export async function revogarGuiaZR(base44: any, pagamento: any) {
  const oferta = ofertaZR(pagamento?.plano);
  if (!oferta) return { revogado: false, motivo: "pagamento_sem_faixa_zr" };

  const registros = await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.filter({
    user_id: pagamento.usuario_id,
    faixa: oferta.faixa,
  });
  const alvo = (registros || []).find((r: any) => r.referencia_pagamento_id === pagamento.id);
  if (!alvo) return { revogado: false, motivo: "entitlement_pagamento_nao_encontrado" };
  if (alvo.status === "cancelado") return { revogado: false, motivo: "entitlement_ja_cancelado" };

  await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.update(alvo.id, {
    status: "cancelado",
    cancelado_em: new Date().toISOString(),
    observacao: `${alvo.observacao || ""} Estornado pelo pagamento ${pagamento.id}.`.trim(),
  });
  return { revogado: true, motivo: "pagamento_zr_estornado", faixa: oferta.faixa };
}