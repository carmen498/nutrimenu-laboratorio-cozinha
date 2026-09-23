import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { faixasGuiaTecnicoZR } from '../../shared/acessoGuiaTecnicoZR.ts';

const INICIO_ATIVACAO = Date.parse('2026-10-01T00:00:00-03:00');
const FIM_ATIVACAO = Date.parse('2026-10-06T23:59:59-03:00');
const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;
const ORIGEM = 'lancamento-guia-zr-outubro-2026';

function nomeValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const nome = valor.trim().replace(/\s+/g, ' ');
  return nome.length >= 2 && nome.length <= 100 ? nome : null;
}

function whatsappValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const digitos = valor.replace(/\D/g, '');
  const comPais = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  return /^55\d{10,11}$/.test(comPais) ? comPais : null;
}

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const agora = new Date();
    const agoraMs = agora.getTime();
    if (agoraMs < INICIO_ATIVACAO) {
      return Response.json({ error: 'Campaign not started', code: 'campaign_not_started' }, { status: 410 });
    }
    if (agoraMs > FIM_ATIVACAO) {
      return Response.json({ error: 'Campaign ended', code: 'campaign_ended' }, { status: 410 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid body', code: 'invalid_body' }, { status: 400 });
    }

    const nome = nomeValido(body?.nome);
    const whatsapp = whatsappValido(body?.whatsapp);
    if (!nome || !whatsapp) {
      return Response.json({ error: 'Invalid contact data', code: 'invalid_contact' }, { status: 400 });
    }

    const faixasAtuais = await faixasGuiaTecnicoZR(base44, user.id, agora);
    if (faixasAtuais.some((item: any) => item.faixa === 'full')) {
      return Response.json({
        success: true,
        already_full: true,
        faixa: 'full',
        vence_em: faixasAtuais.find((item: any) => item.faixa === 'full')?.vence_em ?? null,
      });
    }

    const anteriores = await base44.asServiceRole.entities.TesteLancamentoGuiaZR.filter({
      user_id: user.id,
    });
    if ((anteriores || []).length > 0) {
      return Response.json(
        { error: 'Campaign trial already used', code: 'campaign_trial_already_used' },
        { status: 409 },
      );
    }

    const fim = new Date(agoraMs + CINCO_DIAS_MS);
    const acesso = await base44.asServiceRole.entities.TesteLancamentoGuiaZR.create({
      user_id: user.id,
      nome,
      whatsapp,
      consentimento_em: agora.toISOString(),
      origem: ORIGEM,
      status: 'ativo',
      inicio_em: agora.toISOString(),
      fim_em: fim.toISOString(),
    });

    return Response.json({
      success: true,
      acesso_id: acesso.id,
      faixa: 'teste-lancamento',
      inicio_em: agora.toISOString(),
      vence_em: fim.toISOString(),
      dias: 5,
    });
  } catch (error) {
    console.error('ativarTesteLancamentoZR', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
