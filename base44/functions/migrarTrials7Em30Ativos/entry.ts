export default async function(): Promise<Response> {
  return Response.json({ error: "trial_migration_closed" }, { status: 410 });
}
