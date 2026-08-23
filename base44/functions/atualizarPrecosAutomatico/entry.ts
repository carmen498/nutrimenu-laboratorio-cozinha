import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { protegerExecucaoAgendada } from "../../shared/protecoesAutomacao.ts";

const CATS_VOLATEIS = [
  "Carnes e Ovos", "LATICÍNIOS", "Frutas",
  "Óleos e Gorduras", "Peixes e Frutos do Mar", "Verduras e Hortaliças"
];

const BATCH_SIZE = 25;

async function buscarLote(base44, ingredientes, startIdx) {
  const ingNames = ingredientes.map((ing, i) => `${startIdx + i + 1}. ${ing.nome} — categoria: ${ing.categoria}`).join('\n');

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

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
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
  const inicio = Date.now();
  let totalProcessado = 0;
  let totalAtualizado = 0;
  let totalMantido = 0;
  const variacoes = []; // { nome, variacao }
  const categoriasSet = new Set();

  try {
    const base44 = createClientFromRequest(req);

    // Check if auto-update is enabled
    const configs = await base44.asServiceRole.entities.ConfiguracaoSistema.filter({ chave: 'auto_update_prices' });
    if (configs[0] && configs[0].valor === 'false') {
      return Response.json({ message: "Atualização automática pausada pelo usuário." });
    }

    // Agenda oficial: segunda-feira às 03:00 em America/Sao_Paulo. Como toda
    // function Base44 também possui endpoint HTTP, chamadas sem usuário só podem
    // executar na janela de segunda 02:45–03:15 e no máximo uma vez a cada 6 dias.
    const gate = await protegerExecucaoAgendada(base44, req, {
      chave: "atualizarPrecosAutomatico",
      cooldownHoras: 144,
      janela: { diasSemana: [1], inicioMinuto: 2 * 60 + 45, fimMinuto: 3 * 60 + 15 },
    });
    if (gate.response) return gate.response;

    // Buscar todos os ingredientes das categorias voláteis com preço cadastrado
    const allIngs = await base44.asServiceRole.entities.Ingrediente.list("-nome", 1000);
    const volatiles = allIngs.filter(i =>
      CATS_VOLATEIS.includes(i.categoria) && i.preco_embalagem_rs > 0
    );

    if (!volatiles.length) {
      return Response.json({ message: "Nenhum ingrediente volátil com preço cadastrado." });
    }

    totalProcessado = volatiles.length;
    volatiles.forEach(i => categoriasSet.add(i.categoria));

    // Processar em lotes
    const dados = volatiles.map(i => ({
      id: i.id, nome: i.nome, categoria: i.categoria,
      preco_por_g_rs: i.preco_por_g_rs, preco_embalagem_rs: i.preco_embalagem_rs,
      peso_embalagem_g: i.peso_embalagem_g, historico_precos: i.historico_precos || []
    }));

    const todosResultados = [];
    for (let i = 0; i < dados.length; i += BATCH_SIZE) {
      const lote = dados.slice(i, i + BATCH_SIZE);
      try {
        const resultadosLote = await buscarLote(base44, lote, i);
        todosResultados.push(...resultadosLote);
      } catch (e) {
        lote.forEach(ing => todosResultados.push(null));
      }
      if (i + BATCH_SIZE < dados.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Comparar e atualizar
    const now = new Date().toISOString();
    for (let i = 0; i < dados.length; i++) {
      const ing = dados[i];
      const r = todosResultados[i];

      if (!r || !r.encontrado || !r.preco_por_kg) continue;

      const precoAtualPorKg = ing.preco_por_g_rs ? parseFloat((ing.preco_por_g_rs * 1000).toFixed(2)) : 0;
      const precoSugeridoPorKg = parseFloat(r.preco_por_kg.toFixed(2));

      if (precoAtualPorKg <= 0) continue;

      const variacao = parseFloat((((precoSugeridoPorKg - precoAtualPorKg) / precoAtualPorKg) * 100).toFixed(1));
      variacoes.push({ nome: ing.nome, variacao });

      // Só atualiza se variação > 5%
      if (Math.abs(variacao) <= 5) {
        totalMantido++;
        continue;
      }

      try {
        const precoSugeridoPorG = parseFloat((precoSugeridoPorKg / 1000).toFixed(5));
        const precoEmbalagem = parseFloat((precoSugeridoPorG * (ing.peso_embalagem_g || 1000)).toFixed(2));

        const historico = [...ing.historico_precos];
        historico.unshift({
          data: now,
          preco_por_kg: precoSugeridoPorKg,
          variacao_percentual: variacao,
          fonte: "IA web automático",
          fornecedor: ing.fornecedor || ""
        });

        await base44.asServiceRole.entities.Ingrediente.update(ing.id, {
          preco_embalagem_rs: precoEmbalagem,
          preco_por_g_rs: precoSugeridoPorG,
          preco_atualizado_em: now,
          fonte_preco: "IA web",
          preco_medio_nacional: precoSugeridoPorKg,
          variacao_percentual: variacao,
          historico_precos: historico
        });
        totalAtualizado++;
        await new Promise(r => setTimeout(r, 250));
      } catch (e) {
        // Skip on individual update error
      }
    }

    // Top 5 altas e baixas
    const sorted = [...variacoes].sort((a, b) => b.variacao - a.variacao);
    const maioresAltas = sorted.filter(v => v.variacao > 0).slice(0, 5);
    const maioresBaixas = sorted.filter(v => v.variacao < 0).sort((a, b) => a.variacao - b.variacao).slice(0, 5);

    const duracao = Math.round((Date.now() - inicio) / 1000);

    // Criar log
    const categoriasArray = [...categoriasSet];
    await base44.asServiceRole.entities.LogAtualizacaoPrecos.create({
      data_execucao: now,
      tipo: "automático",
      total_processado: totalProcessado,
      total_atualizado: totalAtualizado,
      total_mantido: totalMantido,
      categorias_processadas: categoriasArray,
      duracao_segundos: duracao,
      maiores_altas: maioresAltas,
      maiores_baixas: maioresBaixas
    });

    // Enviar email para admins
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      const dataFormatada = new Date().toLocaleDateString("pt-BR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });

      const altasStr = maioresAltas.length > 0
        ? maioresAltas.map(v => `· ${v.nome} +${v.variacao}%`).join('\n')
        : "· Nenhuma";

      const baixasStr = maioresBaixas.length > 0
        ? maioresBaixas.map(v => `· ${v.nome} ${v.variacao}%`).join('\n')
        : "· Nenhuma";

      const emailBody = `Atualização automática concluída em ${dataFormatada} às 03:00h

✅ ${totalAtualizado} ingredientes atualizados
➡️ ${totalMantido} ingredientes mantidos (variação < 5%)

Maiores altas:
${altasStr}

Maiores baixas:
${baixasStr}

Categorias processadas: ${categoriasArray.join(', ')}

Acesse o app para revisar.`;

      for (const admin of admins) {
        if (admin.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `Laboratório de Cozinha · Atualização automática de preços — ${dataFormatada}`,
              body: emailBody,
              from_name: "Laboratório de Cozinha"
            });
          } catch (e) {
            // Skip email errors
          }
        }
      }
    } catch (e) {
      // Skip email errors
    }

    return Response.json({
      success: true,
      total_processado: totalProcessado,
      total_atualizado: totalAtualizado,
      total_mantido: totalMantido,
      duracao_segundos: duracao,
      categorias: categoriasArray
    });

  } catch (error) {
    // Tentar criar log de erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.LogAtualizacaoPrecos.create({
        data_execucao: new Date().toISOString(),
        tipo: "automático",
        total_processado: totalProcessado,
        total_atualizado: totalAtualizado,
        total_mantido: totalMantido,
        categorias_processadas: [...categoriasSet],
        duracao_segundos: Math.round((Date.now() - inicio) / 1000)
      });
    } catch (e) {}

    return Response.json({ error: error.message }, { status: 500 });
  }
});