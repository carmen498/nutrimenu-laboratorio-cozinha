export const FUSO_BRASILIA = "America/Sao_Paulo";

const ISO_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function partesDataBrasilia(valor = new Date()) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(data);
  return Object.fromEntries(partes.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
}

export function formatarDataBrasilia(valor) {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_BRASILIA }).format(data);
}

export function formatarDataHoraBrasilia(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA, dateStyle: "short", timeStyle: "medium", hour12: false,
  }).format(data);
}

export function paraIsoBrasilia(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset",
  });
  const p = Object.fromEntries(formatador.formatToParts(data).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${p.timeZoneName.replace("GMT", "")}`;
}

export function converterDatasObjetoBrasilia(valor) {
  if (typeof valor === "string") return ISO_DATA_HORA.test(valor) ? paraIsoBrasilia(valor) : valor;
  if (Array.isArray(valor)) return valor.map(converterDatasObjetoBrasilia);
  if (!valor || typeof valor !== "object") return valor;
  return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, converterDatasObjetoBrasilia(item)]));
}