// Homologação do checkout do Laboratório de Custos concluída em 30/08/2026.
// Endpoint temporário neutralizado: não monta payload, não assina nada, não faz POST.
// Mantido apenas para que chamadas antigas recebam 410 em vez de erro de rota.
export default async function(): Promise<Response> {
  return Response.json({ error: "custos_sandbox_homologation_closed" }, { status: 410 });
}