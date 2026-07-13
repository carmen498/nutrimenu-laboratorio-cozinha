import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    // ── Fetch & parse CSV ──
    const response = await fetch(file_url);
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return Response.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const idxNome = header.indexOf('ingrediente_nome');
    const idxSinonimo = header.indexOf('sinonimo');

    if (idxNome === -1 || idxSinonimo === -1) {
      return Response.json({ error: 'CSV deve ter colunas: ingrediente_nome, sinonimo' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));

    // ── READ-ONLY: load ingredients into map (case-insensitive key) ──
    // ABSOLUTELY NO create/update/delete on Ingrediente — list only
    const ingredientes = await base44.entities.Ingrediente.list('-nome', 500);
    const ingMap = {};
    ingredientes.forEach(ing => {
      if (ing.nome) ingMap[ing.nome.toLowerCase().trim()] = ing;
    });

    // ── READ-ONLY: load existing synonyms for duplicate detection ──
    const sinonimosExistentes = await base44.entities.SinonimosIngredientes.list('-created_date', 1000);
    const sinonimoSet = new Set();
    sinonimosExistentes.forEach(s => {
      if (s.sinonimo) sinonimoSet.add(s.sinonimo.toLowerCase().trim());
    });

    // ── FIRST PASS: validate all rows, collect valid records & rejections ──
    const validRecords = [];
    const rejeitados = [];
    let ignorados = 0;
    const batchDupSet = new Set();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const linhaNum = i + 2;
      const nome = (row[idxNome] || '').trim();
      const sinonimo = (row[idxSinonimo] || '').trim();

      if (!nome) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: '', sinonimo, motivo: 'nome do ingrediente vazio' });
        continue;
      }
      if (!sinonimo) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nome, sinonimo: '', motivo: 'sinônimo vazio' });
        continue;
      }

      // Look up ingredient (READ ONLY — never create)
      const ing = ingMap[nome.toLowerCase()];
      if (!ing) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nome, sinonimo, motivo: 'ingrediente não encontrado' });
        continue;
      }

      // Check duplicate (case-insensitive, across ALL ingredients)
      const sinKey = sinonimo.toLowerCase().trim();
      if (sinonimoSet.has(sinKey) || batchDupSet.has(sinKey)) {
        ignorados++;
        continue;
      }

      batchDupSet.add(sinKey);
      validRecords.push({
        ingrediente_id: ing.id,
        sinonimo,
      });
    }

    // ── SECOND PASS: batch create valid records (batches of 50) ──
    let criados = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      await base44.entities.SinonimosIngredientes.bulkCreate(batch);
      criados += batch.length;
    }

    return Response.json({
      total_linhas: dataRows.length,
      criados,
      ignorados,
      rejeitados,
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
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { current.push(field); field = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        current.push(field); field = '';
        if (current.some(c => c.trim() !== '')) rows.push(current);
        current = [];
      } else { field += char; }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.some(c => c.trim() !== '')) rows.push(current);
  }
  return rows;
}