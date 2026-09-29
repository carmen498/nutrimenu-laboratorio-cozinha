// Módulo compartilhado: resolve o conteúdo (assunto/corpo) de um e-mail
// transacional a partir do TemplateEmail cadastrado pelo admin, com fallback
// para um texto padrão caso nenhum template tenha sido salvo ainda.
// Substitui a variável {{nome}} e quaisquer outras variáveis extras passadas em `variaveis`.

import { sendEmailViaResend } from "./resendEmail.ts";

async function notificarAdminTemplateQuebrado(base44, tipo, pendentes) {
  const msg = `Template de e-mail "${tipo}" possui variáveis sem valor: ${pendentes.join(", ")}. ` +
    `O texto padrão de código foi usado como fallback — edite o template em Comunicação > Transacionais para corrigir.`;
  console.warn(msg);
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }).catch(() => []);
    for (const admin of admins || []) {
      if (!admin.email) continue;
      await sendEmailViaResend(base44, {
        to: admin.email,
        subject: `Template de e-mail "${tipo}" com variáveis sem valor`,
        html: `<p>${msg}</p><p>Tipo: <strong>${tipo}</strong></p><p>Variáveis pendentes: <strong>${pendentes.join(", ")}</strong></p><p>O e-mail foi enviado com o texto padrão de código. Ajuste o template para evitar divergências.</p>`,
      }).catch(() => {});
    }
  } catch (e) { /* fire-and-forget — não bloqueia o envio do e-mail do cliente */ }
}

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
    const unicos = [...new Set(pendentes)];
    await notificarAdminTemplateQuebrado(base44, tipo, unicos);
    // Fallback para o texto padrão de código, que sempre tem todas as variáveis
    // já interpoladas (ex.: link_produto é embutido na string JS, não como
    // placeholder). Assim o e-mail sai corretamente e o erro interno nunca
    // chega ao cliente — o admin é notificado por e-mail.
    return { assunto: substituir(defaultAssunto), html: substituir(defaultCorpo), ativo };
  }

  return { assunto: assuntoResolvido, html: htmlResolvido, ativo };
}