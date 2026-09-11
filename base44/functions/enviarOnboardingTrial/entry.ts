// Sequência de onboarding do trial (dia 2, dia 5 e véspera/uso avançado).
// Disparada por workflow diário. Cada tipo é enviado no máximo UMA vez por
// usuário — a deduplicação usa LogEmail (usuario_id + tipo), sem depender do
// e-mail em claro.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { renderTemplateEmail } from "../../shared/templateEmail.ts";
import { protegerExecucaoAgendada } from "../../shared/protecoesAutomacao.ts";
import { hojeSaoPauloISO } from "../../shared/acessoAssinatura.ts";
import { registrarLogEmail } from "../../shared/governancaLogs.ts";

const PADROES = {
  onboarding_dia2: {
    assunto: "{{nome}}, sua receita em qualquer quantidade",
    corpo: `<p>Olá {{nome}},</p>
<p>Você sabia que, no Laboratório de Cozinha, a mesma receita serve 4 ou 400 pessoas sem você recalcular nada à mão? O custo por porção e a lista de compras se ajustam junto.</p>
<p>Abra uma receita, mude o número de porções e veja o que acontece.</p>`,
  },
  onboarding_dia5: {
    assunto: "{{nome}}, do cardápio ao orçamento do cliente",
    corpo: `<p>Olá {{nome}},</p>
<p>Depois de montar uma refeição ou um evento, o Laboratório gera o orçamento pronto para enviar ao cliente — com o preço final que você definir e sem expor seus custos internos.</p>
<p>É o caminho que a Carmen usa em todos os eventos dela.</p>`,
  },
  onboarding_resumo_oferta: {
    assunto: "{{nome}}, seu teste está no fim",
    corpo: `<p>Olá {{nome}},</p>
<p>Seu período de teste está chegando ao fim. Tudo o que você criou continua salvo na sua conta ao escolher um plano.</p>
<p>O plano anual sai por menos da metade do mensal — vale conferir antes de decidir.</p>`,
  },
};

function diasEntreISO(inicio: string, fim: string): number | null {
  const a = Date.parse(`${inicio}T00:00:00Z`);
  const b = Date.parse(`${fim}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

async function jaEnviado(base44: any, usuarioId: string, tipo: string): Promise<boolean> {
  const logs = await base44.asServiceRole.entities.LogEmail.filter({ usuario_id: usuarioId, tipo });
  return (logs || []).length > 0;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await protegerExecucaoAgendada(base44, req, {
      chave: "enviarOnboardingTrial",
      cooldownHoras: 20,
      janela: { inicioMinuto: 8 * 60 + 55, fimMinuto: 9 * 60 + 25 },
    });
    if (gate.response) return gate.response;

    const hoje = hojeSaoPauloISO();
    const usuarios = await base44.asServiceRole.entities.User.filter({ status_assinatura: "trial" });

    let enviados = 0;
    const porTipo: Record<string, number> = {};

    for (const usuario of usuarios) {
      if (!usuario.email || !usuario.id || usuario.role === "admin") continue;

      const diasDesdeInicio = usuario.data_inicio ? diasEntreISO(usuario.data_inicio, hoje) : null;
      const diasAteExpirar = usuario.data_expiracao ? diasEntreISO(hoje, usuario.data_expiracao) : null;
      const diasDeUso = (usuario.trial_dias_uso || []).length;

      let tipo: string | null = null;
      if (diasAteExpirar === 1 || diasDeUso >= 6) tipo = "onboarding_resumo_oferta";
      else if (diasDesdeInicio === 5) tipo = "onboarding_dia5";
      else if (diasDesdeInicio === 2) tipo = "onboarding_dia2";
      if (!tipo) continue;

      if (await jaEnviado(base44, usuario.id, tipo)) continue;

      // Diferente dos e-mails antigos, a sequência de onboarding só dispara
      // depois que o template é ativado no Admin — é assim que a aba
      // Transacionais já os exibe ("Rascunho" enquanto não existir template).
      const templates = await base44.asServiceRole.entities.TemplateEmail.filter({ tipo });
      if (templates?.[0]?.status !== "ativo") {
        console.log(`Template "${tipo}" não está ativo — e-mail não enviado.`);
        continue;
      }

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