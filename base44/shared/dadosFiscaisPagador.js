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
  return { tipo, nome, cpf_cnpj: documento.trim(), documento_digitos: digitos, faltando };
}
