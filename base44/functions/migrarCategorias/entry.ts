import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 403 });

    const mappings = {
      "Carnes": "Carne Bovina",
      "Massas": "Massas, Pastelão e Quiches",
      "Pães": "Pães e Bolos",
      "Entrada": "Entradas",
      "Petisco": "Petiscos",
      "Molhos e Bases": "Molhos"
    };

    let page = 0;
    const pageSize = 50;
    let hasMore = true;
    let totalReceitas = 0;
    let updatedReceitas = 0;
    let updatedCardapio = 0;

    // Migrate Receita categorias
    while (hasMore) {
      const receitas = await base44.asServiceRole.entities.Receita.list("", pageSize, page * pageSize);
      if (receitas.length === 0) { hasMore = false; break; }
      totalReceitas += receitas.length;

      for (const r of receitas) {
        if (r.categorias && Array.isArray(r.categorias) && r.categorias.length > 0) {
          const newCats = r.categorias.map(c => mappings[c] || c);
          const changed = newCats.some((c, i) => c !== r.categorias[i]);
          if (changed) {
            await base44.asServiceRole.entities.Receita.update(r.id, { categorias: newCats });
            updatedReceitas++;
          }
        }
      }
      page++;
    }

    // Migrate CardapioReceita receita_categoria cache
    hasMore = true;
    page = 0;
    while (hasMore) {
      const crs = await base44.asServiceRole.entities.CardapioReceita.list("", pageSize, page * pageSize);
      if (crs.length === 0) { hasMore = false; break; }

      for (const cr of crs) {
        if (cr.receita_categoria && mappings[cr.receita_categoria]) {
          await base44.asServiceRole.entities.CardapioReceita.update(cr.id, {
            receita_categoria: mappings[cr.receita_categoria]
          });
          updatedCardapio++;
        }
      }
      page++;
    }

    return Response.json({
      total_receitas: totalReceitas,
      receitas_atualizadas: updatedReceitas,
      cardapio_receitas_atualizadas: updatedCardapio
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});