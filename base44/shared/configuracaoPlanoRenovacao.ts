export const CONFIGURACAO_RENOVACAO_CANONICA = {
  plano_id: "renovacao",
  nome: "Renovação anual",
  subtitulo: "Para clientes a partir do 2º ano",
  preco_exibido: 99,
  periodo_exibido: "ano",
  preco_detalhe: "ou 6x de R$ 16,50",
  valor_cobranca: 99,
  beneficios: ["12 meses de acesso", "Todas as funcionalidades do plano anual"],
  mais_popular: false,
  ordem: 4,
} as const;

export function configuracaoRenovacaoValida(config: any): boolean {
  return Boolean(
    config &&
    config.plano_id === "renovacao" &&
    Number(config.valor_cobranca) > 0 &&
    Number(config.preco_exibido) >= 0 &&
    String(config.nome || "").trim(),
  );
}
