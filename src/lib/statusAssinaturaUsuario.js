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
  if (status === "inativo") {
    return { label: "Inativo", className: "bg-gray-100 text-gray-600 border-gray-200" };
  }
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

export const TIPOS_USUARIO = [
  { value: "todos", label: "Todos" },
  { value: "assinante", label: "Assinante" },
  { value: "assinante_expirado", label: "Assinante expirado" },
  { value: "todos_assinantes", label: "Todos assinantes" },
  { value: "visitante", label: "Visitante" },
  { value: "expirando_3_dias", label: "Todos assinantes expirando em até 3 dias" },
];

// Classifica o usuário para o filtro "Tipo de usuário" da Administração.
export function usuarioMatchTipo(u, tipoFiltro) {
  if (tipoFiltro === "todos") return true;
  const plano = u?.plano_atual;
  const isPago = plano === "mensal" || plano === "anual";
  const status = u?.status_assinatura;
  if (tipoFiltro === "visitante") return !isPago;
  if (tipoFiltro === "todos_assinantes") return isPago;
  if (tipoFiltro === "assinante") return isPago && status === "ativo";
  if (tipoFiltro === "assinante_expirado") return isPago && (status === "vencido" || status === "cancelado");
  if (tipoFiltro === "expirando_3_dias") {
    if (!isPago || status !== "ativo") return false;
    const dias = diasEntreHoje(u?.data_expiracao);
    return dias != null && dias >= 0 && dias <= 3;
  }
  return true;
}

export function formatarDataHora(dataStr) {
  if (!dataStr) return null;
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR");
}