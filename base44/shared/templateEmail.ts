// Módulo compartilhado: resolve o conteúdo (assunto/corpo) de um e-mail
// transacional a partir do TemplateEmail cadastrado pelo admin, com fallback
// para um texto padrão caso nenhum template tenha sido salvo ainda.
// Substitui a variável {{nome}} e quaisquer outras variáveis extras passadas em `variaveis`.

export async function renderTemplateEmail(base44, tipo, nome, defaultAssunto, defaultCorpo, variaveis = {}) {
  const templates = await base44.asServiceRole.entities.TemplateEmail.filter({ tipo });
  const template = templates?.[0];

  const assunto = template?.assunto || defaultAssunto;
  const corpo = template?.corpo || defaultCorpo;
  const ativo = template?.status === "ativo";

  const todasVariaveis = { nome: nome || "", ...variaveis };
  const substituir = (texto) => {
    let resultado = texto;
    for (const [chave, valor] of Object.entries(todasVariaveis)) {
      resultado = resultado.replace(new RegExp(`{{\\s*${chave}\\s*}}`, "gi"), valor ?? "");
    }
    return resultado;
  };

  return { assunto: substituir(assunto), html: substituir(corpo), ativo };
}