import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fusão de ingredientes — suporta qualquer volume de receitas afetadas.
// A ação "confirmar" original (validada para volumes pequenos) foi dividida em
// lotes ("confirmar_lote") para não estourar timeout/payload em ingredientes
// usados em centenas de receitas. A lógica de merge por receita é idêntica à
// versão original, apenas processada em fatias menores por chamada.

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { origem_id, destino_id, acao } = body;

    if (!origem_id || !destino_id) {
      return Response.json({ error: 'origem_id e destino_id são obrigatórios' }, { status: 400 });
    }
    if (origem_id === destino_id) {
      return Response.json({ error: 'Origem e destino devem ser diferentes' }, { status: 400 });
    }

    const [origem] = await base44.asServiceRole.entities.Ingrediente.filter({ id: origem_id });
    const [destino] = await base44.asServiceRole.entities.Ingrediente.filter({ id: destino_id });
    if (!origem) return Response.json({ error: 'Ingrediente origem não encontrado' }, { status: 404 });
    if (!destino) return Response.json({ error: 'Ingrediente destino não encontrado' }, { status: 404 });

    // Processa um lote de linhas ainda pendentes (que não falharam antes).
    if (acao === 'confirmar_lote') {
      const limit = body.limit || 60;
      const failedIds = Array.isArray(body.failedIds) ? body.failedIds : [];

      const todasLinhas = await base44.asServiceRole.entities.IngredienteReceita.filter({
        ingrediente_id: origem_id,
        tipo: 'ingrediente',
      });
      const pendentes = todasLinhas.filter((l) => !failedIds.includes(l.id));

      if (pendentes.length === 0) {
        return Response.json({ processedCount: 0, novasFalhas: [], pendentesRestantes: 0, done: true });
      }

      const batch = pendentes.slice(0, limit);
      const receitaIdsBatch = [...new Set(batch.map((l) => l.receita_id))];

      const destinoLinhasBatch = receitaIdsBatch.length
        ? await base44.asServiceRole.entities.IngredienteReceita.filter({
            receita_id: receitaIdsBatch,
            ingrediente_id: destino_id,
            tipo: 'ingrediente',
          })
        : [];
      const destinoPorReceita = {};
      destinoLinhasBatch.forEach((l) => { destinoPorReceita[l.receita_id] = l; });

      const novasFalhas = [];
      let processedCount = 0;

      for (const linha of batch) {
        try {
          const existente = destinoPorReceita[linha.receita_id];
          if (existente && existente.id !== linha.id) {
            const novaQtd = (existente.quantidade_por_porcao || 0) + (linha.quantidade_por_porcao || 0);
            await base44.asServiceRole.entities.IngredienteReceita.update(existente.id, {
              quantidade_por_porcao: novaQtd,
            });
            await base44.asServiceRole.entities.IngredienteReceita.delete(linha.id);
            destinoPorReceita[linha.receita_id] = { id: existente.id, quantidade_por_porcao: novaQtd };
          } else {
            await base44.asServiceRole.entities.IngredienteReceita.update(linha.id, {
              ingrediente_id: destino_id,
              ingrediente_nome: destino.nome,
            });
            destinoPorReceita[linha.receita_id] = { id: linha.id, quantidade_por_porcao: linha.quantidade_por_porcao || 0 };
          }
          processedCount++;
        } catch (err) {
          novasFalhas.push({ linha_id: linha.id, receita_id: linha.receita_id, erro: err.message });
        }
      }

      const pendentesRestantes = pendentes.length - batch.length;
      return Response.json({
        processedCount,
        novasFalhas,
        pendentesRestantes,
        done: pendentesRestantes === 0,
      });
    }

    // Exclui o ingrediente origem — só deve ser chamado depois que todos os
    // lotes forem processados com sucesso (nenhuma falha pendente).
    if (acao === 'excluir_origem') {
      const restantes = await base44.asServiceRole.entities.IngredienteReceita.filter({
        ingrediente_id: origem_id,
        tipo: 'ingrediente',
      });
      if (restantes.length > 0) {
        return Response.json({ error: 'Ainda há receitas usando o ingrediente origem' }, { status: 409 });
      }
      await base44.asServiceRole.entities.Ingrediente.delete(origem_id);
      return Response.json({ success: true });
    }

    // Preview — busca os nomes das receitas em lotes (evita 1 consulta por receita)
    const linhasOrigem = await base44.asServiceRole.entities.IngredienteReceita.filter({
      ingrediente_id: origem_id,
      tipo: 'ingrediente',
    });

    const receitaIds = [...new Set(linhasOrigem.map((l) => l.receita_id))];
    const receitasMap = {};
    for (const idsChunk of chunk(receitaIds, 200)) {
      const recs = await base44.asServiceRole.entities.Receita.filter({ id: idsChunk });
      recs.forEach((r) => { receitasMap[r.id] = r; });
    }

    const destinoLinhas = await base44.asServiceRole.entities.IngredienteReceita.filter({
      ingrediente_id: destino_id,
      tipo: 'ingrediente',
    });
    const destinoPorReceita = {};
    destinoLinhas.forEach((l) => { destinoPorReceita[l.receita_id] = l; });

    const receitas = linhasOrigem
      .filter((l) => receitasMap[l.receita_id])
      .map((l) => {
        const destinoExistente = destinoPorReceita[l.receita_id];
        return {
          receita_id: l.receita_id,
          receita_nome: receitasMap[l.receita_id].nome,
          quantidade_por_porcao: l.quantidade_por_porcao || 0,
          pre_preparo: l.pre_preparo || '',
          destino_ja_existe: !!destinoExistente,
          destino_quantidade_atual: destinoExistente ? (destinoExistente.quantidade_por_porcao || 0) : null,
        };
      });

    return Response.json({
      origem: { id: origem.id, nome: origem.nome },
      destino: { id: destino.id, nome: destino.nome },
      receitas,
      total: receitas.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}