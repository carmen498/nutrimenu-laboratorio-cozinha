import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { avaliarAcessoAssinaturaServer } from '../../shared/acessoAssinatura.ts';
import { sendEmailViaResend } from '../../shared/resendEmail.ts';
import { renderTemplateEmail } from '../../shared/templateEmail.ts';
import { registrarLogEmail } from '../../shared/governancaLogs.ts';

const MODULO = 'laboratorio_custos';
const TIPO_EMAIL = 'custos_trial_ativado';
const ASSUNTO_PADRAO = 'Seu teste do Laboratório de Custos começou';
const CORPO_PADRAO = `<p>Olá {{nome}}, seu teste gratuito do Laboratório de Custos já começou.</p><p>Você tem 7 dias para explorar custos de produção, custo por receita, margem, markup e histórico de fichas.</p>`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'admin') return Response.json({ error: 'Administradores já possuem acesso de homologação.' }, { status: 403 });

    const acessoBase = avaliarAcessoAssinaturaServer(user);
    if (!acessoBase.temAcesso) {
      return Response.json({ error: 'É necessário ter acesso ativo ao Laboratório de Cozinha.', code: 'base_plan_required' }, { status: 409 });
    }

    const configs = await base44.asServiceRole.entities.ConfiguracaoAddonCustos.filter({ chave: MODULO });
    const config = (configs || [])[0] || null;
    if (!config?.trial_habilitado) {
      return Response.json({ error: 'O teste gratuito do Laboratório de Custos ainda não foi liberado.', code: 'cost_trial_disabled' }, { status: 409 });
    }

    const acessos = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: MODULO });
    const jaUsouTrial = (acessos || []).some((a: any) => a.modalidade === 'trial' || a.origem === 'trial' || a.trial_ativado_em);
    if (jaUsouTrial) {
      return Response.json({ error: 'O teste gratuito do Laboratório de Custos já foi utilizado nesta conta.', code: 'cost_trial_already_used' }, { status: 409 });
    }
    const acessoAtivo = (acessos || []).some((a: any) => a.status === 'ativo' && (!a.fim_em || new Date(a.fim_em) >= new Date()));
    if (acessoAtivo) {
      return Response.json({ error: 'Esta conta já possui acesso ativo ao Laboratório de Custos.', code: 'cost_access_already_active' }, { status: 409 });
    }

    const agora = new Date();
    const dias = Math.max(1, Math.min(30, Number(config.trial_dias || 7)));
    const fim = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
    const oferta = (await base44.asServiceRole.entities.ConfiguracaoPlano.filter({ plano_id: 'custos_trial', produto: 'laboratorio_custos' }))?.[0] || null;

    const acesso = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.create({
      user_id: user.id,
      modulo: MODULO,
      status: 'ativo',
      modalidade: 'trial',
      plano_id: 'custos_trial',
      origem: 'trial',
      inicio_em: agora.toISOString(),
      fim_em: fim.toISOString(),
      trial_ativado_em: agora.toISOString(),
      oferta_versao: oferta?.versao_oferta || config?.versao_oferta || '',
      observacao: 'Trial único do Laboratório de Custos.'
    });

    if (user.email) {
      const nome = user.nome_completo || user.full_name || '';
      const { assunto, html, ativo } = await renderTemplateEmail(base44, TIPO_EMAIL, nome, ASSUNTO_PADRAO, CORPO_PADRAO);
      if (ativo) {
        const resultado = await sendEmailViaResend(base44, { to: user.email, subject: assunto, html });
        await registrarLogEmail(base44, { usuarioId: user.id, email: user.email, tipo: TIPO_EMAIL, resultado });
      }
    }

    return Response.json({ success: true, acesso_id: acesso.id, inicio_em: agora.toISOString(), fim_em: fim.toISOString(), dias });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    return Response.json({ error: message }, { status: 500 });
  }
}
