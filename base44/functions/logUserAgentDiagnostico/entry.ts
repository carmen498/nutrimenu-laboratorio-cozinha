// Diagnóstico temporário desativado por segurança.
// Esta função não registra mais URL, user-agent ou qualquer dado de requisição.
// Mantida temporariamente apenas para evitar referências quebradas durante deploy.

export default async function(): Promise<Response> {
  return Response.json(
    { error: 'Endpoint de diagnóstico desativado.' },
    { status: 410 }
  );
}
