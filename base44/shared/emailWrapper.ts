// Módulo compartilhado: envolve o corpo de qualquer e-mail (transacional ou
// campanha) com o cabeçalho e rodapé fixos da marca, usando os valores
// cadastrados em ConfiguracaoEmail (singleton). Usado internamente por
// sendEmailViaResend, para que toda function de envio já saia com o layout
// padrão sem precisar duplicar HTML.

export async function buildEmailHtml(base44, corpoHtml, { marketing = false } = {}) {
  const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
  const cfg = configs?.[0] || {};

  const nome = cfg.nome_remetente || "Laboratório de Cozinha";
  const tagline = cfg.tagline || "Receitas que se Multiplicam";
  const cor = cfg.cor_cabecalho || "#5c7a5f";
  const assinatura = cfg.assinatura_rodape || "Carmen Reinstein · Laboratório de Cozinha";
  const emailContato = cfg.email_contato || "";
  const endereco = cfg.endereco_rodape || "";
  const textoCancelamento = cfg.texto_cancelamento || "Cancelar inscrição";
  const emailCancelamento = emailContato || "contato@nutrimenu.com.br";
  const hrefCancelamento = `mailto:${emailCancelamento}?subject=${encodeURIComponent("Cancelar inscrição - Laboratório de Cozinha")}`;

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f2;">
    <style>.btn-cta { display:inline-block; background:${cor}; color:#ffffff !important; padding:12px 28px; border-radius:6px; text-decoration:none; font-family: Georgia, 'Times New Roman', serif; }</style>
    <div style="max-width:560px;margin:0 auto;background:#ffffff;">
      <div style="background:${cor};padding:28px 24px;text-align:center;">
        <div style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;">${nome}</div>
        <div style="color:#ffffff;opacity:0.85;font-size:13px;margin-top:4px;font-family:Arial,sans-serif;">${tagline}</div>
      </div>
      <div style="padding:32px 24px;color:#2b2b2b;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:15px;line-height:1.6;">
        ${corpoHtml}
      </div>
      <div style="padding:20px 24px;border-top:1px solid #eee;color:#888;font-size:12px;font-family:Arial,sans-serif;text-align:center;">
        <div>${assinatura}</div>
        ${emailContato ? `<div>${emailContato}</div>` : ""}
        ${endereco ? `<div>${endereco}</div>` : ""}
        ${marketing ? `<div style="margin-top:8px;"><a href="${hrefCancelamento}" style="color:#888;text-decoration:underline;">${textoCancelamento}</a></div>` : ""}
      </div>
    </div>
  </body>
</html>`;
}