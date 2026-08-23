// Alias legado da Fase 10.2 desativado após auditoria de segurança em 23/08/2026.
// Mantido como tombstone para impedir chamadas a uma rota histórica.
export default async function (): Promise<Response> {
  return Response.json({ error: "gone" }, { status: 410 });
}
