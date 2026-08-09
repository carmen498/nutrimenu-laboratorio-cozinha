// Monta o texto de compartilhamento do Dossiê do Ingrediente (Web Share API / WhatsApp).
// Usa apenas os dados já exibidos na Ficha do Ingrediente — não recalcula nada.

const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

export function montarTextoCompartilhamentoDossie({ ingrediente }) {
  const historico = ingrediente.historico_precos || [];

  let text = `🧂 ${ingrediente.nome}\n`;
  text += `DOSSIÊ DO INGREDIENTE\n\n`;
  text += `Categoria: ${ingrediente.categoria || "Sem categoria"}\n`;
  text += `Unidade de compra: ${ingrediente.unidade_compra || "—"}\n`;
  if (ingrediente.peso_embalagem_g != null) text += `Embalagem: ${ingrediente.peso_embalagem_g} g\n`;
  if (ingrediente.preco_embalagem_rs != null) text += `Preço da embalagem: ${formatCurrency(ingrediente.preco_embalagem_rs)}\n`;
  text += `Preço por g/ml: R$ ${(ingrediente.preco_por_g_rs || 0).toFixed(4).replace(".", ",")}\n`;
  text += `Fator de Correção: ${ingrediente.fator_correcao != null ? String(ingrediente.fator_correcao).replace(".", ",") : "1,0"}\n`;

  if (historico.length > 0) {
    text += `\nHISTÓRICO DE PREÇOS:\n`;
    historico
      .slice()
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .forEach((h) => {
        const variacao = h.variacao_percentual > 0 ? `+${h.variacao_percentual}%` : `${h.variacao_percentual ?? 0}%`;
        text += `• ${new Date(h.data).toLocaleDateString("pt-BR")} — ${formatCurrency(h.preco_por_kg)}/kg (${variacao}) · ${h.fonte || "—"}\n`;
      });
  }

  if (ingrediente.preco_atualizado_em) {
    text += `\nÚltima atualização de preço: ${new Date(ingrediente.preco_atualizado_em).toLocaleDateString("pt-BR")}\n`;
  }

  return text;
}