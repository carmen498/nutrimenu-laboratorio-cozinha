// Lista canônica dos eventos reativos de WhatsApp — alinhada ao enum "tipo" da
// entidade TemplateWascript (a que de fato controla os envios, via notificarWascript.ts).
// Os textos padrão são os mesmos usados como fallback quando não há template salvo.
export const EVENTOS_WASCRIPT = [
  { tipo: "pagamento_aprovado", evento: "Pagamento aprovado" },
  { tipo: "pagamento_recusado", evento: "Pagamento recusado" },
  { tipo: "plano_vencendo", evento: "Plano vencendo" },
  { tipo: "pagamento_pendente_lembrete", evento: "Lembrete de pagamento pendente" },
  { tipo: "pagamento_estornado", evento: "Pagamento estornado" },
  { tipo: "reativacao_alto_uso", evento: "Reativação · trial vencido com alto uso" },
];

export const TEXTOS_PADRAO_WASCRIPT = {
  pagamento_aprovado: "Olá {{nome}}! 🎉 Seu pagamento foi aprovado e seu plano no Laboratório de Cozinha já está ativo.",
  pagamento_recusado: "Olá {{nome}}, não conseguimos aprovar o pagamento da sua assinatura. Verifique os dados do cartão ou tente outra forma de pagamento para continuar com acesso ao Laboratório de Cozinha.",
  plano_vencendo: "Olá {{nome}}, seu plano no Laboratório de Cozinha vence em breve. Renove agora para não perder o acesso às suas receitas e cardápios.",
  pagamento_pendente_lembrete: "Olá {{nome}}, notamos que seu pagamento no Laboratório de Cozinha ainda não foi confirmado. Podemos ajudar em algo? Se preferir, você pode gerar um novo pagamento na aba Planos do app.",
  pagamento_estornado: "Olá {{nome}}, confirmamos o estorno do seu pagamento no Laboratório de Cozinha. O valor será devolvido pelo Mercado Pago conforme o prazo do seu banco. Qualquer dúvida, estamos à disposição.",
  reativacao_alto_uso: "Olá {{nome}}, aqui é a Carmen, do Laboratório de Cozinha. Vi que você criou várias receitas durante o teste — elas continuam salvas na sua conta. Se quiser retomar de onde parou ou tirar alguma dúvida, é só me responder por aqui.",
};