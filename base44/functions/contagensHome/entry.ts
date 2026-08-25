import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Receitas: lista ordenada por -updated_date para obter contagem total
    // e contagem de atualizadas nos últimos 30 dias em uma única query.
    // Como está ordenado por updated_date desc, podemos parar de contar assim
    // que encontramos um registro mais antigo que 30 dias.
    const receitas = await base44.entities.Receita.list("-updated_date", 5000);
    const ha30Dias = new Date();
    ha30Dias.setDate(ha30Dias.getDate() - 30);

    let receitasAtualizadas30d = 0;
    for (const r of receitas) {
      if (r.updated_date && new Date(r.updated_date) >= ha30Dias) {
        receitasAtualizadas30d++;
      } else {
        break;
      }
    }

    const ingredientes = await base44.entities.Ingrediente.list("-updated_date", 5000);
    const cardapios = await base44.entities.Cardapio.list("-updated_date", 5000);

    return Response.json({
      totalReceitas: receitas.length,
      totalIngredientes: ingredientes.length,
      totalCardapios: cardapios.length,
      receitasAtualizadas30d,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}