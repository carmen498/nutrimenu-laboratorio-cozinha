import { getCategorias } from "@/lib/categoriasHelper";

// Mapeamento categoria da receita → seção padrão do cardápio do evento.
// Usado para atribuir automaticamente a seção de um prato adicionado direto
// pelo seletor de receitas (sem menu prévio de seção).
const CATEGORIA_PARA_SECAO = {
  "Entradas": "Entrada",
  "Sopas e Caldos": "Entrada",
  "Salgadinhos": "Entrada",
  "Saladas": "Entrada",
  "Lanches": "Entrada",
  "Carnes Bovinas e Suínos": "Prato Principal",
  "Aves": "Prato Principal",
  "Peixes e Frutos do Mar": "Prato Principal",
  "Ovos": "Prato Principal",
  "Acompanhamentos": "Guarnição",
  "Leguminosas": "Guarnição",
  "Molhos": "Guarnição",
  "Receitas Base": "Guarnição",
  "Arroz e Risotos": "Arroz/Massas",
  "Massas, Pastelão e Quiches": "Arroz/Massas",
  "Pães e Bolos": "Sobremesa",
  "Sobremesas": "Sobremesa",
};

/** Sugere a seção do cardápio (evento) para uma receita, com base em sua categoria. */
export function secaoSugeridaReceita(receita) {
  const cats = getCategorias(receita);
  for (const c of cats) {
    if (CATEGORIA_PARA_SECAO[c]) return CATEGORIA_PARA_SECAO[c];
  }
  return "Prato Principal";
}