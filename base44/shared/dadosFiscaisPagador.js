export function formatarDocumentoFiscal(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return "";
}

export function resolverPagadorFiscal(user) {
  const documento = String(user?.cpf_cnpj || "");
  const digitos = documento.replace(/\D/g, "");
  const tipo = digitos.length === 14 ? "pj" : digitos.length === 11 ? "pf" : null;
  const nome = tipo === "pj"
    ? String(user?.razao_social || "").trim()
    : tipo === "pf"
      ? String(user?.nome_completo || "").trim()
      : "";
  const faltando = [];
  if (!tipo) faltando.push("CPF/CNPJ válido");
  if (tipo === "pj" && !nome) faltando.push("razão social");
  if (tipo === "pf" && !nome) faltando.push("nome completo");
  return { tipo, nome, cpf_cnpj: formatarDocumentoFiscal(digitos), documento_digitos: digitos, faltando };
}
