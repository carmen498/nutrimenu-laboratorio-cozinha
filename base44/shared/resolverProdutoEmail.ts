// Resolver as variáveis {{produto}} e {{link_produto}} para e-mails transacionais.
//
// - produto_compra (do Pagamento): mapeamento direto pelo escopo comercial da compra.
// - origem_cadastro (do User): usado em e-mails de ciclo de vida (plano_vencendo,
//   trial etc.) quando não há um pagamento que origine a mensagem.
// - Fallback: "Nutrimenu" + URL do Laboratório de Cozinha.

const PRODUTO_NOME: Record<string, string> = {
  laboratorio_cozinha: "Laboratório de Cozinha",
  cozinha_mais_custos: "Laboratório de Cozinha",
  guia_zr: "Guia Técnico ZR",
  laboratorio_custos: "Laboratório de Custos",
};

const PRODUTO_LINK: Record<string, string> = {
  laboratorio_cozinha: "https://app.laboratoriodecozinha.com.br",
  cozinha_mais_custos: "https://app.laboratoriodecozinha.com.br",
  guia_zr: "https://zr.nutrimenu.com.br/entrar?destino=%2Fminha-conta",
  // TODO: URL do Laboratório de Custos pendente de confirmação — usando URL do
  // Laboratório de Cozinha como placeholder temporário.
  laboratorio_custos: "https://app.laboratoriodecozinha.com.br",
};

const FALLBACK = {
  produto: "Nutrimenu",
  link_produto: "https://app.laboratoriodecozinha.com.br",
};

// Resolve a partir do produto_compra do Pagamento.
export function resolverProdutoPorCompra(produtoCompra?: string): { produto: string; link_produto: string } {
  if (!produtoCompra) return { ...FALLBACK };
  return {
    produto: PRODUTO_NOME[produtoCompra] ?? FALLBACK.produto,
    link_produto: PRODUTO_LINK[produtoCompra] ?? FALLBACK.link_produto,
  };
}

// Resolve a partir do origem_cadastro do User (e-mails de ciclo de vida).
export function resolverProdutoPorOrigem(origemCadastro?: string): { produto: string; link_produto: string } {
  if (origemCadastro === "guia_zr") {
    return { produto: PRODUTO_NOME.guia_zr, link_produto: PRODUTO_LINK.guia_zr };
  }
  // laboratorio_cozinha, nao_informado e qualquer outro caso → Laboratório de Cozinha.
  return { produto: PRODUTO_NOME.laboratorio_cozinha, link_produto: PRODUTO_LINK.laboratorio_cozinha };
}