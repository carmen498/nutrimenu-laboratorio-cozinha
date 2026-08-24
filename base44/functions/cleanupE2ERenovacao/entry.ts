import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TARGET_EMAIL = 'carmen+e2e-renovacao-1787577694840-cc20c0@nutrimenu.com.br';

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const users = await base44.asServiceRole.entities.User.filter({ email: TARGET_EMAIL });
  let deleted = 0;
  for (const user of users || []) {
    await base44.asServiceRole.entities.User.delete(user.id);
    deleted += 1;
  }
  return Response.json({ ok: true, deleted });
}
