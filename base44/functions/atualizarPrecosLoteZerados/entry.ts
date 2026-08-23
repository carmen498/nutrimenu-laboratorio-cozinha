import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

// Lista fixa de ingredientes a atualizar (nome exato -> preço da embalagem cadastrada em R$)
const LISTA_PRECOS = [
  { nome: "Aceto Balsâmico", preco: 32.00 },
  { nome: "Achocolatado", preco: 20.00 },
  { nome: "Adobo", preco: 50.00 },
  { nome: "Ameixa preta seca", preco: 4.20 },
  { nome: "Amido de Milho", preco: 12.00 },
  { nome: "Arroz arbório", preco: 30.00 },
  { nome: "Arroz integral", preco: 9.00 },
  { nome: "Arroz Japonês", preco: 26.00 },
  { nome: "Aspargos em conserva", preco: 95.00 },
  { nome: "Aveia em flocos fina", preco: 15.00 },
  { nome: "Aveia em flocos grossa", preco: 15.00 },
  { nome: "Aveia em flocos média", preco: 15.00 },
  { nome: "Azeitona sem caroço", preco: 42.00 },
  { nome: "Açúcar confeiteiro", preco: 10.00 },
  { nome: "Açúcar cristal", preco: 5.00 },
  { nome: "Biscoito salgado (cream craker)", preco: 18.00 },
  { nome: "Cacau em pó", preco: 70.00 },
  { nome: "Café infusão", preco: 8.00 },
  { nome: "Caldo de carne em pó", preco: 38.00 },
  { nome: "Caldo de legumes em pó", preco: 38.00 },
  { nome: "Canjica", preco: 10.00 },
  { nome: "Chocolate em barra", preco: 55.00 },
  { nome: "Chocolate em pó", preco: 45.00 },
  { nome: "Chocolate meio amargo", preco: 60.00 },
  { nome: "Coco ralado, seco", preco: 38.00 },
  { nome: "Cominho grão", preco: 60.00 },
  { nome: "Confeitos de chocolate", preco: 45.00 },
  { nome: "Doce de leite", preco: 26.00 },
  { nome: "Ervas de provence", preco: 120.00 },
  { nome: "Ervas finas", preco: 100.00 },
  { nome: "Ervilha seca", preco: 12.00 },
  { nome: "Farinha de amêndoa", preco: 95.00 },
  { nome: "Farinha de aveia", preco: 15.00 },
  { nome: "Farinha de Banana", preco: 45.00 },
  { nome: "Farinha de mandioca", preco: 10.00 },
  { nome: "Farinha láctea", preco: 42.00 },
  { nome: "Feijão", preco: 9.00 },
  { nome: "Feijão branco", preco: 15.00 },
  { nome: "Feijão Carioca", preco: 9.00 },
  { nome: "Feijão preto", preco: 10.00 },
  { nome: "Fermento biológico", preco: 65.00 },
  { nome: "Frutas em conserva", preco: 32.00 },
  { nome: "Fécula de batata", preco: 25.00 },
  { nome: "Geléia", preco: 35.00 },
  { nome: "Gengibre em pó", preco: 80.00 },
  { nome: "Glicose de milho", preco: 28.00 },
  { nome: "Mangerona", preco: 100.00 },
  { nome: "Manteiga sem sal", preco: 58.00 },
  { nome: "Massa capeletti fresca", preco: 45.00 },
  { nome: "Massa de lasanha fresca", preco: 28.00 },
  { nome: "Massa Espaguete fresca", preco: 28.00 },
  { nome: "Massa Espaguete Integral fresca", preco: 32.00 },
  { nome: "Massa fusili integral fresca", preco: 32.00 },
  { nome: "Massa penne integral fresca", preco: 32.00 },
  { nome: "Massa seca", preco: 11.00 },
  { nome: "Massa talharim fresca", preco: 28.00 },
  { nome: "Massa Torteloni Gorgonzola fresca", preco: 55.00 },
  { nome: "Melado", preco: 20.00 },
  { nome: "Mix de ervas", preco: 100.00 },
  { nome: "Molho de pimenta", preco: 25.00 },
  { nome: "Molho inglês", preco: 22.00 },
  { nome: "Moranga/abóbora", preco: 6.00 },
  { nome: "Mostarda", preco: 25.00 },
  { nome: "Mostarda em pó", preco: 70.00 },
  { nome: "Mostarda, folhas", preco: 18.00 },
  { nome: "Ovo", preco: 1.90 },
  { nome: "Ovos", preco: 1.90 },
  { nome: "Palmito em conserva", preco: 50.00 },
  { nome: "Passas de uva branca", preco: 30.00 },
  { nome: "Pimenta branca", preco: 130.00 },
  { nome: "Pimenta vermelha", preco: 25.00 },
  { nome: "Pimenta-do-reino moída", preco: 95.00 },
  { nome: "Polvilho azedo", preco: 14.00 },
  { nome: "Polvilho doce", preco: 12.00 },
  { nome: "Páprica doce", preco: 55.00 },
  { nome: "Páprica picante", preco: 60.00 },
  { nome: "Queijo gruyère", preco: 180.00 },
  { nome: "Quinoa", preco: 38.00 },
  { nome: "Sal grosso", preco: 4.00 },
  { nome: "Sal temperado", preco: 15.00 },
  { nome: "Sobrecoxa sem osso", preco: 20.00 },
  { nome: "Sálvia", preco: 120.00 },
  { nome: "Tofu", preco: 35.00 },
  { nome: "Tomilho", preco: 120.00 },
  { nome: "Trigo", preco: 8.00 },
  { nome: "Trigo para kibe", preco: 12.00 },
  { nome: "Vinagre", preco: 6.00 },
  { nome: "Vinagre de maçã", preco: 14.00 },
  { nome: "Xarope (diversos sabores)", preco: 25.00 },
];

