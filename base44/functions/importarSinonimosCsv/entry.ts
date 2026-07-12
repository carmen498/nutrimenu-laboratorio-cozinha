import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Parse CSV (comma-separated, quoted fields supported)
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return Response.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });
    }

    // First row should be header
    const header = rows[0].map(h => h.trim().toLowerCase());
    const idxNome = header.indexOf('ingrediente_nome');
    const idxSinonimo = header.indexOf('sinonimo');

    if (idxNome === -1 || idxSinonimo === -1) {
      return Response.json({ error: 'CSV deve ter colunas: ingrediente_nome, sinonimo' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));

    // Load all ingredients into a map by name (case-insensitive key)
    const ingredientes = await base44.entities.Ingrediente.list('-nome', 500);
    const ingMap = {};
    ingredientes.forEach(ing => {
      if (ing.nome) ingMap[ing.nome.toLowerCase()] = ing;
    });

    // Load all existing synonyms into a Set (case-insensitive)
    const sinonimosExistentes = await base44.entities.SinonimosIngredientes.list('-created_date', 1000);
    const sinonimoSet = new Set();
    sinonimosExistentes.forEach(s => {
      if (s.sinonimo) sinonimoSet.add(s.sinonimo.toLowerCase().trim());
    });

    let criados = 0;
    let ignorados = 0;
    const naoEncontrados = [];
    const novosNoBatch = new Set();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const nome = (row[idxNome] || '').trim();
      const sinonimo = (row[idxSinonimo] || '').trim();

      if (!nome || !sinonimo) continue;

      const ing = ingMap[nome.toLowerCase()];
      if (!ing) {
        naoEncontrados.push({ linha: i + 2, ingrediente_nome: nome, sinonimo });
        continue;
      }

      const sinKey = sinonimo.toLowerCase();
      if (sinonimoSet.has(sinKey) || novosNoBatch.has(sinKey)) {
        ignorados++;
        continue;
      }

      novosNoBatch.add(sinKey);
      await base44.entities.SinonimosIngredientes.create({
        ingrediente_id: ing.id,
        sinonimo
      });
      sinonimoSet.add(sinKey);
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
  // Remove BOM if present
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

  // Last field/row
  if (field || current.length > 0) {
    current.push(field);
    if (current.some(c => c.trim() !== '')) rows.push(current);
  }

  return rows;
}