import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 403 });
    }

    // Get all IngredienteReceita items missing medida_caseira
    let allItems = [];
    let skip = 0;
    const limit = 200;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.IngredienteReceita.list('-created_date', limit);
      const missing = batch.filter(
        item => item.tipo === 'ingrediente' && !item.medida_caseira && item.quantidade_por_porcao
      );
      allItems = allItems.concat(missing);
      skip += limit;
      hasMore = batch.length === limit;
    }

    if (allItems.length === 0) {
      return Response.json({ message: 'Nenhum item sem medida caseira encontrado', total: 0 });
    }

    // Get medidas for LLM context
    const medidas = await base44.asServiceRole.entities.MedidaCaseira.list('-nome', 200);
    const medidasLista = [...new Set(medidas.filter(m => !m.ingrediente_especifico).map(m => {
      const g = m.equivalencia_g || m.equivalencia_ml || 0;
      return `${m.nome}=${g}g`;
    }))];

    // Group items by recipe to reduce LLM calls
    const recipeGroups = {};
    for (const item of allItems) {
      if (!recipeGroups[item.receita_id]) recipeGroups[item.receita_id] = [];
      recipeGroups[item.receita_id].push(item);
    }

    const recipeIds = Object.keys(recipeGroups);
    let updated = 0;
    let failed = 0;

    console.log(`Processando ${recipeIds.length} receitas com ${allItems.length} ingredientes sem medida caseira`);

    for (const receitaId of recipeIds) {
      const items = recipeGroups[receitaId];
      const linhas = items.map(item =>
        `ID:${item.id} | ${item.ingrediente_nome || 'desconhecido'} | ${Math.round(item.quantidade_por_porcao * 100) / 100}g`
      );

      const prompt = `Converta cada ingrediente para a medida caseira mais natural.

Medidas disponíveis (gramas):
${medidasLista.join('\n')}

REGRAS:
- Escolha a medida que resulta no número mais próximo de um inteiro ou fração comum (1/2, 1/4, 1/3)
- Para quantidades muito pequenas (<2g), use "pitada" ou "a gosto"
- Para ovos, use "unidade"
- Para alho, use "dente de alho"
- Para números redondos em gramas (ex: 250g, 500g), mantenha em gramas
- Retorne APENAS objetos com {id, medida}

Ingredientes:
${linhas.join('\n')}`;

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              sugestoes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { id: { type: 'string' }, medida: { type: 'string' } },
                  required: ['id', 'medida']
                }
              }
            },
            required: ['sugestoes']
          }
        });

        for (const sug of (result.sugestoes || [])) {
          if (sug.medida && sug.id) {
            await base44.asServiceRole.entities.IngredienteReceita.update(sug.id, { medida_caseira: sug.medida });
            updated++;
          }
        }
      } catch (e) {
        console.error(`Erro na receita ${receitaId}:`, e.message);
        failed += items.length;
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    return Response.json({
      message: `Processado ${recipeIds.length} receitas`,
      total_ingredientes: allItems.length,
      atualizados: updated,
      falhas: failed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});