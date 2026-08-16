export function formatarData(dataStr) {
  if (!dataStr) return null;
  const data = new Date(`${dataStr}T00:00:00`);
  if (isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR");
}

export function diasEntreHoje(dataStr) {
  if (!dataStr) return null;
  const data = new Date(`${dataStr}T00:00:00`);
  if (isNaN(data.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((data.getTime() - hoje.getTime()) / 86400000);
}

export function computeStatusUsuario(u) {
  const status = u?.status_assinatura;
  if (status === "vencido" || status === "cancelado") {
    return { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200" };
  }
  if (status === "trial") {
    const dias = diasEntreHoje(u?.data_expiracao);
    if (dias != null && dias <= 3) {
      return { label: "Trial expirando", className: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    }
  }
  return { label: "Ativo", className: "bg-green-100 text-green-700 border-green-200" };
}

export function whatsappHref(telefone) {
  const digits = (telefone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/55${digits}`;
}

export const PLANO_LABEL = { trial: "Trial", mensal: "Mensal", anual: "Anual", renovacao: "Renovação" };

export const SEGMENTOS = ["Nutricionista", "Chef de Cozinha", "Cozinha Industrial", "Estudante", "Fabricante de Produtos"];
export const ORIGENS = ["Google", "Instagram", "Indicação de amigos", "Site", "Outros"];

export function formatarDataHora(dataStr) {
  if (!dataStr) return null;
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR");
}