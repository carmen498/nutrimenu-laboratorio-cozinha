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
    const idxIng = header.indexOf('ingrediente_nome');
    const idxUte = header.indexOf('utensilio_simbolo');
    const idxRefG = header.indexOf('referencia_g');
    const idxSoGramas = header.indexOf('so_gramas');

    if (idxIng === -1 || idxUte === -1) {
      return Response.json({ error: 'CSV deve ter colunas: ingrediente_nome, utensilio_simbolo (mínimo)' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));

    // ── READ-ONLY: load ingredients into map (case-insensitive key) ──
    // ABSOLUTELY NO create/update/delete on Ingrediente — list only
    const ingredientes = await base44.entities.Ingrediente.list('-nome', 500);
    const ingMap = {};
    ingredientes.forEach(ing => {
      if (ing.nome) ingMap[ing.nome.toLowerCase().trim()] = ing;
    });

    // ── READ-ONLY: load utensils into map (case-insensitive key) ──
    // ABSOLUTELY NO create/update/delete on UtensilioPadrao — list only
    const utensilios = await base44.entities.UtensilioPadrao.list('-simbolo', 200);
    const uteMap = {};
    utensilios.forEach(ut => {
      if (ut.simbolo) uteMap[ut.simbolo.toLowerCase().trim()] = ut;
    });

    // ── READ-ONLY: load existing MedidaCaseira for duplicate detection ──
    const existentes = await base44.entities.MedidaCaseira.list('-created_date', 1000);
    const existSet = new Set();
    existentes.forEach(mc => {
      if (mc.alimento && mc.utensilio) {
        existSet.add(mc.alimento + '|' + mc.utensilio);
      }
    });

    // ── FIRST PASS: validate all rows, collect valid records & rejections ──
    const validRecords = [];
    const rejeitados = [];
    let ignorados = 0;
    const batchDupSet = new Set();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const linhaNum = i + 2; // +2: header is line 1, data starts at line 2
      const nomeIng = (row[idxIng] || '').trim();
      const simboloUte = (row[idxUte] || '').trim();

      // Validate ingredient name present
      if (!nomeIng) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: '', utensilio_simbolo: simboloUte, motivo: 'nome do ingrediente vazio' });
        continue;
      }
      // Validate utensilio symbol present
      if (!simboloUte) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: '', motivo: 'símbolo do utensílio vazio' });
        continue;
      }

      // Look up ingredient (READ ONLY — never create)
      const ing = ingMap[nomeIng.toLowerCase()];
      if (!ing) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: simboloUte, motivo: 'ingrediente não encontrado' });
        continue;
      }

      // Look up utensilio (READ ONLY — never create)
      const ute = uteMap[simboloUte.toLowerCase()];
      if (!ute) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: simboloUte, motivo: 'utensílio não encontrado' });
        continue;
      }

      // Validate referencia_g
      let referencia_g = null;
      if (idxRefG !== -1 && row[idxRefG]) {
        referencia_g = parseFloat(row[idxRefG].replace(',', '.'));
      }
      if (referencia_g === null || isNaN(referencia_g) || referencia_g <= 0) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: simboloUte, motivo: 'referencia_g vazia, zero ou inválida' });
        continue;
      }

      // Check duplicate (existing or already in this batch)
      const dupKey = ing.id + '|' + ute.id;
      if (existSet.has(dupKey) || batchDupSet.has(dupKey)) {
        ignorados++;
        continue;
      }

      const so_gramas = idxSoGramas !== -1
        ? (row[idxSoGramas] || '').trim().toLowerCase() === 'sim' || (row[idxSoGramas] || '').trim() === 'true'
        : false;

      batchDupSet.add(dupKey);
      validRecords.push({
        nome: nomeIng + ' · ' + simboloUte,
        alimento: ing.id,
        utensilio: ute.id,
        referencia_g: referencia_g,
        so_gramas: so_gramas,
      });
    }

    // ── SECOND PASS: batch create valid records (batches of 50) ──
    let criados = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      await base44.entities.MedidaCaseira.bulkCreate(batch);
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