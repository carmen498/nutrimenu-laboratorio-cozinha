import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORIZAR = (nome) => {
  const n = nome.toLowerCase();
  if (/bacalhau|camarão|camarão|peixe|salmão|atum|sardinha|lula|polvo|marisco|mexilhão|lagosta|siri|caranguejo/.test(n)) return "Peixes e Frutos do Mar";
  if (/frango|peru|ave|galinha|chester|pato/.test(n)) return "Aves";
  if (/pastelão|pastelao|quiche|torta salgada/.test(n)) return "Massas, Pastelão e Quiches";
  if (/sobremesa|doce|brigadeiro|beijinho|pavê|pave|mousse|bolo|torta doce|pudim/.test(n)) return "Sobremesas";
  if (/arroz|risoto/.test(n)) return "Arroz e Risoto";
  if (/sopa|caldo|creme de/.test(n) && /legume|verdura|frango|carne/.test(n)) return "Sopas e Caldos";
  if (/pão|pao|sanduíche|lanche/.test(n)) return "Lanche";
  if (/salada/.test(n)) return "Acompanhamento";
  if (/carne|bovin|contrafilé|contrafile|picanha|alcatra|maminha|patinho|coxão|coxao|costela|fraldinha|cupim|músculo|musculo|filé|file/.test(n)) return "Carne Bovina";
  if (/ovo|omelete|frittata/.test(n)) return "Ovos";
  return "Prato Principal";
};

