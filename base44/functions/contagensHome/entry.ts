import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [receitas, ingredientes, cardapios, minhasReceitas] = await Promise.all([
      base44.entities.Receita.list("-updated_date", 5000),
      base44.entities.Ingrediente.list("-updated_date", 5000),
      base44.entities.Cardapio.list("-updated_date", 5000),
      base44.entities.Receita.filter({ usuario_dono_id: user.id }, "-updated_date", 5000),
    ]);

    const ha30Dias = new Date();
    ha30Dias.setDate(ha30Dias.getDate() - 30);
    const receitasAtualizadas30d = receitas.filter(
      (receita) => receita.updated_date && new Date(receita.updated_date) >= ha30Dias,
    ).length;

    return Response.json({
      totalReceitas: receitas.length,
      totalIngredientes: ingredientes.length,
      totalCardapios: cardapios.length,
      minhasReceitas: minhasReceitas.length,
      receitasAtualizadas30d,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}