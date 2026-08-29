// Helpers para o filtro de período (aba Usuários da Administração).
import { partesDataBrasilia } from "@/lib/fusoBrasilia";

export const PERIODOS = [
  { value: "ultimos_7", label: "Últimos 7 dias" },
  { value: "ultimos_30", label: "Últimos 30 dias" },
  { value: "ultimos_90", label: "Últimos 90 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Personalizado" },
];

export const PERIODO_PADRAO = "ultimos_30";

function dataCivilBrasilia(valor = new Date()) {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T12:00:00Z`);
  const p = partesDataBrasilia(valor);
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), 12));
}

function chaveCivil(data) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
}

function inicioDoDia(data) {
  return new Date(`${chaveCivil(dataCivilBrasilia(data))}T00:00:00-03:00`);
}

function finalDoDia(data) {
  return new Date(`${chaveCivil(dataCivilBrasilia(data))}T23:59:59.999-03:00`);
}

// Retorna { inicio: Date, fim: Date } para o período selecionado, ou null
// quando "personalizado" ainda não tem as duas datas preenchidas.
export function calcularIntervaloPeriodo(periodo, dataInicioCustom, dataFimCustom) {
  const hoje = dataCivilBrasilia();
  switch (periodo) {
    case "ultimos_7": {
      const inicio = new Date(hoje);
      inicio.setUTCDate(inicio.getUTCDate() - 6);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
    case "ultimos_90": {
      const inicio = new Date(hoje);
      inicio.setUTCDate(inicio.getUTCDate() - 89);
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
    case "mes_atual": {
      const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1, 12));
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(hoje) };
    }
    case "mes_anterior": {
      const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1, 12));
      const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 0, 12));
      return { inicio: inicioDoDia(inicio), fim: finalDoDia(fim) };
    }
    case "personalizado": {
      if (!dataInicioCustom || !dataFimCustom) return null;
      return { inicio: inicioDoDia(dataInicioCustom), fim: finalDoDia(dataFimCustom) };
    }
    case "ultimos_30":
    default: {
      const inicio = new Date(hoje);
      inicio.setUTCDate(inicio.getUTCDate() - 29);
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