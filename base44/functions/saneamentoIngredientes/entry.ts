import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const normalize = (s) => {
      if (!s) return "";
      return s.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const allIngredientes = await base44.asServiceRole.entities.Ingrediente.list("nome", 2000);

    const ingByNormName = {};
    allIngredientes.forEach(ing => {
      const norm = normalize(ing.nome);
      if (!norm) return;
      if (!ingByNormName[norm] || ((ing.preco_por_g_rs || 0) > 0 && !(ingByNormName[norm].preco_por_g_rs > 0))) {
        ingByNormName[norm] = ing;
      }
    });

    const ingIdSet = new Set(allIngredientes.map(i => i.id));
    const ingMap = {};
    allIngredientes.forEach(i => { ingMap[i.id] = i; });

    const allItems = await base44.asServiceRole.entities.IngredienteReceita.filter(
      { tipo: "ingrediente" }, "ordem", 5000
    );

    const broken = allItems.filter(item =>
      !item.ingrediente_id || !ingIdSet.has(item.ingrediente_id)
    );

    let fixed = 0;
    const notFound = [];
    const updates = [];

    for (const item of broken) {
      const nome = item.ingrediente_nome || "";
      const norm = normalize(nome);
      if (!norm) {
        notFound.push({ id: item.id, nome: nome, receita_id: item.receita_id, reason: "empty name" });
        continue;
      }
      const match = ingByNormName[norm];
      if (match) {
        updates.push({ id: item.id, ingrediente_id: match.id });
        fixed++;
        continue;
      }
      if (norm.length >= 4) {
        let partialMatch = null;
        for (const [ingNorm, ing] of Object.entries(ingByNormName)) {
          if (ingNorm.includes(norm) || norm.includes(ingNorm)) {
            partialMatch = ing;
            break;
          }
        }
        if (partialMatch) {
          updates.push({ id: item.id, ingrediente_id: partialMatch.id });
          fixed++;
          continue;
        }
      }
      notFound.push({ id: item.id, nome: nome, receita_id: item.receita_id, reason: "no match" });
    }

    let mismatchFixed = 0;
    const mismatchNotFound = [];
    for (const item of allItems) {
      if (!item.ingrediente_id || !ingIdSet.has(item.ingrediente_id)) continue;
      if (!item.ingrediente_nome) continue;
      const ing = ingMap[item.ingrediente_id];
      if (!ing) continue;
      const lineNorm = normalize(item.ingrediente_nome);
      const ingNorm = normalize(ing.nome);
      if (lineNorm === ingNorm) continue;
      const correctIng = ingByNormName[lineNorm];
      if (correctIng && correctIng.id !== item.ingrediente_id) {
        updates.push({ id: item.id, ingrediente_id: correctIng.id });
        mismatchFixed++;
      } else if (!correctIng) {
        mismatchNotFound.push({ id: item.id, nome: item.ingrediente_nome, ingrediente_id_atual: item.ingrediente_id, nome_cadastrado: ing.nome, receita_id: item.receita_id });
      }
    }

    let receitasInvalidadas = 0;
    if (updates.length > 0) {
      for (let i = 0; i < updates.length; i += 500) {
        await base44.asServiceRole.entities.IngredienteReceita.bulkUpdate(updates.slice(i, i + 500));
      }
      const itemMap = new Map(allItems.map(item => [item.id, item]));
      const receitaIds = [...new Set(updates.map(update => itemMap.get(update.id)?.receita_id).filter(Boolean))];
      const invalidacao = await invalidarCustosPorDependencias({
        entities: base44.asServiceRole.entities,
        receitaIds,
        motivo: 'saneamento_referencia_ingrediente',
        origem: 'saneamento_ingredientes',
      });
      receitasInvalidadas = invalidacao.receitas_invalidadas || 0;
    }

    return Response.json({
      total_lines: allItems.length,
      broken_lines: broken.length,
      fixed: fixed,
      mismatch_fixed: mismatchFixed,
      receitas_invalidadas: receitasInvalidadas,
      not_found_count: notFound.length,
      not_found: notFound,
      mismatch_not_found: mismatchNotFound,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});