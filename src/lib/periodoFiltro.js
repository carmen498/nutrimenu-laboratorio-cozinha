// Helpers para o filtro de período (aba Usuários da Administração).

export const PERIODOS = [
  { value: "ultimos_7", label: "Últimos 7 dias" },
  { value: "ultimos_30", label: "Últimos 30 dias" },
  { value: "ultimos_90", label: "Últimos 90 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Personalizado" },
];

export const PERIODO_PADRAO = "ultimos_30";

function inicioDoDia(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finalDoDia(data) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Retorna { inicio: Date, fim: Date } para o período selecionado, ou null
// quando "personalizado" ainda não tem as duas datas preenchidas.
export function calcularIntervaloPeriodo(periodo, dataInicioCustom, dataFimCustom) {
  const hoje = new Date();
  switch (periodo) {
    case "ultimos_7": {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
    case "ultimos_90": {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 89);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
    case "mes_atual": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
    case "mes_anterior": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(fim) };
    }
    case "personalizado": {
      if (!dataInicioCustom || !dataFimCustom) return null;
      return { inicio: inicioDoDia(dataInicioCustom), fim: finalDoDia(dataFimCustom) };
    }
    case "ultimos_30":
    default: {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 29);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
  }
}

export function filtrarPagamentosPorPeriodo(pagamentos, intervalo) {
  if (!intervalo) return pagamentos;
  return pagamentos.filter((p) => {
    if (!p.created_date) return false;
    const data = new Date(p.created_date);
    return data >= intervalo.inicio && data <= intervalo.fim;
  });
}