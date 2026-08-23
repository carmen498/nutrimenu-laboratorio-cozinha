import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { fetchCsvSeguro } from '../../shared/fetchCsvSeguro.ts';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const file_url = body.file_url;
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    // Importação altera o catálogo mestre e, portanto, é exclusiva de administradores.
    const csvText = await fetchCsvSeguro(file_url);
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return Response.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const idxNome = header.indexOf('nome');
    const idxCategoria = header.indexOf('categoria');
    const idxUnidade = header.indexOf('unidade_compra');
    const idxPeso = header.indexOf('peso_embalagem_g');
    const idxPrecoEmb = header.indexOf('preco_embalagem_rs');
    const idxPrecoG = header.indexOf('preco_por_g_rs');
    const idxFator = header.indexOf('fator_correcao');

    if (idxNome === -1) {
      return Response.json({ error: 'CSV deve ter a coluna: nome (mínimo)' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));

    const existentes = await base44.entities.Ingrediente.list('-nome', 500);
    const existMap = {};
    existentes.forEach(ing => {
      if (ing.nome) existMap[ing.nome.toLowerCase().trim()] = ing;
    });

    const toCreate = [];
    const toUpdate = [];
    const rejeitados = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const linhaNum = i + 2;
      const nome = (row[idxNome] || '').trim();

      if (!nome) {
        rejeitados.push({ linha: linhaNum, nome: '', motivo: 'nome vazio' });
        continue;
      }

      const peso_embalagem_g = idxPeso !== -1 && row[idxPeso] ? parseFloat(row[idxPeso].replace(',', '.')) : null;
      const preco_embalagem_rs = idxPrecoEmb !== -1 && row[idxPrecoEmb] ? parseFloat(row[idxPrecoEmb].replace(',', '.')) : null;
      const preco_por_g_direto = idxPrecoG !== -1 && row[idxPrecoG] ? parseFloat(row[idxPrecoG].replace(',', '.')) : null;

      let preco_por_g_rs = 0;
      if (peso_embalagem_g > 0 && preco_embalagem_rs !== null && !isNaN(preco_embalagem_rs)) {
        preco_por_g_rs = preco_embalagem_rs / peso_embalagem_g;
      } else if (preco_por_g_direto !== null && !isNaN(preco_por_g_direto)) {
        preco_por_g_rs = preco_por_g_direto;
      }

      const payload = {
        nome,
        categoria: idxCategoria !== -1 && row[idxCategoria] ? row[idxCategoria].trim() : undefined,
        unidade_compra: idxUnidade !== -1 && row[idxUnidade] ? row[idxUnidade].trim() : undefined,
        peso_embalagem_g: (peso_embalagem_g !== null && !isNaN(peso_embalagem_g)) ? peso_embalagem_g : undefined,
        preco_embalagem_rs: (preco_embalagem_rs !== null && !isNaN(preco_embalagem_rs)) ? preco_embalagem_rs : undefined,
        preco_por_g_rs,
        fator_correcao: idxFator !== -1 && row[idxFator] ? (parseFloat(row[idxFator].replace(',', '.')) || 1.0) : undefined,
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      if (preco_por_g_rs > 0) {
        payload.preco_atualizado_em = new Date().toISOString();
        payload.fonte_preco = 'Manual';
      }

      const existente = existMap[nome.toLowerCase()];
      if (existente) {
        toUpdate.push({ id: existente.id, ...payload });
      } else {
        payload.fator_correcao = payload.fator_correcao || 1.0;
        toCreate.push(payload);
      }
    }

    let criados = 0;
    let atualizados = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);
      await base44.entities.Ingrediente.bulkCreate(batch);
      criados += batch.length;
    }
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      await base44.entities.Ingrediente.bulkUpdate(batch);
      atualizados += batch.length;
    }

    let receitasInvalidadas = 0;
    if (toUpdate.length > 0) {
      const invalidacao = await invalidarCustosPorDependencias({
        entities: base44.asServiceRole.entities,
        ingredienteIds: toUpdate.map((row) => row.id),
        motivo: 'ingrediente_mestre_atualizado_por_csv',
        origem: 'importar_ingredientes_csv',
      });
      receitasInvalidadas = invalidacao.receitas_invalidadas || 0;
    }

    return Response.json({
      total_linhas: dataRows.length,
      criados,
      atualizados,
      receitas_invalidadas: receitasInvalidadas,
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