import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const USER_ID = '6a8c4db1844fdf64672f1f5c';
const EMAIL = 'nutrimenu-e2e-mt7av3joda2596@emalupe.com';

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const encontrados = await base44.asServiceRole.entities.User.filter({ email: EMAIL });
  const user = (encontrados || []).find((u: any) => u.id === USER_ID);
  if (!user) return Response.json({ ok: false, error: 'synthetic_user_not_found' }, { status: 404 });
  await base44.asServiceRole.entities.User.update(USER_ID, {
    plano_atual: 'anual',
    status_assinatura: 'ativo',
    data_inicio: '2025-09-24',
    data_expiracao: '2026-09-23',
    ciclo_renovacao: 1,
    pagamento_ativo_id: '',
    termos_aceitos_em: new Date().toISOString(),
    termos_versao_aceita: 'Termos de Uso v.18/08/2026',
  });
  const atualizado = await base44.asServiceRole.entities.User.get(USER_ID);
  return Response.json({ ok: true, user: { id: atualizado.id, email: atualizado.email, plano_atual: atualizado.plano_atual, status_assinatura: atualizado.status_assinatura, data_expiracao: atualizado.data_expiracao, ciclo_renovacao: atualizado.ciclo_renovacao, termos_versao_aceita: atualizado.termos_versao_aceita } });
}
