// Dados obrigatórios para emissão de nota fiscal. Exigidos no checkout: sem eles
// a compra não se conclui, porque depois não há como emitir a nota.
// Cadastros antigos guardavam endereço concatenado — aceitamos como preenchimento
// parcial, mas número, bairro, cidade e UF continuam obrigatórios.
// Para CPF exigimos nome + sobrenome; para CNPJ, razão social (mesmo de uma palavra).

function primeiro(...valores: unknown[]): string {
  for (const v of valores) {
    const texto = String(v ?? "").trim();
    if (texto) return texto;
  }
  return "";
}

export function avaliarDadosFiscais(usuario: any = {}) {
  const documento = String(usuario.cpf_cnpj || "").replace(/\D/g, "");
  const cep = String(usuario.cep || "").replace(/\D/g, "");
  const [cidadeLegado = "", estadoLegado = ""] = String(usuario.cidade_uf || "").split("/");
  const ehCnpj = documento.length === 14;
  const nomeResolvido = String(usuario.nome_completo || "").trim();
  const temSobrenome = nomeResolvido.split(/\s+/).filter(Boolean).length >= 2;

  const validacoes: Record<string, boolean> = {
    "CPF ou CNPJ": documento.length === 11 || documento.length === 14,
    ...(ehCnpj
      ? { "Razão social": !!primeiro(usuario.razao_social) }
      : { "Nome e sobrenome": temSobrenome }),
    "CEP": cep.length === 8,
    "Logradouro": !!primeiro(usuario.logradouro, usuario.endereco),
    "Número": !!primeiro(usuario.numero),
    "Bairro": !!primeiro(usuario.bairro),
    "Cidade": !!primeiro(usuario.cidade, cidadeLegado),
    "Estado (UF)": primeiro(usuario.estado, estadoLegado).length === 2,
  };

  const faltando = Object.keys(validacoes).filter((campo) => !validacoes[campo]);
  return { completo: faltando.length === 0, faltando };
}