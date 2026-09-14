// Módulo compartilhado: envolve o corpo de qualquer e-mail (transacional ou
// campanha) com o cabeçalho e rodapé fixos da marca. Para laboratorio_cozinha
// lê ConfiguracaoEmail (singleton, configurável pelo admin); para guia_zr,
// laboratorio_custos e fallback usa identidade própria hardcoded via
// identidadeProduto. Usado internamente por sendEmailViaResend.
import { resolverIdentidadeProduto } from "./identidadeProduto.ts";
import { DADOS_EMPRESA } from "./dadosEmpresa.ts";

export async function buildEmailHtml(base44, corpoHtml, { marketing = false, produto } = {}) {
  const identidade = resolverIdentidadeProduto(produto);

  let nome: string, tagline: string, cor: string, assinatura: string;
  let emailContato = "";

  if (identidade) {
    nome = identidade.nome;
    tagline = identidade.tagline;
    cor = identidade.cor;
    assinatura = identidade.assinatura;
  } else {
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.list();
    const cfg = configs?.[0] || {};
    nome = cfg.nome_remetente || "Laboratório de Cozinha";
    tagline = cfg.tagline || "Receitas que se Multiplicam";
    cor = cfg.cor_cabecalho || "#5c7a5f";
    assinatura = cfg.assinatura_rodape || "Carmen Reinstein · Laboratório de Cozinha";
    emailContato = cfg.email_contato || "";
  }

  const textoCancelamento = "Cancelar inscrição";
  const emailCancelamento = emailContato || "contato@nutrimenu.com.br";
  const hrefCancelamento = `mailto:${emailCancelamento}?subject=${encodeURIComponent(`Cancelar inscrição - ${nome}`)}`;

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
        <div>${DADOS_EMPRESA.razaoSocial} · CNPJ ${DADOS_EMPRESA.cnpj}</div>
        <div>${DADOS_EMPRESA.enderecoCompleto}</div>
        ${marketing ? `<div style="margin-top:8px;"><a href="${hrefCancelamento}" style="color:#888;text-decoration:underline;">${textoCancelamento}</a></div>` : ""}
      </div>
    </div>
  </body>
</html>`;
}