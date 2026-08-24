import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
const TARGET = 'carmen+e2e-renovacao-1787578615255-0a4c06@nutrimenu.com.br';
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const users = await base44.asServiceRole.entities.User.filter({ email: TARGET });
  let deleted = 0;
  for (const user of users || []) { await base44.asServiceRole.entities.User.delete(user.id); deleted++; }
  return Response.json({ ok: true, deleted });
}
