// Espelho das ofertas do Guia Técnico ZR para a tela de Planos.
// A fonte de verdade de preço e de venda habilitada é ConfiguracaoPlano no servidor.

export const FAIXAS_ZR = [
  { faixa: "tin", planoId: "zr_tin", renovacaoId: "zr_tin_renovacao", nome: "ZR Tabela de Informação Nutricional" },
  { faixa: "full", planoId: "zr_full", renovacaoId: "zr_full_renovacao", nome: "ZR Profissional" },
  { faixa: "arquitetura-do-rotulo", planoId: "zr_arquitetura", renovacaoId: "zr_arquitetura_renovacao", nome: "ZR Arquitetura do Rótulo" },
];

export const AVISO_DESISTENCIA_7_DIAS =
  "Você tem 7 dias corridos, contados da compra, para desistir e receber a devolução integral — sem precisar justificar, inclusive em promoção, no parcelamento e mesmo que já tenha lido o conteúdo. O pedido fica em Minha Conta.";

// "R$ 147 até 31/10/2026; depois R$ 197" — nunca preço riscado: o ZR não tem preço praticado antes.
export function textoPrecoPromocional(plano) {
  const preco = Number(plano?.preco_exibido || 0);
  const depois = Number(plano?.preco_apos_promocao || 0);
  const ate = plano?.promocao_valida_ate;
  if (!(preco > 0) || !(depois > preco) || !ate) return plano?.preco_detalhe || "";
  const data = new Date(`${ate}T00:00:00`);
  if (Number.isNaN(data.getTime())) return plano?.preco_detalhe || "";
  const fmt = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  return `${fmt(preco)} até ${data.toLocaleDateString("pt-BR")}; depois ${fmt(depois)}`;
}