import { base44 } from "@/api/base44Client";

// Registra a data/hora do último login do usuário. Best-effort: falhas de
// rede nunca devem impedir a entrada no app. Chamado uma vez por sessão,
// no momento em que a sessão é confirmada — não a cada navegação.
export function registrarUltimoLogin() {
  return base44.auth.updateMe({ data_login: new Date().toISOString() }).catch(() => {});
}