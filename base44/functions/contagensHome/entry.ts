import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [receitas, ingredientes, cardapiosPeriodo, eventos] = await Promise.all([
      base44.entities.Receita.list("-updated_date", 5000),
      base44.entities.Ingrediente.list("-updated_date", 5000),
      base44.entities.CardapioPeriodo.list("-created_date", 5000),
      base44.entities.Planejamento.list("-created_date", 5000),
    ]);

    // O indicador público representa o catálogo compartilhado. Cópias pessoais
    // não aumentam este total, pois substituem a versão-base apenas para o dono.
    const receitasCatalogo = receitas.filter((receita) => receita.is_base === true);

    const ha30Dias = new Date();
    ha30Dias.setDate(ha30Dias.getDate() - 30);
    const receitasAtualizadas30d = receitasCatalogo.filter(
      (receita) => receita.updated_date && new Date(receita.updated_date) >= ha30Dias,
    ).length;

    const resumirReceita = (receita) => ({
      id: receita.id,
      nome: receita.nome,
      categorias: receita.categorias || [],
      foto_url: receita.foto_url || '',
    });
    const receitasRecentes = receitasCatalogo.slice(0, 10).map(resumirReceita);
    const receitasDestaque = receitasCatalogo
      .filter((receita) => receita.destaque)
      .slice(0, 10)
      .map(resumirReceita);
    const receitasRevisarCount = receitasCatalogo.filter((receita) => receita.revisar).length;
    const minhasReceitas = receitas.filter((receita) =>
      receita.is_base !== true &&
      (receita.usuario_dono_id === user.id || (!receita.usuario_dono_id && receita.created_by_id === user.id))
    );

    return Response.json({
      totalReceitas: receitasCatalogo.length,
      totalIngredientes: ingredientes.length,
      totalCardapios: cardapiosPeriodo.length,
      minhasReceitas: minhasReceitas.length,
      // Usado pelo checklist de primeiros passos: RLS já limita a leitura aos
      // eventos do próprio usuário.
      meusEventos: eventos.length,
      receitasAtualizadas30d,
      receitasRecentes,
      receitasDestaque,
      receitasRevisarCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}