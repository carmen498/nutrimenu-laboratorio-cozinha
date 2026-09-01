import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [receitas, ingredientes, cardapiosPeriodo] = await Promise.all([
      base44.entities.Receita.list("-updated_date", 5000),
      base44.entities.Ingrediente.list("-updated_date", 5000),
      base44.entities.CardapioPeriodo.list("-created_date", 5000),
    ]);

    const ha30Dias = new Date();
    ha30Dias.setDate(ha30Dias.getDate() - 30);
    const receitasAtualizadas30d = receitas.filter(
      (receita) => receita.updated_date && new Date(receita.updated_date) >= ha30Dias,
    ).length;

    const resumirReceita = (receita) => ({
      id: receita.id,
      nome: receita.nome,
      categorias: receita.categorias || [],
      foto_url: receita.foto_url || '',
    });
    const receitasRecentes = receitas.slice(0, 10).map(resumirReceita);
    const receitasDestaque = receitas
      .filter((receita) => receita.destaque)
      .slice(0, 10)
      .map(resumirReceita);
    const receitasRevisarCount = receitas.filter((receita) => receita.revisar).length;
    const minhasReceitas = receitas.filter((receita) =>
      receita.is_base !== true &&
      (receita.usuario_dono_id === user.id || (!receita.usuario_dono_id && receita.created_by_id === user.id))
    );

    return Response.json({
      totalReceitas: receitas.length,
      totalIngredientes: ingredientes.length,
      totalCardapios: cardapiosPeriodo.length,
      minhasReceitas: minhasReceitas.length,
      receitasAtualizadas30d,
      receitasRecentes,
      receitasDestaque,
      receitasRevisarCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}