// Executor legado da Fase 10.2 desativado após auditoria global de segurança em 23/08/2026.
// Mantido como tombstone para impedir chamadas a uma rota histórica com service role.
Deno.serve(() => Response.json({ error: 'gone' }, { status: 410 }));