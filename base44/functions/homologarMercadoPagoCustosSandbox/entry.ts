export default async function(): Promise<Response> {
  return Response.json({ error: "sandbox_homologation_closed" }, { status: 410 });
}
