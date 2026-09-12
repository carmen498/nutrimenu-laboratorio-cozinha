// Recuperação de trial vencido: e-mails em D+3 e D+7 após a expiração, apenas
// para quem nunca pagou. Disparada por workflow diário. Cada tipo é enviado no
// máximo UMA vez por usuário (dedupe por LogEmail: usuario_id + tipo).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { protegerExecucaoAgendada } from "../../shared/protecoesAutomacao.ts";
import { hojeSaoPauloISO } from "../../shared/acessoAssinatura.ts";
import { registrarLogEmail } from "../../shared/governancaLogs.ts";
import { enviarNotificacaoWhatsapp } from "../../shared/notificarWascript.ts";

// WhatsApp em D+3 só para trial vencido com alto uso (> 5 receitas pessoais).
const MIN_RECEITAS_ALTO_USO = 5;

async function temAltoUso(base44: any, usuarioId: string): Promise<boolean> {
  const receitas = await base44.asServiceRole.entities.Receita.filter(
    { usuario_dono_id: usuarioId, is_base: false },
    undefined,
    MIN_RECEITAS_ALTO_USO + 1,
  );
  return (receitas || []).length > MIN_RECEITAS_ALTO_USO;
}

const PADROES = {
  reativacao_d3: {
    assunto: "{{nome}}, suas receitas continuam aqui",
    corpo: `<p>Olá {{nome}},</p>
<p>Seu teste do Laboratório de Cozinha terminou, mas tudo o que você criou continua salvo: receitas, cardápios, eventos e custos.</p>
<p>Ao escolher um plano, você volta exatamente de onde parou.</p>`,
  },
  reativacao_d7: {
    assunto: "{{nome}}, quer retomar de onde parou?",
    corpo: `<p>Olá {{nome}},</p>
<p>Faz uma semana que seu teste terminou. Suas receitas e cardápios seguem guardados na sua conta.</p>
<p>Se ficou alguma dúvida sobre escalar receitas, custos ou orçamentos, responda este e-mail — a gente ajuda.</p>`,
  },
};

function diasEntreISO(inicio: string, fim: string): number | null {
  const a = Date.parse(`${inicio}T00:00:00Z`);
  const b = Date.parse(`${fim}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await protegerExecucaoAgendada(base44, req, {
      chave: "enviarReativacaoTrial",
      cooldownHoras: 20,
      janela: { inicioMinuto: 9 * 60 + 25, fimMinuto: 9 * 60 + 55 },
    });
    if (gate.response) return gate.response;

    const hoje = hojeSaoPauloISO();
    const usuarios = await base44.asServiceRole.entities.User.filter({ status_assinatura: "vencido" });

    let enviados = 0;
    const porTipo: Record<string, number> = {};

    for (const usuario of usuarios) {
      if (!usuario.email || !usuario.id || usuario.role === "admin") continue;
      if (!usuario.data_expiracao) continue;

      const diasDesdeFim = diasEntreISO(usuario.data_expiracao, hoje);
      const tipo = diasDesdeFim === 3 ? "reativacao_d3" : diasDesdeFim === 7 ? "reativacao_d7" : null;
      if (!tipo) continue;

      // Recuperação é só para quem nunca pagou.
      const aprovados = await base44.asServiceRole.entities.Pagamento.filter({
        usuario_id: usuario.id,
        status: "approved",
      });
      if ((aprovados || []).length > 0) continue;

      // WhatsApp D+3 (alto uso): independente do e-mail, uma única vez por usuário.
      if (tipo === "reativacao_d3" && usuario.telefone_whatsapp) {
        const jaWhats = await base44.asServiceRole.entities.LogWhatsapp.filter({ usuario_id: usuario.id, tipo: "reativacao_alto_uso" });
        if ((jaWhats || []).length === 0 && (await temAltoUso(base44, usuario.id))) {
          await enviarNotificacaoWhatsapp(base44, "reativacao_alto_uso", usuario);
          porTipo.reativacao_alto_uso_whatsapp = (porTipo.reativacao_alto_uso_whatsapp || 0) + 1;
        }
      }

      const jaEnviado = await base44.asServiceRole.entities.LogEmail.filter({ usuario_id: usuario.id, tipo });
      if ((jaEnviado || []).length > 0) continue;

      const nome = usuario.nome_completo || usuario.full_name || "";
      const padrao = PADROES[tipo as keyof typeof PADROES];
      const { assunto, html, ativo } = await renderTemplateEmail(
        base44,
        tipo,
        nome,
        padrao.assunto,
        padrao.corpo,
      );

      if (!ativo) {
        console.log(`Template "${tipo}" está em rascunho — e-mail não enviado.`);
        continue;
      }

      const resultado = await sendEmailViaResend(base44, { to: usuario.email, subject: assunto, html });
      await registrarLogEmail(base44, { usuarioId: usuario.id, email: usuario.email, tipo, resultado });
      if (resultado.ok) {
        enviados++;
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      }
    }

    return Response.json({ processados: usuarios.length, enviados, por_tipo: porTipo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}