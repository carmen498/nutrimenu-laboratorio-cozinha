import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Invocado diretamente pelo frontend (não mais por automação de entidade), logo
// após uma alteração real feita pelo usuário autenticado. Isso garante que o
// registro seja criado com o token do próprio usuário (não do service role),
// para que created_by_id reflita o autor real da alteração — necessário para
// o RLS "cada usuário só vê seus próprios registros" funcionar corretamente.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { receita_id, receita_nome, campos_alterados } = payload || {};

    if (!receita_id || !Array.isArray(campos_alterados) || campos_alterados.length === 0) {
      return Response.json({ skipped: true });
    }

    // Cliente do próprio usuário (não asServiceRole) — created_by_id fica com o usuário real.
    await base44.entities.HistoricoAlteracaoReceita.create({
      receita_id,
      receita_nome: receita_nome || "",
      usuario_nome: user.full_name || user.email || "",
      campos_alterados,
    });

    return Response.json({ logged: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}