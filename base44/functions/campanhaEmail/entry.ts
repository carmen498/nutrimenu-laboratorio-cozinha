// Aba "Campanhas" da Central de Comunicação — admin only.
// acao="contar": retorna o total de destinatários do público selecionado.
// acao="teste": envia o e-mail apenas para o próprio admin.
// acao="disparar": envia para todos os destinatários do público selecionado.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";

function filtroPublico(publico) {
  const hoje = new Date();
  switch (publico) {
    case "todos_ativos":
      return (u) => u.status_assinatura === "ativo";
    case "trial_nao_convertido":
      return (u) => u.status_assinatura === "trial";
    case "plano_mensal":
      return (u) => u.plano_atual === "mensal";
    case "plano_anual":
      return (u) => u.plano_atual === "anual";
    case "trial_vencido_30d":
      return (u) => {
        if (u.status_assinatura !== "vencido" || !u.data_expiracao) return false;
        const dias = Math.round((hoje.getTime() - new Date(`${u.data_expiracao}T00:00:00`).getTime()) / 86400000);
        return dias >= 30;
      };
    default:
      return () => false;
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { acao, publico, assunto, corpo } = body;

    const todosUsuarios = await base44.asServiceRole.entities.User.list("-created_date", 2000);
    const destinatarios = todosUsuarios.filter(filtroPublico(publico));

    if (acao === "contar") {
      return Response.json({ total: destinatarios.length });
    }

    if (acao === "teste") {
      const resultado = await sendEmailViaResend({
        to: user.email,
        subject: assunto || "Teste de campanha",
        html: (corpo || "").replace(/\n/g, "<br/>"),
      });
      return Response.json({ success: resultado.ok, error: resultado.error });
    }

    if (acao === "disparar") {
      let enviados = 0;
      for (const destinatario of destinatarios) {
        if (!destinatario.email) continue;
        const resultado = await sendEmailViaResend({
          to: destinatario.email,
          subject: assunto,
          html: (corpo || "").replace(/\n/g, "<br/>"),
        });
        if (resultado.ok) enviados++;
      }
      return Response.json({ total: destinatarios.length, enviados });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}