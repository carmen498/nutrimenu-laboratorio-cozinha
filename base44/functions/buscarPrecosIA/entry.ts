import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BATCH_SIZE = 25;

async function buscarLote(base44, ingredientes, startIdx) {
  const ingNames = ingredientes.map((ing, i) => `${startIdx + i + 1}. ${ing.nome}`).join('\n');

  const prompt = `Você é um especialista em precificação de alimentos no Brasil. Pesquise os preços médios nacionais atuais (junho de 2026) para os seguintes ingredientes no mercado brasileiro.

Para cada ingrediente, retorne:
- preco_por_kg: preço médio por kg em R$ (número)
- encontrado: true/false (se conseguiu localizar o preço)
- observacao: breve nota sobre a fonte ou tendência (ex: "CEASA-SP, estável" ou "alta de 10% no último mês")

Ingredientes a pesquisar:
${ingNames}

IMPORTANTE:
- Preços em REAIS (R$) por KG
- Considere preços de atacado/mercado médio brasileiro
- Se não encontrar o preço exato, estime com base em produtos similares
- Para itens vendidos por unidade (ex: ovos), converta para preço por kg
- Retorne EXATAMENTE ${ingredientes.length} resultados, um para cada ingrediente, na mesma ordem`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        resultados: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              preco_por_kg: { type: 'number', description: 'Preço médio por kg em R$' },
              encontrado: { type: 'boolean', description: 'Se o preço foi localizado' },
              observacao: { type: 'string', description: 'Nota sobre a fonte ou tendência' }
            },
            required: ['preco_por_kg', 'encontrado']
          }
        }
      },
      required: ['resultados']
    }
  });

  return result.resultados || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ingredientes = body.ingredientes || [];

    if (!ingredientes.length) {
      return Response.json({ error: 'Nenhum ingrediente informado' }, { status: 400 });
    }

    // Process in batches to avoid token limits
    const todosResultados = [];
    for (let i = 0; i < ingredientes.length; i += BATCH_SIZE) {
      const lote = ingredientes.slice(i, i + BATCH_SIZE);
      const resultadosLote = await buscarLote(base44, lote, i);
      todosResultados.push(...resultadosLote);
    }

    const response = ingredientes.map((ing, i) => {
      const r = todosResultados[i];
      if (!r) {
        return {
          id: ing.id,
          nome: ing.nome,
          preco_atual: ing.preco_por_g_rs ? parseFloat((ing.preco_por_g_rs * 1000).toFixed(3)) : 0,
          preco_sugerido_por_kg: null,
          preco_sugerido_por_g: null,
          encontrado: false,
          observacao: 'Não localizado pela IA'
        };
      }
      return {
        id: ing.id,
        nome: ing.nome,
        preco_atual: ing.preco_por_g_rs ? parseFloat((ing.preco_por_g_rs * 1000).toFixed(3)) : 0,
        preco_sugerido_por_kg: r.encontrado !== false ? parseFloat((r.preco_por_kg || 0).toFixed(2)) : null,
        preco_sugerido_por_g: r.encontrado !== false && r.preco_por_kg ? parseFloat((r.preco_por_kg / 1000).toFixed(5)) : null,
        encontrado: r.encontrado !== false,
        observacao: r.observacao || ''
      };
    });

    return Response.json({ resultados: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});