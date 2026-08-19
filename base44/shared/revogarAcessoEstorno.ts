// Módulo compartilhado: revoga o acesso ao plano do usuário quando um pagamento
// que havia sido aprovado é estornado (reembolsado). Usado tanto pelo webhook
// automático (webhookMercadoPago) quanto pelo reprocessamento manual
// (reprocessarPagamentoEstorno), para nunca duplicar essa lógica entre os dois fluxos.
//
// Só o estorno reverte um acesso já concedido — "rejected" e "cancelled" são
// tentativas de pagamento que nunca chegaram a ativar um plano, então não há
// nada a revogar nesses casos.

export async function revogarAcessoEstorno(base44: any, usuarioId: string): Promise<void> {
  await base44.asServiceRole.entities.User.update(usuarioId, { status_assinatura: "vencido" });
}