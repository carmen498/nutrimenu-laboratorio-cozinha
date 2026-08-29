import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

async function buscarTodos(entity, filtro, ordenacao = '-created_date') {
  const registros = [];
  const limite = 500;
  let skip = 0;

  while (true) {
    const pagina = await entity.filter(filtro, ordenacao, limite, skip);
    registros.push(...pagina);
    if (pagina.length < limite) break;
    skip += limite;
  }

  return registros;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ingredienteId = String(body.ingrediente_id || '').trim();
    if (!ingredienteId) {
      return Response.json({ error: 'Ingrediente não informado' }, { status: 400 });
    }

    const usos = await buscarTodos(
      base44.entities.IngredienteReceita,
      { ingrediente_id: ingredienteId }
    );
    const receitaIds = [...new Set(usos.map((item) => item.receita_id).filter(Boolean))];
    if (receitaIds.length === 0) return Response.json({ linhas: [] });

    const filtroReceitas = { $in: receitaIds };
    const [receitas, itensReceitas, insumos, esquecidos] = await Promise.all([
      buscarTodos(base44.entities.Receita, { id: filtroReceitas }, '-nome'),
      buscarTodos(base44.entities.IngredienteReceita, { receita_id: filtroReceitas }),
      buscarTodos(base44.entities.InsumoReceita, { receita_id: filtroReceitas }),
      buscarTodos(base44.entities.IngredienteEsquecidoReceita, { receita_id: filtroReceitas }),
    ]);

    const ingredienteIds = [...new Set(
      itensReceitas
        .filter((item) => item.tipo === 'ingrediente' && item.ingrediente_id)
        .map((item) => item.ingrediente_id)
    )];
    const ingredientes = ingredienteIds.length
      ? await buscarTodos(base44.entities.Ingrediente, { id: { $in: ingredienteIds } }, '-nome')
      : [];

    const receitasMap = new Map(receitas.map((receita) => [receita.id, receita]));
    const ingredientesMap = new Map(ingredientes.map((ingrediente) => [ingrediente.id, ingrediente]));
    const itensPorReceita = new Map();
    const custosInsumos = new Map();
    const custosEsquecidos = new Map();

    for (const item of itensReceitas) {
      if (!itensPorReceita.has(item.receita_id)) itensPorReceita.set(item.receita_id, []);
      itensPorReceita.get(item.receita_id).push(item);
    }
    for (const item of insumos) {
      custosInsumos.set(item.receita_id, (custosInsumos.get(item.receita_id) || 0) + (item.custo_total || 0));
    }
    for (const item of esquecidos) {
      custosEsquecidos.set(item.receita_id, (custosEsquecidos.get(item.receita_id) || 0) + (item.custo_total || 0));
    }

    const precoInformado = Number(body.preco_por_g_rs);
    const fatorInformado = Number(body.fator_correcao);
    const linhas = [];

    for (const receitaId of receitaIds) {
      const receita = receitasMap.get(receitaId);
      if (!receita) continue;
      const itens = itensPorReceita.get(receitaId) || [];
      const porcoesBase = receita.porcoes_base || 1;
      let custoIngredientes = 0;

      for (const item of itens) {
        if (item.tipo !== 'ingrediente' || !item.ingrediente_id) continue;
        const ingrediente = ingredientesMap.get(item.ingrediente_id);
        const quantidade = (item.quantidade_por_porcao || 0) * porcoesBase;
        const fator = ingrediente?.fator_correcao || 1;
        const preco = ingrediente?.preco_por_g_rs || 0;
        custoIngredientes += quantidade * fator * preco;
      }

      const itemAtual = itens.find(
        (item) => item.ingrediente_id === ingredienteId && item.tipo === 'ingrediente'
      );
      if (!itemAtual) continue;

      const quantidade = (itemAtual.quantidade_por_porcao || 0) * porcoesBase;
      const ingredienteMestre = ingredientesMap.get(ingredienteId);
      const fator = Number.isFinite(fatorInformado) && fatorInformado > 0
        ? fatorInformado
        : (ingredienteMestre?.fator_correcao || 1);
      const preco = Number.isFinite(precoInformado) && precoInformado >= 0
        ? precoInformado
        : (ingredienteMestre?.preco_por_g_rs || 0);
      const custo = quantidade * fator * preco;
      const custoTotal = custoIngredientes
        + (custosInsumos.get(receitaId) || 0)
        + (custosEsquecidos.get(receitaId) || 0);

      linhas.push({
        receita_id: receitaId,
        receita_nome: receita.nome,
        qtd: quantidade,
        custo,
        pct: custoTotal > 0 ? (custo / custoTotal) * 100 : 0,
      });
    }

    linhas.sort((a, b) => a.receita_nome.localeCompare(b.receita_nome, 'pt-BR'));
    return Response.json({ linhas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}