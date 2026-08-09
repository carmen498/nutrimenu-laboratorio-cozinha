// Definição fixa dos 5 relatórios do planejamento (Cardápio aberto e Evento).
// Ordem e nomes são a fonte única de verdade — usados tanto no Cardápio quanto no Evento.
import { ClipboardList, Receipt, ChefHat, DollarSign, Printer, FileText } from "lucide-react";

// Relatório-mestre do Evento — separado de REPORT_DEFS pois usa dados exclusivos
// do Planejamento (Etapas 1-4: clientes/per capitas), sem equivalente em Cardápio.
export const DOSSIE_REPORT_DEF = {
  id: "dossie_evento",
  titulo: "Dossiê do Evento (relatório-mestre)",
  descricao: "Página executiva única do evento, com anexos opcionais. Uso interno.",
  icone: FileText,
  cor: "bg-primary/5 text-primary border-primary/30",
};

export const REPORT_DEFS = [
  {
    id: "ficha_cardapio",
    titulo: "Ficha do Cardápio (produção)",
    descricao: "Porções, quantidades em kg e receitas, para uso da cozinha.",
    icone: ClipboardList,
    cor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "orcamento",
    titulo: "Orçamento (documento do cliente)",
    descricao: "Documento para envio ao cliente — sem custos, markup, kg ou %.",
    icone: Receipt,
    cor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "pre_preparos",
    titulo: "Pré-preparos (mise en place)",
    descricao: "Sub-receitas e ingredientes com pré-preparo, consolidados.",
    icone: ChefHat,
    cor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "ficha_custos",
    titulo: "Ficha de Custos (uso interno)",
    descricao: "Custo por receita e percentual do total, para uso interno.",
    icone: DollarSign,
    cor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "receitas_cardapio",
    titulo: "Receitas do Cardápio (imprimir)",
    descricao: "Lista simples das receitas, na ordem do cardápio, para impressão.",
    icone: Printer,
    cor: "bg-slate-50 text-slate-700 border-slate-200",
  },
];