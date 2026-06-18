import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const receitas = await base44.asServiceRole.entities.Receita.list('-nome', 2000);
    const tags = await base44.asServiceRole.entities.Tag.list('nome', 200);
    const tagMap = {};
    tags.forEach(t => { tagMap[t.nome] = t; });

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

    // Processar em memória
    const toCreate = [];
    let receitasMarcadas = 0;

    for (const receita of receitas) {
      const ings = ingsByReceita[receita.id] || [];
      const ingredientesNomes = ings.map(i => (i.ingrediente_nome || '').toLowerCase());
      const todosNomes = ingredientesNomes.join(' ');
      const prepPreparos = ings.map(i => (i.pre_preparo || '').toLowerCase()).join(' ');
      const modoPrep = (receita.modo_preparo || '').toLowerCase();
      const modoPrepFull = modoPrep + ' ' + prepPreparos;
      const categoria = receita.categoria || '';

      const existingTagNames = new Set((tagsByReceita[receita.id] || []).map(rt => rt.tag_nome));
      const tagsToAdd = new Set();

      // --- DETECÇÃO DE CARNES ---
      const carnes = ['frango', 'peru', 'chester', 'carne', 'bovina', 'suína', 'porco', 'bacon', 'presunto',
        'peixe', 'salmão', 'tilápia', 'bacalhau', 'camarão', 'atum', 'sardinha',
        'linguiça', 'calabresa', 'mortadela', 'salame', 'lombo', 'picanha', 'alcatra', 'coxão',
        'filé mignon', 'costela', 'cupim', 'fraldinha', 'maminha', 'pato', 'cordeiro', 'cabrito'];
      const hasCarne = carnes.some(c => todosNomes.includes(c));

      // --- DETECÇÃO DE LATICÍNIOS ---
      const laticinios = ['leite', 'queijo', 'creme de leite', 'manteiga', 'iogurte', 'nata',
        'requeijão', 'cream cheese', 'ricota', 'mozarela', 'parmesão', 'gorgonzola', 'catupiry',
        'coalhada', 'doce de leite', 'leite condensado'];
      const hasLaticinio = laticinios.some(l => todosNomes.includes(l));
      const hasOvo = todosNomes.includes('ovo') || todosNomes.includes('ovos');

      // --- DETECÇÃO DE GLÚTEN ---
      const gluten = ['farinha de trigo', 'macarrão', 'pão', 'farinha de rosca', 'panco', 'farinha'];
      const hasGluten = gluten.some(g => todosNomes.includes(g));

      // --- DETECÇÃO DE MOLHOS ---
      const hasTomate = todosNomes.includes('tomate') || todosNomes.includes('molho de tomate') ||
        todosNomes.includes('extrato de tomate') || todosNomes.includes('passata');
      const hasCreme = todosNomes.includes('creme de leite') || todosNomes.includes('leite') || todosNomes.includes('manteiga');
      const hasShoyu = todosNomes.includes('shoyu') || todosNomes.includes('molho de soja');
      const hasCacau = todosNomes.includes('cacau') || todosNomes.includes('chocolate') ||
        todosNomes.includes('café') || todosNomes.includes('vinho tinto');

      // --- REGRAS DE TAGS ---

      // Molhos
      if (hasTomate && !existingTagNames.has('Molho vermelho')) tagsToAdd.add('Molho vermelho');
      if (!hasTomate && hasCreme && !existingTagNames.has('Molho branco')) tagsToAdd.add('Molho branco');
      if (hasShoyu || hasCacau) {
        if (!existingTagNames.has('Molho escuro')) tagsToAdd.add('Molho escuro');
      }

      // Ingrediente principal
      if (todosNomes.includes('carne moída') && !existingTagNames.has('Carne moída')) tagsToAdd.add('Carne moída');

      // Restrições
      if (!hasCarne && !existingTagNames.has('Vegetariana')) tagsToAdd.add('Vegetariana');
      if (!hasGluten && !existingTagNames.has('Sem glúten')) tagsToAdd.add('Sem glúten');
      if (!hasLaticinio && !existingTagNames.has('Sem lactose')) tagsToAdd.add('Sem lactose');

      const hasAcucar = todosNomes.includes('açúcar') || todosNomes.includes('acucar') ||
        todosNomes.includes('mel') || todosNomes.includes('adoçante');
      if (!hasAcucar && !existingTagNames.has('Sem açúcar')) tagsToAdd.add('Sem açúcar');
      if (!hasOvo && !existingTagNames.has('Sem ovos')) tagsToAdd.add('Sem ovos');
      if (!todosNomes.includes('pimenta') && !existingTagNames.has('Sem pimenta')) tagsToAdd.add('Sem pimenta');

      // Fit = sem açúcar + sem farinha de trigo + categoria fitness/funcional/low carb
      if (!hasAcucar && !hasGluten && 
          (categoria.includes('Fitness') || categoria.includes('Funcionais') || categoria.includes('Low Carb')) &&
          !existingTagNames.has('Fit')) {
        tagsToAdd.add('Fit');
      }

      // Para diabéticos = sem açúcar + sem farinha de trigo
      if (!hasAcucar && !hasGluten && !existingTagNames.has('Para diabéticos')) {
        tagsToAdd.add('Para diabéticos');
      }

      // Vegana (categoria)
      if (categoria.includes('Veganas') && !existingTagNames.has('Vegana')) tagsToAdd.add('Vegana');
      if (categoria.includes('Low Carb') && !existingTagNames.has('Low carb')) tagsToAdd.add('Low carb');

      // Método de cocção
      if (modoPrepFull.includes('forno') && !existingTagNames.has('Forno')) tagsToAdd.add('Forno');
      if (modoPrepFull.includes('grelh') && !existingTagNames.has('Grelhado')) tagsToAdd.add('Grelhado');
      if ((modoPrepFull.includes('cozinhar') || modoPrepFull.includes('cozido')) &&
          !modoPrepFull.includes('forno') && !modoPrepFull.includes('grelh') &&
          !existingTagNames.has('Cozido')) {
        tagsToAdd.add('Cozido');
      }

      // Outras categorias
      if (categoria.includes('Fitness') && !existingTagNames.has('Fitness')) tagsToAdd.add('Fitness');

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

    // Bulk create em lotes com pausa
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