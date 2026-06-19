import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Only these 4 tags are auto-generated. All other tags must be manual.
const AUTO_TAGS = ['Forno', 'Grelhado', 'Cozido', 'Congelável'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load all tags — only care about the 4 auto tags
    const tags = await base44.asServiceRole.entities.Tag.list('nome', 200);
    const tagMap = {};
    tags.forEach(t => { if (AUTO_TAGS.includes(t.nome)) tagMap[t.nome] = t; });

    if (Object.keys(tagMap).length === 0) {
      return Response.json({ success: true, receitas_marcadas: 0, tags_adicionadas: 0, total_receitas: 0 });
    }

    const receitas = await base44.asServiceRole.entities.Receita.list('-nome', 2000);

    // Paginate IngredienteReceita
    let allIngs = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.IngredienteReceita.list('', 1000, skip);
      if (batch.length === 0) break;
      allIngs = allIngs.concat(batch);
      skip += 1000;
      if (batch.length < 1000) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Paginate ReceitaTag
    let allRts = [];
    skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.ReceitaTag.list('', 1000, skip);
      if (batch.length === 0) break;
      allRts = allRts.concat(batch);
      skip += 1000;
      if (batch.length < 1000) break;
      await new Promise(r => setTimeout(r, 200));
    }

    const ingsByReceita = {};
    allIngs.forEach(ing => {
      if (!ingsByReceita[ing.receita_id]) ingsByReceita[ing.receita_id] = [];
      ingsByReceita[ing.receita_id].push(ing);
    });

    const tagsByReceita = {};
    allRts.forEach(rt => {
      if (!tagsByReceita[rt.receita_id]) tagsByReceita[rt.receita_id] = [];
      tagsByReceita[rt.receita_id].push(rt);
    });

    const toCreate = [];
    let receitasMarcadas = 0;

    for (const receita of receitas) {
      const ings = ingsByReceita[receita.id] || [];
      const todosNomes = ings.map(i => (i.ingrediente_nome || '').toLowerCase()).join(' ');
      const modoPrep = (receita.modo_preparo || '').toLowerCase();
      const prepPreparos = ings.map(i => (i.pre_preparo || '').toLowerCase()).join(' ');
      const fullText = todosNomes + ' ' + modoPrep + ' ' + prepPreparos;

      const existingTagNames = new Set((tagsByReceita[receita.id] || []).map(rt => rt.tag_nome));
      const tagsToAdd = new Set();

      // --- FORNO ---
      const fornoKeywords = ['forno', 'assar', 'assado', 'assada', 'gratinar', 'gratinado', 'gratinada',
        'assadeira', 'tabuleiro', 'forno pré-aquecido', 'forno preaquecido'];
      if (!existingTagNames.has('Forno') && fornoKeywords.some(k => fullText.includes(k))) {
        tagsToAdd.add('Forno');
      }

      // --- GRELHADO ---
      const grelhadoKeywords = ['grelhar', 'grelhado', 'grelhada', 'grelha', 'churrasco',
        'churrasqueira', 'grelhador', 'grelhar na brasa', 'na grelha', 'brasa'];
      if (!existingTagNames.has('Grelhado') && grelhadoKeywords.some(k => fullText.includes(k))) {
        tagsToAdd.add('Grelhado');
      }

      // --- COZIDO ---
      const cozidoKeywords = ['cozinhar', 'cozido', 'cozida', 'ferver', 'fervura', 'cozimento',
        'panela de pressão', 'panela comum', 'fogão', 'panela', 'caldeirão', 'ensopado',
        'refogar', 'refogado', 'saltear', 'salteado', 'brasa', 'branquear'];
      // "brasa" also appears in grelhado, but "cozido" detection requires more generic cooking terms
      if (!existingTagNames.has('Cozido') && cozidoKeywords.some(k => fullText.includes(k))) {
        tagsToAdd.add('Cozido');
      }

      // --- CONGELÁVEL ---
      const congelavelIndicators = ['congelar', 'congelado', 'congelável', 'freezer', 'freezer por',
        'pode congelar', 'pode ser congelado', 'armazenar no freezer'];
      // Also check recipe names/categories that typically freeze well
      const categorias = (receita.categorias || []).map(c => c.toLowerCase());
      const congCategories = ['sopas e caldos', 'molhos e bases', 'massas', 'pães', 'salgadinhos'];
      const hasCongCategory = congCategories.some(c => categorias.includes(c));
      const hasCongKeyword = congelavelIndicators.some(k => fullText.includes(k));

      if (!existingTagNames.has('Congelável') && (hasCongKeyword || hasCongCategory)) {
        tagsToAdd.add('Congelável');
      }

      for (const tagNome of tagsToAdd) {
        const tag = tagMap[tagNome];
        if (!tag) continue;
        toCreate.push({
          receita_id: receita.id,
          tag_id: tag.id,
          tag_nome: tag.nome,
          tag_grupo: tag.grupo,
          tag_cor: tag.cor,
        });
      }
      if (tagsToAdd.size > 0) receitasMarcadas++;
    }

    // Bulk create in batches
    let totalTagsAdded = 0;
    for (let i = 0; i < toCreate.length; i += 50) {
      const batch = toCreate.slice(i, i + 50);
      await base44.asServiceRole.entities.ReceitaTag.bulkCreate(batch);
      totalTagsAdded += batch.length;
      if (i + 50 < toCreate.length) await new Promise(r => setTimeout(r, 800));
    }

    return Response.json({
      success: true,
      receitas_marcadas: receitasMarcadas,
      tags_adicionadas: totalTagsAdded,
      total_receitas: receitas.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});