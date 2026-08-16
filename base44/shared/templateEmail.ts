// Módulo compartilhado: resolve o conteúdo (assunto/corpo) de um e-mail
// transacional a partir do TemplateEmail cadastrado pelo admin, com fallback
// para um texto padrão caso nenhum template tenha sido salvo ainda.
// Substitui a variável {{nome}} pelo nome do destinatário.

export async function renderTemplateEmail(base44, tipo, nome, defaultAssunto, defaultCorpo) {
  const templates = await base44.asServiceRole.entities.TemplateEmail.filter({ tipo });
  const template = templates?.[0];

  const assunto = template?.assunto || defaultAssunto;
  const corpo = template?.corpo || defaultCorpo;
  const ativo = template?.status === "ativo";

  const substituir = (texto) => texto.replace(/{{\s*nome\s*}}/gi, nome || "");

  return { assunto: substituir(assunto), html: substituir(corpo), ativo };
}