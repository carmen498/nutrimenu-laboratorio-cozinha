// Leitura/escrita do preço final do Orçamento (Cardápio e Evento).
// O valor é exibido em pt-BR ("1.500,00"), então o separador de milhar precisa
// ser descartado antes da conversão — trocar apenas a vírgula por ponto gera
// NaN em qualquer valor >= 1.000 e fazia o preço salvo voltar como zero.
export function parsePrecoBR(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.max(0, valor) : 0;
  let texto = String(valor ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!texto) return 0;
  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if ((texto.match(/\./g) || []).length > 1) {
    // "1.234.567" — só milhares, sem decimais
    texto = texto.replace(/\./g, "");
  }
  const num = Number(texto);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export function formatPrecoBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}