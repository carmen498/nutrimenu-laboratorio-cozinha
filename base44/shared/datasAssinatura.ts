// Utilitários compartilhados para períodos de acesso com data_expiracao inclusiva.
// Ex.: 7 dias iniciando em 23/08 => último dia válido 29/08 (23,24,25,26,27,28,29).

export function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().split("T")[0];
}

export function calcularExpiracaoInclusiva(dataInicioISO: string, diasDeAcesso: number): string {
  const dias = Number.isFinite(diasDeAcesso) ? Math.max(Math.trunc(diasDeAcesso), 1) : 1;
  return somarDiasISO(dataInicioISO, dias - 1);
}
