import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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

    // 1. Get all ingredients
    const allIngredientes = await base44.asServiceRole.entities.Ingrediente.list("nome", 2000);

    // Build normalized name → ingredient map (prefer one with valid price on conflicts)
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

    // 2. Get all IngredienteReceita with tipo="ingrediente"
    const allItems = await base44.asServiceRole.entities.IngredienteReceita.filter(
      { tipo: "ingrediente" }, "ordem", 5000
    );

    // 3. Find lines with missing or invalid ingrediente_id
    const broken = allItems.filter(item =>
      !item.ingrediente_id || !ingIdSet.has(item.ingrediente_id)
    );

    // 4. Re-link by name
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
      // Partial match: line name contained in ingredient name or vice versa (min 4 chars)
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

    // 5. Second pass: fix mismatched lines (valid ingrediente_id but name doesn't match)
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
      // Mismatch detected — try to find correct ingredient by name
      const correctIng = ingByNormName[lineNorm];
      if (correctIng && correctIng.id !== item.ingrediente_id) {
        updates.push({ id: item.id, ingrediente_id: correctIng.id });
        mismatchFixed++;
      } else if (!correctIng) {
        mismatchNotFound.push({ id: item.id, nome: item.ingrediente_nome, ingrediente_id_atual: item.ingrediente_id, nome_cadastrado: ing.nome, receita_id: item.receita_id });
      }
    }

    // 6. Bulk update in batches of 500
    if (updates.length > 0) {
      for (let i = 0; i < updates.length; i += 500) {
        await base44.asServiceRole.entities.IngredienteReceita.bulkUpdate(updates.slice(i, i + 500));
      }
    }

    return Response.json({
      total_lines: allItems.length,
      broken_lines: broken.length,
      fixed: fixed,
      mismatch_fixed: mismatchFixed,
      not_found_count: notFound.length,
      not_found: notFound,
      mismatch_not_found: mismatchNotFound,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});