// Módulo compartilhado: resolve a identidade visual (cabeçalho, assinatura,
// remetente) de um e-mail transacional com base no produto_compra do Pagamento.
// Laboratório de Cozinha retorna null — continua lendo ConfiguracaoEmail (configurável pelo admin).
// ZR, Custos e fallback usam identidade própria hardcoded, distinta da marca principal.

export interface IdentidadeEmail {
  nome: string;
  tagline: string;
  cor: string;
  assinatura: string;
  fromName: string;
}

const IDENTIDADES: Record<string, IdentidadeEmail> = {
  guia_zr: {
    nome: "Guia Técnico ZR",
    tagline: "Do Zero à Rotulagem",
    cor: "#1F1B16",
    assinatura: "Carmen S. Reinstein<br>Guia Técnico ZR · Nutrimenu",
    fromName: "Guia Técnico ZR",
  },
  laboratorio_custos: {
    nome: "Laboratório de Custos",
    tagline: "A gestão financeira da sua cozinha",
    cor: "#5c7a5f",
    assinatura: "Carmen S. Reinstein<br>Laboratório de Custos · Nutrimenu",
    fromName: "Laboratório de Custos",
  },
};

const IDENTIDADE_PADRAO: IdentidadeEmail = {
  nome: "Nutrimenu",
  tagline: "",
  cor: "#5c7a5f",
  assinatura: "Carmen S. Reinstein<br>Nutrimenu",
  fromName: "Nutrimenu",
};

// Retorna null para laboratorio_cozinha / cozinha_mais_custos — sinaliza que
// o caller deve usar ConfiguracaoEmail (comportamento atual, configurável pelo admin).
export function resolverIdentidadeProduto(produtoCompra?: string): IdentidadeEmail | null {
  if (!produtoCompra) return IDENTIDADE_PADRAO;
  if (["laboratorio_cozinha", "cozinha_mais_custos"].includes(produtoCompra)) return null;
  return IDENTIDADES[produtoCompra] || IDENTIDADE_PADRAO;
}