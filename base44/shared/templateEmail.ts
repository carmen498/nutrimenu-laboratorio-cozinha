// Módulo compartilhado: resolve o conteúdo (assunto/corpo) de um e-mail
// transacional a partir do TemplateEmail cadastrado pelo admin, com fallback
// para um texto padrão caso nenhum template tenha sido salvo ainda.
// Substitui a variável {{nome}} e quaisquer outras variáveis extras passadas em `variaveis`.

export async function renderTemplateEmail(base44, tipo, nome, defaultAssunto, defaultCorpo, variaveis = {}) {
  const templates = await base44.asServiceRole.entities.TemplateEmail.filter({ tipo });
  const template = templates?.[0];

  const assunto = template?.assunto || defaultAssunto;
  const corpo = template?.corpo || defaultCorpo;
  // Sem template salvo, o fallback de código continua operacional. Se existir
  // template administrável, o status "rascunho" deve realmente interromper o envio.
  const ativo = template ? template.status === "ativo" : true;

  const todasVariaveis = { nome: nome || "", ...variaveis };
  const substituir = (texto) => {
    let resultado = texto;
    for (const [chave, valor] of Object.entries(todasVariaveis)) {
      resultado = resultado.replace(new RegExp(`{{\\s*${chave}\\s*}}`, "gi"), valor ?? "");
    }
    return resultado;
  };

  const assuntoResolvido = substituir(assunto);
  const htmlResolvido = substituir(corpo);
  const pendentes = [...`${assuntoResolvido}\n${htmlResolvido}`.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((m) => m[1]);
  if (pendentes.length > 0) {
    throw new Error(`Template de e-mail ${tipo} possui variáveis sem valor: ${[...new Set(pendentes)].join(", ")}`);
  }

  return { assunto: assuntoResolvido, html: htmlResolvido, ativo };
}