// Ofertas do Guia Técnico ZR e concessão/revogação das faixas de acesso.
// Regras: 12 meses por compra; as faixas ACUMULAM; recompra da mesma faixa
// estende o vencimento a partir da data maior; "acesso-livre" não é vendável.
// Ofertas de upgrade (zr_full_upgrade_*) concedem a faixa "full" por um preço
// menor, exigindo que o usuário já tenha faixas inferiores ativas.

export const MESES_ACESSO_ZR = 12;

export const OFERTAS_ZR: Record<string, {
  faixa: string;
  nome: string;
  renovacao: boolean;
  upgrade?: boolean;
  requer_faixas?: string[];
}> = {
  zr_tin: { faixa: "tin", nome: "ZR Tabela de Informação Nutricional", renovacao: false },
  zr_tin_renovacao: { faixa: "tin", nome: "Renovação anual — ZR Tabela de Informação Nutricional", renovacao: true },
  zr_full: { faixa: "full", nome: "ZR Profissional", renovacao: false },
  zr_full_renovacao: { faixa: "full", nome: "Renovação anual — ZR Profissional", renovacao: true },
  zr_arquitetura: { faixa: "arquitetura-do-rotulo", nome: "ZR Arquitetura do Rótulo", renovacao: false },
  zr_arquitetura_renovacao: { faixa: "arquitetura-do-rotulo", nome: "Renovação anual — ZR Arquitetura do Rótulo", renovacao: true },
  zr_full_upgrade_tin: { faixa: "full", nome: "Upgrade para ZR Profissional (TIN)", renovacao: false, upgrade: true, requer_faixas: ["tin"] },
  zr_full_upgrade_arquitetura: { faixa: "full", nome: "Upgrade para ZR Profissional (Arquitetura)", renovacao: false, upgrade: true, requer_faixas: ["arquitetura-do-rotulo"] },
  zr_full_upgrade_tin_arquitetura: { faixa: "full", nome: "Upgrade para ZR Profissional (TIN + Arquitetura)", renovacao: false, upgrade: true, requer_faixas: ["tin", "arquitetura-do-rotulo"] },
};

export function ofertaZR(planoId: unknown) {
  return typeof planoId === "string" ? OFERTAS_ZR[planoId] || null : null;
}

// Definições canônicas para seeding em ConfiguracaoPlano.
// Os preços das ofertas de upgrade são os únicos valores controlados aqui;
// preços das ofertas regulares são sempre lidos do banco, nunca sobrescritos.
export const CONFIGURACOES_UPGRADE_ZR_CANONICAS = [
  {
    plano_id: "zr_full_upgrade_tin",
    produto: "guia_zr",
    nome: "Upgrade para ZR Profissional (TIN)",
    subtitulo: "Para quem já tem a Tabela de Informação Nutricional ativa",
    preco_exibido: 150,
    periodo_exibido: "unico",
    preco_detalhe: "12 meses de acesso",
    valor_cobranca: 150,
    beneficios: ["Acesso completo à faixa ZR Profissional", "Mantém sua faixa TIN ativa"],
    mais_popular: false,
    ordem: 40,
    venda_habilitada: true,
    versao_oferta: "upgrade-v1",
  },
  {
    plano_id: "zr_full_upgrade_arquitetura",
    produto: "guia_zr",
    nome: "Upgrade para ZR Profissional (Arquitetura)",
    subtitulo: "Para quem já tem a Arquitetura do Rótulo ativa",
    preco_exibido: 200,
    periodo_exibido: "unico",
    preco_detalhe: "12 meses de acesso",
    valor_cobranca: 200,
    beneficios: ["Acesso completo à faixa ZR Profissional", "Mantém sua faixa Arquitetura ativa"],
    mais_popular: false,
    ordem: 41,
    venda_habilitada: true,
    versao_oferta: "upgrade-v1",
  },
  {
    plano_id: "zr_full_upgrade_tin_arquitetura",
    produto: "guia_zr",
    nome: "Upgrade para ZR Profissional (TIN + Arquitetura)",
    subtitulo: "Para quem já tem TIN e Arquitetura do Rótulo ativas",
    preco_exibido: 53,
    periodo_exibido: "unico",
    preco_detalhe: "12 meses de acesso",
    valor_cobranca: 53,
    beneficios: ["Acesso completo à faixa ZR Profissional", "Mantém suas faixas TIN e Arquitetura ativas"],
    mais_popular: false,
    ordem: 42,
    venda_habilitada: true,
    versao_oferta: "upgrade-v1",
  },
] as const;

// Verifica se o usuário tem todas as faixas exigidas ativas.
// Acesso vitalício (vitalicio=true) é considerado ativo sem checar fim_em.
export async function validarFaixasUpgrade(
  base44: any,
  userId: string,
  requerFaixas: string[],
): Promise<{ ok: boolean; faltantes: string[] }> {
  if (!requerFaixas?.length) return { ok: true, faltantes: [] };
  const registros = await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.filter({ user_id: userId });
  const agora = Date.now();
  const ativas = new Set<string>();
  for (const r of registros || []) {
    if (r.status !== "ativo") continue;
    if (r.inicio_em && Date.parse(r.inicio_em) > agora) continue;
    if (r.vitalicio) { ativas.add(r.faixa); continue; }
    if (!r.fim_em) { ativas.add(r.faixa); continue; }
    const fim = Date.parse(r.fim_em);
    if (Number.isFinite(fim) && fim >= agora) ativas.add(r.faixa);
  }
  const faltantes = requerFaixas.filter((f) => !ativas.has(f));
  return { ok: faltantes.length === 0, faltantes };
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