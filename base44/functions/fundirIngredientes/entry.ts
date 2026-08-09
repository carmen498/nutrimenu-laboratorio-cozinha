import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

    // All recipe lines using the origem ingredient
    const linhasOrigem = await base44.asServiceRole.entities.IngredienteReceita.filter({
      ingrediente_id: origem_id,
      tipo: 'ingrediente',
    });

    if (acao === 'confirmar') {
      const falhas = [];
      const receitasAtualizadasIds = new Set();

      for (const linha of linhasOrigem) {
        try {
          // Check if destino already has a line in the same recipe
          const linhasReceita = await base44.asServiceRole.entities.IngredienteReceita.filter({
            receita_id: linha.receita_id,
            tipo: 'ingrediente',
          });
          const linhaDestinoExistente = linhasReceita.find(
            (l) => l.ingrediente_id === destino_id && l.id !== linha.id
          );

          if (linhaDestinoExistente) {
            const novaQtd = (linhaDestinoExistente.quantidade_por_porcao || 0) + (linha.quantidade_por_porcao || 0);
            await base44.asServiceRole.entities.IngredienteReceita.update(linhaDestinoExistente.id, {
              quantidade_por_porcao: novaQtd,
            });
            await base44.asServiceRole.entities.IngredienteReceita.delete(linha.id);
          } else {
            await base44.asServiceRole.entities.IngredienteReceita.update(linha.id, {
              ingrediente_id: destino_id,
              ingrediente_nome: destino.nome,
            });
          }
          receitasAtualizadasIds.add(linha.receita_id);
        } catch (err) {
          falhas.push({ receita_id: linha.receita_id, erro: err.message });
        }
      }

      let origemExcluido = false;
      if (falhas.length === 0) {
        await base44.asServiceRole.entities.Ingrediente.delete(origem_id);
        origemExcluido = true;
      }

      return Response.json({
        success: falhas.length === 0,
        receitasAtualizadas: receitasAtualizadasIds.size,
        falhas,
        origemExcluido,
        origemNome: origem.nome,
        destinoNome: destino.nome,
      });
    }

    // Preview
    const receitaIds = [...new Set(linhasOrigem.map((l) => l.receita_id))];
    const receitasMap = {};
    for (const recId of receitaIds) {
      const [rec] = await base44.asServiceRole.entities.Receita.filter({ id: recId });
      if (rec) receitasMap[recId] = rec;
    }

    // Existing destino lines per recipe, for the "will be summed" warning
    const destinoLinhas = destino
      ? await base44.asServiceRole.entities.IngredienteReceita.filter({
          ingrediente_id: destino_id,
          tipo: 'ingrediente',
        })
      : [];
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