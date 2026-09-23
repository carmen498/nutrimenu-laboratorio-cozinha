// Resolver as vari\u00e1veis {{produto}} e {{link_produto}} para e-mails transacionais.
//
// - produto_compra (do Pagamento): mapeamento direto pelo escopo comercial da compra.
// - origem_cadastro (do User): usado em e-mails de ciclo de vida (plano_vencendo,
//   trial etc.) quando n\u00e3o h\u00e1 um pagamento que origine a mensagem.
//
// Sem FALLBACK: produto_compra vazio ou n\u00e3o mapeado retorna null.
// Inventar nome de produto \u00e9 pior do que n\u00e3o enviar.

const PRODUTO_NOME: Record<string, string> = {
  laboratorio_cozinha: "Laborat\u00f3rio de Cozinha",
  cozinha_mais_custos: "Laborat\u00f3rio de Cozinha",
  guia_zr: "Guia T\u00e9cnico ZR",
  laboratorio_custos: "Laborat\u00f3rio de Custos",
};

const PRODUTO_LINK: Record<string, string> = {
  laboratorio_cozinha: "https://app.laboratoriodecozinha.com.br",
  cozinha_mais_custos: "https://app.laboratoriodecozinha.com.br",
  guia_zr: "https://zr.nutrimenu.com.br/entrar?destino=%2Fminha-conta",
  laboratorio_custos: "https://app.laboratoriodecozinha.com.br/custos",
};

// Resolve a partir do produto_compra do Pagamento.
// Retorna null se produto_compra for vazio ou n\u00e3o mapeado.
export function resolverProdutoPorCompra(produtoCompra?: string): { produto: string; link_produto: string } | null {
  if (!produtoCompra) return null;
  const produto = PRODUTO_NOME[produtoCompra];
  const link = PRODUTO_LINK[produtoCompra];
  if (!produto || !link) return null;
  return { produto, link_produto: link };
}

// Resolve o nome do produto para o gatilho de Laborat\u00f3rio de Custos.
// Retorna null se a compra n\u00e3o incluir o Laborat\u00f3rio de Custos.
export function resolverProdutoCustos(produtoCompra?: string): string | null {
  if (produtoCompra === "laboratorio_custos" || produtoCompra === "cozinha_mais_custos") {
    return "Laborat\u00f3rio de Custos";
  }
  return null;
}

// Resolve a partir do origem_cadastro do User (e-mails de ciclo de vida).
// N\u00e3o usar para calar e-mail de trial \u2014 o trial \u00e9 sempre do mesmo produto.
export function resolverProdutoPorOrigem(origemCadastro?: string): { produto: string; link_produto: string } | null {
  if (origemCadastro === "guia_zr") {
    return { produto: PRODUTO_NOME.guia_zr, link_produto: PRODUTO_LINK.guia_zr };
  }
  return null;
}