export const VERSAO_TERMOS_ATUAL = "Termos de Uso v.18/08/2026";
export const VERSAO_PRIVACIDADE_ATUAL = "Política de Privacidade v.18/08/2026";

export function termosAtuaisAceitos(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.termos_versao_aceita === VERSAO_TERMOS_ATUAL
    && user.privacidade_versao_aceita === VERSAO_PRIVACIDADE_ATUAL;
}