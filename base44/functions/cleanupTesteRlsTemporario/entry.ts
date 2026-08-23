// Homologação RLS concluída em 23/08/2026.
// Endpoint temporário neutralizado após exclusão das contas e dados de teste.
export default async function(): Promise<Response> {
  return Response.json({ error: 'gone' }, { status: 410 });
}
