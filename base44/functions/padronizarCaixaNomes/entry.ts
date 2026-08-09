import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function toUpperName(v) {
  return (v || '').toString().toUpperCase();
}
function toSentenceCase(v) {
  const s = (v || '').toString().trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

async function paginate(entity, query, sort) {
  let all = [];
  let skip = 0;
  const pageSize = 500;
  while (true) {
    const page = query
      ? await entity.filter(query, sort, pageSize, skip)
      : await entity.list(sort, pageSize, skip);
    all = all.concat(page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  return all;
}

async function bulkUpdateChunked(entity, updates, chunkSize = 500) {
  for (let i = 0; i < updates.length; i += chunkSize) {
    await entity.bulkUpdate(updates.slice(i, i + chunkSize));
  }
}

async function processarEntidade(entity, records, campo, transform, entidadeLabel) {
  const updates = [];
  const exemplos = [];
  for (const r of records) {
    const antes = r[campo];
    const depois = transform(antes);
    if (depois !== antes) {
      const payload = { id: r.id };
      payload[campo] = depois;
      updates.push(payload);
      if (exemplos.length < 5) exemplos.push({ antes, depois });
    }
  }
  if (updates.length > 0) await bulkUpdateChunked(entity, updates);
  return { entidade: entidadeLabel, total_processado: records.length, total_alterado: updates.length, exemplos };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const contagens = [];

    const receitas = await paginate(base44.asServiceRole.entities.Receita, null, 'nome');
    contagens.push(await processarEntidade(base44.asServiceRole.entities.Receita, receitas, 'nome', toUpperName, 'Receitas'));

    const cardapios = await paginate(base44.asServiceRole.entities.Cardapio, null, 'nome');
    contagens.push(await processarEntidade(base44.asServiceRole.entities.Cardapio, cardapios, 'nome', toUpperName, 'Cardápios'));

    const planejamentos = await paginate(base44.asServiceRole.entities.Planejamento, null, 'nome');
    contagens.push(await processarEntidade(base44.asServiceRole.entities.Planejamento, planejamentos, 'nome', toUpperName, 'Eventos'));

    const grupos = await paginate(base44.asServiceRole.entities.IngredienteReceita, { tipo: 'grupo' }, 'created_date');
    contagens.push(await processarEntidade(base44.asServiceRole.entities.IngredienteReceita, grupos, 'titulo_grupo', toUpperName, 'Sub-títulos de grupo'));

    const ingredientes = await paginate(base44.asServiceRole.entities.Ingrediente, null, 'nome');
    contagens.push(await processarEntidade(base44.asServiceRole.entities.Ingrediente, ingredientes, 'nome', toSentenceCase, 'Ingredientes'));

    return Response.json({ success: true, contagens });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}