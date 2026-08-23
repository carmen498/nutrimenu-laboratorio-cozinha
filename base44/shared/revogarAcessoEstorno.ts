// Revoga o acesso quando o pagamento que CONCEDEU a assinatura vigente foi
// estornado. Um estorno antigo nunca pode derrubar uma assinatura mais nova.
//
// Regra de segurança:
// - se User.pagamento_ativo_id aponta para outro pagamento, não revoga;
// - se não há pagamento_ativo_id (legado), não revoga automaticamente. Esse caso
//   deve ser conciliado pelo admin, evitando falso positivo sobre acesso atual.

export async function revogarAcessoEstorno(
  base44: any,
  pagamento: { id?: string; usuario_id: string },
): Promise<{ revogado: boolean; motivo: string }> {
  const usuario = await base44.asServiceRole.entities.User.get(pagamento.usuario_id).catch(() => null);
  if (!usuario) return { revogado: false, motivo: "usuario_nao_encontrado" };

  if (!pagamento.id) return { revogado: false, motivo: "pagamento_sem_id" };

  if (!usuario.pagamento_ativo_id) {
    return { revogado: false, motivo: "pagamento_ativo_ausente_legado" };
  }

  if (usuario.pagamento_ativo_id !== pagamento.id) {
    return { revogado: false, motivo: "estorno_de_pagamento_antigo" };
  }

  await base44.asServiceRole.entities.User.update(pagamento.usuario_id, {
    status_assinatura: "vencido",
  });
  return { revogado: true, motivo: "pagamento_ativo_estornado" };
}
