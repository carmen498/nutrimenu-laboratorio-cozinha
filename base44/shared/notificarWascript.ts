// Módulo compartilhado: envia (ou simula, em modo de teste) uma mensagem de WhatsApp
// transacional via API Wascript/To Talk. Usado pelo fluxo de pagamento aprovado/recusado
// (síncrono e via webhook) e pelo cron diário de "plano perto de vencer".
//
// Modo de teste (padrão ATIVO): enquanto o secret WASCRIPT_MODO_TESTE não for "false",
// a mensagem NUNCA é enviada de fato — apenas registrada em LogWhatsapp (status "simulado")
// para conferência visual antes de liberar o envio real.
import { secrets } from "base44:runtime";

const DEFAULTS: Record<string, string> = {
  pagamento_aprovado: "Olá {{nome}}! 🎉 Seu pagamento foi aprovado e seu plano no Laboratório de Cozinha já está ativo.",
  pagamento_recusado: "Olá {{nome}}, não conseguimos aprovar o pagamento da sua assinatura. Verifique os dados do cartão ou tente outra forma de pagamento para continuar com acesso ao Laboratório de Cozinha.",
  plano_vencendo: "Olá {{nome}}, seu plano no Laboratório de Cozinha vence em breve. Renove agora para não perder o acesso às suas receitas e cardápios.",
  pagamento_pendente_lembrete: "Olá {{nome}}, notamos que seu pagamento no Laboratório de Cozinha ainda não foi confirmado. Podemos ajudar em algo? Se preferir, você pode gerar um novo pagamento na aba Planos do app.",
  pagamento_estornado: "Olá {{nome}}, confirmamos o estorno do seu pagamento no Laboratório de Cozinha. O valor será devolvido pelo Mercado Pago conforme o prazo do seu banco. Qualquer dúvida, estamos à disposição.",
};

type TipoWascript = "pagamento_aprovado" | "pagamento_recusado" | "plano_vencendo" | "pagamento_pendente_lembrete" | "pagamento_estornado";

export async function enviarNotificacaoWhatsapp(
  base44: any,
  tipo: TipoWascript,
  usuario: { telefone_whatsapp?: string; nome_completo?: string; full_name?: string }
): Promise<void> {
  const telefone = usuario?.telefone_whatsapp;
  if (!telefone) {
    console.log(`Usuário sem telefone_whatsapp cadastrado — WhatsApp "${tipo}" não enviado.`);
    return;
  }

  const templates = await base44.asServiceRole.entities.TemplateWascript.filter({ tipo });
  const template = templates?.[0];
  const textoBase = template?.texto || DEFAULTS[tipo];
  // Sem template salvo ainda, usa o texto padrão como ativo. Com template salvo, respeita o status.
  const ativo = template ? template.status === "ativo" : true;

  if (!ativo) {
    console.log(`Template WhatsApp "${tipo}" está em rascunho — mensagem não enviada.`);
    return;
  }

  const nome = usuario.nome_completo || usuario.full_name || "";
  const mensagem = textoBase.replace(/{{\s*nome\s*}}/gi, nome || "");

  const digits = telefone.replace(/\D/g, "");
  const numero = digits.length <= 11 ? `55${digits}` : digits;

  const modoTesteBruto = secrets.get("WASCRIPT_MODO_TESTE");
  const modoTeste = modoTesteBruto !== "false"; // padrão: true (modo de teste ativo)
  const token = secrets.get("WASCRIPT_API_TOKEN");

  if (modoTeste || !token) {
    console.log(`[MODO TESTE] WhatsApp "${tipo}" simulado.`);
    await base44.asServiceRole.entities.LogWhatsapp.create({
      destinatario_telefone: numero,
      tipo,
      modo_teste: true,
      status: "simulado",
    }).catch((e: any) => console.log("Falha ao gravar LogWhatsapp:", e.message));
    return;
  }

  const resposta = await fetch(`https://api-whatsapp.wascript.com.br/api/enviar-texto/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number: numero, message: mensagem }),
  });
  if (!resposta.ok) {
    console.log(`Erro ao enviar WhatsApp "${tipo}" (HTTP ${resposta.status}).`);
  }

  await base44.asServiceRole.entities.LogWhatsapp.create({
    destinatario_telefone: numero,
    tipo,
    modo_teste: false,
    status: resposta.ok ? "enviado" : "falhou",
  }).catch((e: any) => console.log("Falha ao gravar LogWhatsapp:", e.message));
}