const NORMALIZAR = (nome) => {
  return nome.trim()
    .replace(/^de /i, '')
    .replace(/^para /i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const CATEGORIA_INGREDIENTE = (nome) => {
  const n = nome.toLowerCase();
  if (/carne|bovin|contrafilé|picanha|alcatra|maminha|patinho|coxão|costela|fraldinha|cupim|músculo|filet|filé/.test(n)) return "Carnes e Ovos";
  if (/frango|peru|ave|galinha|chester|pato/.test(n)) return "Carnes e Ovos";
  if (/ovo|gema|clara/.test(n)) return "Carnes e Ovos";
  if (/bacalhau|camarão|peixe|salmão|atum|sardinha|lula|polvo|marisco|mexilhão|lagosta/.test(n)) return "Peixes e Frutos do Mar";
  if (/cebola|alho|cenoura|brócolis|abobrinha|berinjela|pimentão|tomate|pepino|beterraba|batata|mandioca|aipim|inhame|rúcula|alface|espinafre|couve|repolho|acelga|agrião|quiabo|vagem|chuchu|abóbora|milho|ervilha|palmito|azeitona|legume|verdura/.test(n)) return "Verduras e Hortaliças";
  if (/limão|laranja|maçã|banana|abacaxi|morango|uva|manga|maracujá|pêssego|ameixa|coco|abacate|kiwi|melão|melancia|framboesa|mirtilo|cereja/.test(n)) return "Frutas";
  if (/leite|queijo|creme|iogurte|nata|manteiga|requeijão|ricota|catupiry|mascarpone|parmesão|mussarela|muçarela|provolone|gorgonzola|cheddar|minas|coalho/.test(n)) return "Laticínios";
  if (/óleo|azeite|margarina|banha|gordura/.test(n)) return "Óleos e Gorduras";
  if (/pimenta|orégano|tomilho|alecrim|manjericão|salsinha|cebolinha|coentro|louro|noz|cravo|cominho|açafrão|curry|gengibre|colorau|urucum|sal|páprica|canela|baunilha|essência|erva|tempero/.test(n)) return "Temperos";
  if (/farinha|amido|maizena|fécula|polvilho|açúcar|acucar|fermento|bicarbonato|fubá|trigo|aveia|macarrão|arroz|grão|feijão|lentilha|grão-de-bico|soja/.test(n)) return "Panificação e Cereais";
  if (/chocolate|cacau|doce|mel|geleia|compota|calda|chantilly|brigadeiro/.test(n)) return "Açúcares e Doces";
  return "Diversos";
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 403 });

    const { csv_url } = await req.json();
    if (!csv_url) return Response.json({ error: 'csv_url is required' }, { status: 400 });

    // Fetch CSV content
    const csvRes = await fetch(csv_url);
    const text = await csvRes.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, j) => { row[h] = vals[j] || ''; });
      rows.push(row);
    }

    // Group by recipe
    const recipeMap = {};
    for (const row of rows) {
      const nome = (row.nome_receita || '').trim().toUpperCase();
      if (!nome) continue;
      if (!recipeMap[nome]) recipeMap[nome] = [];
      recipeMap[nome].push(row);
    }

    // Load existing data
    const existingReceitas = await base44.asServiceRole.entities.Receita.filter({}, '', 2000);
    const receitaByName = {};
    existingReceitas.forEach(r => { receitaByName[r.nome?.toUpperCase().trim()] = r; });

    const existingIngredientes = await base44.asServiceRole.entities.Ingrediente.filter({}, '', 5000);
    const ingByName = {};
    existingIngredientes.forEach(ing => { ingByName[ing.nome?.toUpperCase().trim()] = ing; });

    let receitasCriadas = 0;
    let receitasAtualizadas = 0;
    let ingredientesCriados = 0;
    let ingredientesVinculados = 0;

    for (const [nomeReceita, ingredientes] of Object.entries(recipeMap)) {
      // Find or create recipe
      let receita = receitaByName[nomeReceita];
      
      // Calculate total yield
      const rendimentoTotal = ingredientes.reduce((sum, ing) => {
        return sum + (parseFloat(ing.quantidade_g) || 0);
      }, 0);

      const categorias = [CATEGORIZAR(nomeReceita)];

      if (receita) {
        // Update existing recipe
        await base44.asServiceRole.entities.Receita.update(receita.id, {
          rendimento_total: rendimentoTotal,
          unidade_base: "g",
        });
        receitasAtualizadas++;
      } else {
        receita = await base44.asServiceRole.entities.Receita.create({
          nome: nomeReceita,
          categorias,
          porcoes_base: 1,
          rendimento_total: rendimentoTotal,
          unidade_base: "g",
          modo_preparo: "",
          custo_total: 0,
          custo_por_porcao: 0,
        });
        receitaByName[nomeReceita] = receita;
        receitasCriadas++;
      }

      // Clear existing ingredient links for this recipe
      const existingLinks = await base44.asServiceRole.entities.IngredienteReceita.filter(
        { receita_id: receita.id }, '', 500
      );
      for (const link of existingLinks) {
        await base44.asServiceRole.entities.IngredienteReceita.delete(link.id);
      }

      // Create ingredient links
      let ordem = 0;
      for (const ingRow of ingredientes) {
        const ingNome = NORMALIZAR(ingRow.ingrediente || '');
        if (!ingNome) continue;

        const nomeUpper = ingNome.toUpperCase();
        let ingId;

        if (ingByName[nomeUpper]) {
          ingId = ingByName[nomeUpper].id;
        } else {
          // Create new ingredient
          const cat = CATEGORIA_INGREDIENTE(ingNome);
          const novoIng = await base44.asServiceRole.entities.Ingrediente.create({
            nome: ingNome,
            categoria: cat,
            unidade_compra: "KG",
            peso_embalagem_g: 1000,
            preco_embalagem_rs: 0,
            preco_por_g_rs: 0,
            fator_correcao: 1.0,
          });
          ingId = novoIng.id;
          ingByName[nomeUpper] = novoIng;
          ingredientesCriados++;
        }

        const qtdG = parseFloat(ingRow.quantidade_g) || 0;
        const preparo = (ingRow.preparo || '').trim();

        await base44.asServiceRole.entities.IngredienteReceita.create({
          receita_id: receita.id,
          ingrediente_id: ingId,
          ingrediente_nome: ingNome,
          pre_preparo: preparo,
          quantidade_por_porcao: qtdG, // per 1 porção base
          ordem,
          proporcional: true,
          tipo: "ingrediente",
        });
        ordem++;
        ingredientesVinculados++;
      }

      // Update rendimento
      await base44.asServiceRole.entities.Receita.update(receita.id, {
        rendimento_total: rendimentoTotal,
      });
    }

    return Response.json({
      total_rows: rows.length,
      unique_recipes: Object.keys(recipeMap).length,
      receitas_criadas: receitasCriadas,
      receitas_atualizadas: receitasAtualizadas,
      ingredientes_novos: ingredientesCriados,
      ingredientes_vinculados: ingredientesVinculados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});