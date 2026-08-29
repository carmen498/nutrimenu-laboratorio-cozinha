export const FUSO_BRASILIA = "America/Sao_Paulo";

const ISO_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function paraIsoBrasilia(valor: string | Date) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset",
  });
  const partes = Object.fromEntries(formatador.formatToParts(data)
    .filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}${partes.timeZoneName.replace("GMT", "")}`;
}

export function converterDatasBrasilia(valor: unknown): unknown {
  if (typeof valor === "string") return ISO_DATA_HORA.test(valor) ? paraIsoBrasilia(valor) : valor;
  if (Array.isArray(valor)) return valor.map(converterDatasBrasilia);
  if (!valor || typeof valor !== "object") return valor;
  return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, converterDatasBrasilia(item)]));
}