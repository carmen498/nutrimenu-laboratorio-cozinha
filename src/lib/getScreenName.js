// Deriva o nome da tela atual (usado para filtrar o conteúdo de ajuda) a partir da rota.
export function getScreenName(pathname, search = "") {
  const p = pathname;
  if (p === "/") return "Início";
  if (p.startsWith("/receita/")) return "Receitas";
  if (p === "/receitas") return "Receitas";
  if (p.startsWith("/cardapio/")) return "Cardápio";
  if (p === "/cardapios") return "Cardápios";
  if (p === "/ingredientes" || p === "/meus-ingredientes") return "Ingredientes";
  if (p === "/lista-compras") return search.includes("planejamento") ? "Lista de Compras" : "Carrinho";
  if (p === "/percapita") return "Per Capita";
  if (p === "/medidas-caseiras") return "Medidas Caseiras";
  if (p === "/insumos-embalagens") return "Insumos e Embalagens";
  if (p === "/relatorio-categorias") return "Relatório de Categorias";
  if (p === "/auditoria-receitas") return "Auditoria de Receitas";
  if (p === "/auditorias") return "Auditorias";
  if (p === "/historico") return "Histórico";
  if (p.startsWith("/exportar/")) return "Exportar Receita";
  if (p === "/custos") return "Custos — Início";
  if (p === "/custos/calcular") return "Custos — Calcular Custo";
  if (p.startsWith("/custos/ficha/")) return "Custos — Ficha de Custo";
  if (p === "/custos/historico") return "Custos — Histórico";
  if (p === "/custos/despesas") return "Custos — Minhas Despesas";
  if (p === "/custos/configuracoes") return "Custos — Configurações";
  return "";
}