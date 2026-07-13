import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    // Fetch CSV content
    const response = await fetch(file_url);
    const csvText = await response.text();

    // Parse CSV
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return Response.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const idxIngrediente = header.indexOf('ingrediente_nome');
    const idxUtensilio = header.indexOf('utensilio_simbolo');
    const idxRefG = header.indexOf('referencia_g');
    const idxSoGramas = header.indexOf('so_gramas');

    if (idxIngrediente === -1 || idxUtensilio === -1) {
      return Response.json({ error: 'CSV deve ter colunas: ingrediente_nome, utensilio_simbolo (mínimo)' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));

    // Load all ingredients by name (exact, case-insensitive key)
    const ingredientes = await base44.entities.Ingrediente.list('-nome', 500);
    const ingMap = {};
    ingredientes.forEach(ing => {
      if (ing.nome) ingMap[ing.nome.toLowerCase().trim()] = ing;
    });

    // Load all utensils by simbolo (exact, case-insensitive key)
    const utensilios = await base44.entities.UtensilioPadrao.list('-simbolo', 200);
    const uteMap = {};
    utensilios.forEach(ut => {
      if (ut.simbolo) uteMap[ut.simbolo.toLowerCase().trim()] = ut;
    });

    // Load existing MedidaCaseira to detect duplicates (alimento + utensilio combo)
    const existentes = await base44.entities.MedidaCaseira.list('-created_date', 1000);
    const existSet = new Set();
    existentes.forEach(mc => {
      if (mc.alimento && mc.utensilio) {
        existSet.add(mc.alimento + '|' + mc.utensilio);
      }
    });

    let criados = 0;
    let ignorados = 0;
    const naoEncontrados = [];
    const novosNoBatch = new Set();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const nomeIng = (row[idxIngrediente] || '').trim();
      const simboloUte = (row[idxUtensilio] || '').trim();

      if (!nomeIng || !simboloUte) continue;

      const ing = ingMap[nomeIng.toLowerCase()];
      const ute = uteMap[simboloUte.toLowerCase()];

      if (!ing || !ute) {
        naoEncontrados.push({
          linha: i + 2,
          ingrediente_nome: nomeIng,
          utensilio_simbolo: simboloUte,
          motivo: !ing && !ute ? 'ingrediente e utensílio não encontrados' : (!ing ? 'ingrediente não encontrado' : 'utensílio não encontrado')
        });
        continue;
      }

      const dupKey = ing.id + '|' + ute.id;
      if (existSet.has(dupKey) || novosNoBatch.has(dupKey)) {
        ignorados++;
        continue;
      }

      const referencia_g = idxRefG !== -1 && row[idxRefG] ? parseFloat(row[idxRefG].replace(',', '.')) : null;
      const so_gramas = idxSoGramas !== -1 ? (row[idxSoGramas] || '').trim().toLowerCase() === 'sim' || row[idxSoGramas].trim() === 'true' : false;

      novosNoBatch.add(dupKey);
      await base44.entities.MedidaCaseira.create({
        nome: nomeIng + ' · ' + simboloUte,
        alimento: ing.id,
        utensilio: ute.id,
        referencia_g: !isNaN(referencia_g) ? referencia_g : null,
        so_gramas: so_gramas,
      });
      existSet.add(dupKey);
      criados++;
    }

    return Response.json({
      criados,
      ignorados,
      naoEncontrados,
      total_linhas: dataRows.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        current.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        current.push(field);
        field = '';
        if (current.some(c => c.trim() !== '')) rows.push(current);
        current = [];
      } else {
        field += char;
      }
    }
  }

  if (field || current.length > 0) {
    current.push(field);
    if (current.some(c => c.trim() !== '')) rows.push(current);
  }

  return rows;
}