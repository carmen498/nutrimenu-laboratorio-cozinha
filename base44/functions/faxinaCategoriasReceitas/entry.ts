import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Faxina de categorias de RECEITAS (idempotente — não altera nada além do campo categoria):
// - "Petiscos" é absorvida por "Entradas" (sem duplicidade)
// - "Ovos" só seria excluída se tivesse 0 receitas — como há receitas, permanece (listada no relatório)
// - Plurais: Acompanhamento→Acompanhamentos, Arroz e Risoto→Arroz e Risotos, Prato Principal→Pratos Principais
// NUNCA toca em categorias de Ingrediente, nem em qualquer outro campo de Receita.
// Usa bulkUpdate (lotes de até 500) para evitar rate limit em bases grandes.

const RENAME_MAP = {
  "Petiscos": "Entradas",
  "Acompanhamento": "Acompanhamentos",
  "Arroz e Risoto": "Arroz e Risotos",
  "Prato Principal": "Pratos Principais",
};

function migrarCategoriasArray(categorias) {
  if (!Array.isArray(categorias) || categorias.length === 0) {
    return { novas: categorias, mudou: false, origens: [] };
  }
  const novas = [];
  const origens = [];
  for (const c of categorias) {
    const nova = RENAME_MAP[c] || c;
    if (nova !== c) origens.push(c);
    if (!novas.includes(nova)) novas.push(nova);
  }
  const mudou = novas.length !== categorias.length || novas.some((c, i) => c !== categorias[i]);
  return { novas, mudou, origens };
}

async function bulkUpdateChunks(entity, updates) {
  for (let i = 0; i < updates.length; i += 500) {
    await entity.bulkUpdate(updates.slice(i, i + 500));
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 403 });

    const contagemRegras = {}; // "antes||depois" -> count
    const receitasComOvos = [];
    let totalReceitas = 0;

    // 1) Migrar Receita.categorias
    const receitaUpdates = [];
    let page = 0;
    const pageSize = 200;
    while (true) {
      const receitas = await base44.asServiceRole.entities.Receita.list("", pageSize, page * pageSize);
      if (receitas.length === 0) break;
      totalReceitas += receitas.length;

      for (const r of receitas) {
        if (Array.isArray(r.categorias) && r.categorias.includes("Ovos")) {
          receitasComOvos.push({ id: r.id, nome: r.nome });
        }
        const { novas, mudou, origens } = migrarCategoriasArray(r.categorias);
        if (mudou) {
          receitaUpdates.push({ id: r.id, categorias: novas });
          for (const origem of origens) {
            const depois = RENAME_MAP[origem];
            const key = `${origem}||${depois}`;
            contagemRegras[key] = (contagemRegras[key] || 0) + 1;
          }
        }
      }
      page++;
    }
    await bulkUpdateChunks(base44.asServiceRole.entities.Receita, receitaUpdates);

    // 2) Migrar cache CardapioReceita.receita_categoria (string única, mesmo mapeamento)
    const cardapioUpdates = [];
    page = 0;
    while (true) {
      const crs = await base44.asServiceRole.entities.CardapioReceita.list("", pageSize, page * pageSize);
      if (crs.length === 0) break;
      for (const cr of crs) {
        if (cr.receita_categoria && RENAME_MAP[cr.receita_categoria]) {
          cardapioUpdates.push({ id: cr.id, receita_categoria: RENAME_MAP[cr.receita_categoria] });
        }
      }
      page++;
    }
    await bulkUpdateChunks(base44.asServiceRole.entities.CardapioReceita, cardapioUpdates);

    // 3) Mapeamento de seções do Evento (Planejamento.cardapio_config): "Petiscos" → "Entradas"
    const planejamentoUpdates = [];
    page = 0;
    while (true) {
      const planos = await base44.asServiceRole.entities.Planejamento.list("", pageSize, page * pageSize);
      if (planos.length === 0) break;

      for (const p of planos) {
        if (!p.cardapio_config) continue;
        let config;
        try {
          config = typeof p.cardapio_config === "string" ? JSON.parse(p.cardapio_config) : p.cardapio_config;
        } catch {
          continue;
        }
        if (!config || !Array.isArray(config.grupos)) continue;

        const idxPetiscos = config.grupos.findIndex((g) => g.nome === "Petiscos");
        if (idxPetiscos === -1) continue;

        const idxEntradas = config.grupos.findIndex((g) => g.nome === "Entradas");
        const grupoPetiscos = config.grupos[idxPetiscos];

        if (idxEntradas !== -1 && idxEntradas !== idxPetiscos) {
          // Mescla itens de Petiscos dentro de Entradas — nenhum prato sai de seção
          config.grupos[idxEntradas] = {
            ...config.grupos[idxEntradas],
            itens: [...(config.grupos[idxEntradas].itens || []), ...(grupoPetiscos.itens || [])],
          };
          config.grupos.splice(idxPetiscos, 1);
        } else {
          config.grupos[idxPetiscos] = { ...grupoPetiscos, nome: "Entradas" };
        }

        const novoConfigStr = typeof p.cardapio_config === "string" ? JSON.stringify(config) : config;
        planejamentoUpdates.push({ id: p.id, cardapio_config: novoConfigStr });
      }
      page++;
    }
    await bulkUpdateChunks(base44.asServiceRole.entities.Planejamento, planejamentoUpdates);

    const regras = Object.entries(contagemRegras).map(([key, count]) => {
      const [categoria_antes, categoria_depois] = key.split("||");
      return { categoria_antes, categoria_depois, receitas_migradas: count };
    });

    const relatorio = await base44.asServiceRole.entities.RelatorioFaxinaCategoriasReceitas.create({
      data_execucao: new Date().toISOString(),
      regras,
      receitas_com_ovos: receitasComOvos,
      total_receitas_processadas: totalReceitas,
      total_receitas_alteradas: receitaUpdates.length,
      total_cardapio_receita_alteradas: cardapioUpdates.length,
      total_secoes_evento_renomeadas: planejamentoUpdates.length,
    });

    return Response.json({ relatorio });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}