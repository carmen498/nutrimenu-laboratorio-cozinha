import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { fetchCsvSeguro } from '../../shared/fetchCsvSeguro.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const file_url = body.file_url;
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    const csvText = await fetchCsvSeguro(file_url);
    const rows = parseCSV(csvText);
    if (rows.length === 0) return Response.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });

    const header = rows[0].map(h => h.trim().toLowerCase());
    const idxIng = header.indexOf('ingrediente_nome');
    const idxUte = header.indexOf('utensilio_simbolo');
    const idxRefG = header.indexOf('referencia_g');
    const idxSoGramas = header.indexOf('so_gramas');
    const idxEstado = header.indexOf('estado_alimento');
    const idxFonte = header.indexOf('fonte');

    if (idxIng === -1 || idxUte === -1) {
      return Response.json({ error: 'CSV deve ter colunas: ingrediente_nome, utensilio_simbolo (mínimo)' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));
    const ingredientes = await base44.entities.Ingrediente.list('-nome', 5000);
    const utensilios = await base44.entities.UtensilioPadrao.list('-simbolo', 1000);
    const existentes = await base44.entities.MedidaCaseira.list('-created_date', 5000);

    const ingMap: Record<string, any> = {};
    ingredientes.forEach((ing: any) => { if (ing.nome) ingMap[ing.nome.toLowerCase().trim()] = ing; });
    const uteMap: Record<string, any> = {};
    utensilios.forEach((ut: any) => { if (ut.simbolo) uteMap[ut.simbolo.toLowerCase().trim()] = ut; });

    const existSet = new Set<string>();
    existentes.forEach((mc: any) => {
      const ingId = mc.ingrediente_id || mc.alimento;
      const uteId = mc.utensilio_id || mc.utensilio;
      const estado = mc.estado_alimento || 'não informado';
      if (ingId && uteId) existSet.add(`${ingId}|${uteId}|${estado}`);
    });

    const validRecords: any[] = [];
    const rejeitados: any[] = [];
    let ignorados = 0;
    const batchDupSet = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const linhaNum = i + 2;
      const nomeIng = (row[idxIng] || '').trim();
      const simboloUte = (row[idxUte] || '').trim();
      if (!nomeIng) { rejeitados.push({ linha: linhaNum, motivo: 'nome do ingrediente vazio' }); continue; }
      if (!simboloUte) { rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, motivo: 'símbolo do utensílio vazio' }); continue; }

      const ing = ingMap[nomeIng.toLowerCase()];
      const ute = uteMap[simboloUte.toLowerCase()];
      if (!ing) { rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: simboloUte, motivo: 'ingrediente não encontrado' }); continue; }
      if (!ute) { rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: simboloUte, motivo: 'utensílio não encontrado' }); continue; }

      let referenciaG: number | null = null;
      if (idxRefG !== -1 && row[idxRefG]) referenciaG = parseFloat(row[idxRefG].replace(',', '.'));
      if (referenciaG === null || isNaN(referenciaG) || referenciaG <= 0) {
        rejeitados.push({ linha: linhaNum, ingrediente_nome: nomeIng, utensilio_simbolo: simboloUte, motivo: 'referencia_g vazia, zero ou inválida' });
        continue;
      }

      const estadoRaw = idxEstado !== -1 ? (row[idxEstado] || '').trim().toLowerCase() : 'cru';
      const estado = ['cru', 'pronto', 'não informado'].includes(estadoRaw) ? estadoRaw : 'não informado';
      const dupKey = `${ing.id}|${ute.id}|${estado}`;
      if (existSet.has(dupKey) || batchDupSet.has(dupKey)) { ignorados++; continue; }

      const soGramas = idxSoGramas !== -1
        ? ['sim', 'true', '1'].includes((row[idxSoGramas] || '').trim().toLowerCase())
        : false;
      const fonte = idxFonte !== -1 && (row[idxFonte] || '').trim() ? (row[idxFonte] || '').trim() : 'Importação CSV';

      batchDupSet.add(dupKey);
      validRecords.push({
        modelo_versao: 2,
        nome: `${nomeIng} · ${simboloUte}`,
        chave_canonica: dupKey,
        ingrediente_id: ing.id,
        utensilio_id: ute.id,
        quantidade_utensilio: 1,
        peso_g: referenciaG,
        referencia_g: referenciaG,
        estado_alimento: estado,
        fonte,
        so_gramas: soGramas,
      });
    }

    let criados = 0;
    for (let i = 0; i < validRecords.length; i += 50) {
      const batch = validRecords.slice(i, i + 50);
      await base44.entities.MedidaCaseira.bulkCreate(batch);
      criados += batch.length;
    }

    return Response.json({ total_linhas: dataRows.length, criados, ignorados, rejeitados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseCSV(text: string) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else field += char;
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { current.push(field); field = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        current.push(field); field = '';
        if (current.some(c => c.trim() !== '')) rows.push(current);
        current = [];
      } else field += char;
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.some(c => c.trim() !== '')) rows.push(current);
  }
  return rows;
}
