export default async function(): Promise<Response> {
  return Response.json({ error: "sandbox_webhook_homologation_closed" }, { status: 410 });
}