const normalizar = (s) => (s || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const ingredientes = await base44.asServiceRole.entities.Ingrediente.list('nome', 1000);
    const sinonimos = await base44.asServiceRole.entities.SinonimosIngredientes.list('sinonimo', 2000);

    const ingredientesByNome = new Map();
    ingredientes.forEach((ing) => {
      ingredientesByNome.set(normalizar(ing.nome), ing);
    });

    const ingredienteIdMap = new Map();
    ingredientes.forEach((ing) => ingredienteIdMap.set(ing.id, ing));

    const sinonimoToIngrediente = new Map();
    sinonimos.forEach((s) => {
      const ing = ingredienteIdMap.get(s.ingrediente_id);
      if (ing) sinonimoToIngrediente.set(normalizar(s.sinonimo), ing);
    });

    const atualizados = [];
    const pulados = [];
    const nao_localizados = [];

    for (const item of LISTA_PRECOS) {
      const key = normalizar(item.nome);
      let ing = ingredientesByNome.get(key) || sinonimoToIngrediente.get(key);

      if (!ing) {
        nao_localizados.push(item.nome);
        continue;
      }

      const precoEmbalagemAtual = ing.preco_embalagem_rs || 0;
      const precoPorGAtual = ing.preco_por_g_rs || 0;

      if (precoEmbalagemAtual > 0 || precoPorGAtual > 0) {
        pulados.push({ nome: ing.nome, motivo: "já possui preço cadastrado" });
        continue;
      }

      let pesoEmbalagem = ing.peso_embalagem_g;
      if (normalizar(ing.nome) === normalizar("Manteiga sem sal") && (!pesoEmbalagem || pesoEmbalagem <= 0)) {
        pesoEmbalagem = 1000;
      }

      if (!pesoEmbalagem || pesoEmbalagem <= 0) {
        pulados.push({ nome: ing.nome, motivo: "sem peso de embalagem cadastrado" });
        continue;
      }

      const novoPrecoPorG = item.preco / pesoEmbalagem;

      await base44.asServiceRole.entities.Ingrediente.update(ing.id, {
        preco_embalagem_rs: item.preco,
        preco_por_g_rs: novoPrecoPorG,
        peso_embalagem_g: pesoEmbalagem,
        preco_atualizado_em: new Date().toISOString(),
        fonte_preco: "Manual",
      });

      atualizados.push({
        id: ing.id,
        nome: ing.nome,
        preco_embalagem_antes: precoEmbalagemAtual,
        preco_embalagem_depois: item.preco,
        preco_por_g_antes: precoPorGAtual,
        preco_por_g_depois: novoPrecoPorG,
      });
    }

    let receitasInvalidadas = 0;
    if (atualizados.length > 0) {
      const invalidacao = await invalidarCustosPorDependencias({
        entities: base44.asServiceRole.entities,
        ingredienteIds: atualizados.map((row) => row.id),
        motivo: 'preco_mestre_zerado_preenchido',
        origem: 'atualizar_precos_lote_zerados',
      });
      receitasInvalidadas = invalidacao.receitas_invalidadas || 0;
    }

    const log = await base44.asServiceRole.entities.AtualizacaoLotePrecosLog.create({
      data_execucao: new Date().toISOString(),
      total_atualizado: atualizados.length,
      total_pulado: pulados.length,
      total_nao_localizado: nao_localizados.length,
      atualizados,
      pulados,
      nao_localizados,
    });

    return Response.json({ log_id: log.id, total_atualizado: atualizados.length, receitas_invalidadas: receitasInvalidadas, total_pulado: pulados.length, total_nao_localizado: nao_localizados.length, atualizados, pulados, nao_localizados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});