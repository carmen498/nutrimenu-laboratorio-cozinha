import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { avaliarAcessoAssinaturaServer } from '../../shared/acessoAssinatura.ts';

const MODULO = 'laboratorio_custos';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ elegivel: false, motivo: 'sem_usuario' }, { status: 401 });
    if (user.role === 'admin') return Response.json({ elegivel: false, motivo: 'admin_beta' });

    const acessoBase = avaliarAcessoAssinaturaServer(user);
    if (!acessoBase.temAcesso) return Response.json({ elegivel: false, motivo: 'base_inativa' });

    const [configs, autorizacoes, acessos] = await Promise.all([
      base44.asServiceRole.entities.ConfiguracaoAddonCustos.filter({ chave: MODULO }),
      base44.asServiceRole.entities.HomologacaoTrialCustosUsuario.filter({ user_id: user.id, habilitado: true }),
      base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: MODULO }),
    ]);

    const config = (configs || [])[0] || null;
    const agora = new Date();
    const autorizacao = (autorizacoes || []).find((a: any) => !a.expira_em || new Date(a.expira_em) >= agora) || null;
    const autorizadoHomologacao = !!autorizacao;
    const trialGlobal = !!config?.trial_habilitado;
    const jaUsouTrial = (acessos || []).some((a: any) => a.modalidade === 'trial' || a.origem === 'trial' || a.trial_ativado_em);
    const acessoAtivo = (acessos || []).some((a: any) => a.status === 'ativo' && (!a.fim_em || new Date(a.fim_em) >= agora));

    if (jaUsouTrial) return Response.json({ elegivel: false, motivo: 'trial_ja_utilizado', autorizadoHomologacao, trialGlobal });
    if (acessoAtivo) return Response.json({ elegivel: false, motivo: 'acesso_ja_ativo', autorizadoHomologacao, trialGlobal });
    if (!trialGlobal && !autorizadoHomologacao) return Response.json({ elegivel: false, motivo: 'trial_indisponivel', autorizadoHomologacao: false, trialGlobal: false });

    return Response.json({ elegivel: true, motivo: autorizadoHomologacao && !trialGlobal ? 'homologacao' : 'publico', dias: Number(config?.trial_dias || 7), autorizadoHomologacao, trialGlobal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    return Response.json({ elegivel: false, motivo: 'erro', error: message }, { status: 500 });
  }
}
