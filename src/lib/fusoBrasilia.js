// REGRA DE FUSO DO BASE44 — NÃO USAR new Date(campo_da_entidade) DIRETAMENTE.
// Campos automáticos do Base44 chegam em UTC sem sufixo: 2026-09-14T13:11:34.034000.
// Campos gravados pelo nosso código chegam com Z: 2026-09-14T14:06:31.225Z.
// Exemplo real de 14/09/2026: a compra 13:11:34 UTC deve aparecer 10:11:34 em
// Brasília; o pedido 14:06:31Z deve aparecer 11:06:31. Ambos passam por
// dataHoraBase44 antes de qualquer formatação, comparação ou cálculo.
export const FUSO_BRASILIA = "America/Sao_Paulo";

const ISO_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const TEM_FUSO = /(Z|[+-]\d{2}:?\d{2})$/i;

export function dataHoraBase44(valor = new Date()) {
  if (valor instanceof Date) return valor;
  let texto = String(valor || "");
  if (ISO_DATA_HORA.test(texto) && !TEM_FUSO.test(texto)) {
    texto = texto.replace(/(\.\d{3})\d+$/, "$1") + "Z";
  }
  return new Date(texto);
}

export function formatarPrazoBrasilia(valor) {
  const data = dataHoraBase44(valor);
  if (Number.isNaN(data.getTime())) return null;
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA, dateStyle: "short", timeStyle: "short", hour12: false,
  }).format(data);
  return `até ${texto} (horário de Brasília)`;
}

export function partesDataBrasilia(valor = new Date()) {
  const data = dataHoraBase44(valor);
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
  const data = dataHoraBase44(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_BRASILIA }).format(data);
}

export function formatarDataHoraBrasilia(valor) {
  if (!valor) return null;
  const data = dataHoraBase44(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA, dateStyle: "short", timeStyle: "medium", hour12: false,
  }).format(data);
}

export function paraIsoBrasilia(valor) {
  const data = dataHoraBase44(valor);
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