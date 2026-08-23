import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PREFIXO = 'rls-homolog-20260823-a93f7c2e';
const CHAVE = 'K7vF5xQm3Rz8Ln2Pj6Ys4Ht9';

const ENTIDADES = [
  'IngredienteReceita', 'ReceitaTag', 'InsumoReceita', 'IngredienteEsquecidoReceita',
  'CardapioReceita', 'CardapioInsumo', 'CardapioTag',
  'ListaCompras', 'PerCapitaUsuario', 'Planejamento', 'Cardapio', 'Receita',
];

export default async function(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  if (body?.cleanup_key !== CHAVE) return new Response(null, { status: 404 });

  const base44 = createClientFromRequest(req);
  const service = base44.asServiceRole;
  const todosUsuarios = await service.entities.User.list('-created_date', 500);
  const usuariosTeste = todosUsuarios.filter((u: any) => String(u.email || '').startsWith(PREFIXO));
  const ids = new Set(usuariosTeste.map((u: any) => u.id));
  let registrosExcluidos = 0;

  for (const entidade of ENTIDADES) {
    const rows = await service.entities[entidade].list('-created_date', 500);
    for (const row of rows) {
      if (ids.has(row.usuario_dono_id) || ids.has(row.created_by_id)) {
        await service.entities[entidade].delete(row.id);
        registrosExcluidos++;
      }
    }
  }

  for (const u of usuariosTeste) await service.entities.User.delete(u.id);
  return Response.json({ success: true, users_deleted: usuariosTeste.length, records_deleted: registrosExcluidos });
}
