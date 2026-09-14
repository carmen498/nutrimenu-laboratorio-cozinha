// Fonte única server-side do prazo do direito de arrependimento.
// O prazo é decidido no momento em que o Pagamento nasce e persistido com Z.
// Telas e demais functions apenas consomem Pagamento.prazo_desistencia_em.
export const DIAS_ARREPENDIMENTO = 7;
const DIA_MS = 24 * 60 * 60 * 1000;
const ISO_SEM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const TEM_FUSO = /(Z|[+-]\d{2}:?\d{2})$/i;

export function dataHoraUtcBase44(valor: unknown): Date {
  let texto = String(valor || "");
  if (ISO_SEM_FUSO.test(texto) && !TEM_FUSO.test(texto)) {
    texto = texto.replace(/(\.\d{3})\d+$/, "$1") + "Z";
  }
  return new Date(texto);
}

export function calcularPrazoDesistencia(compraEm: Date = new Date()): string {
  return new Date(compraEm.getTime() + DIAS_ARREPENDIMENTO * DIA_MS).toISOString();
}

export function formatarPrazoDesistenciaBrasilia(valor: unknown): string {
  const data = dataHoraUtcBase44(valor);
  if (Number.isNaN(data.getTime())) return "prazo indisponível";
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(data);
  return `até ${texto} (horário de Brasília)`;
}
