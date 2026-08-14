import { base44 } from "@/api/base44Client";

/**
 * Garante que o usuário atual pode editar o cardápio diretamente.
 *
 * - Admins sempre editam o cardápio original diretamente (sem cópia).
 * - Não-admins editando um cardápio já pessoal (is_base=false) editam direto.
 * - Não-admins editando um cardápio do catálogo (is_base=true):
 *   - Se já existir uma cópia pessoal deste cardápio (cardapio_origem_id + usuario_dono_id),
 *     NÃO cria outra — retorna blocked=true e existingCopyId para o chamador avisar o usuário.
 *   - Caso contrário, faz uma cópia completa (cardápio + receitas + insumos + tags), marcada
 *     is_base=false, forked_from_id/cardapio_origem_id apontando para o original,
 *     usuario_dono_id = usuário atual e data_personalizacao = agora.
 *
 * Retorna { cardapioId, novoCardapio, novasReceitas, novosInsumos, novasTags,
 *           mapReceitaItemId, mapInsumoId, mapTagId, forked, blocked, existingCopyId }.
 */
export async function garantirCardapioEditavel({ cardapio, receitas = [], insumos = [], cardapioTags = [], isAdmin, userId }) {
  if (!cardapio) {
    return { cardapioId: null, mapReceitaItemId: (x) => x, mapInsumoId: (x) => x, mapTagId: (x) => x, forked: false };
  }

  if (isAdmin || cardapio.is_base === false) {
    return { cardapioId: cardapio.id, mapReceitaItemId: (x) => x, mapInsumoId: (x) => x, mapTagId: (x) => x, forked: false };
  }

  const copiasExistentes = await base44.entities.Cardapio.filter({
    cardapio_origem_id: cardapio.id,
    usuario_dono_id: userId,
  });
  if (copiasExistentes.length > 0) {
    return {
      cardapioId: null, mapReceitaItemId: (x) => x, mapInsumoId: (x) => x, mapTagId: (x) => x,
      forked: false, blocked: true, existingCopyId: copiasExistentes[0].id,
    };
  }

  const { id: _oldId, created_date, updated_date, created_by_id, created_by, is_base, forked_from_id, cardapio_origem_id, usuario_dono_id, data_personalizacao, ...rest } = cardapio;
  const novoCardapio = await base44.entities.Cardapio.create({
    ...rest,
    is_base: false,
    forked_from_id: cardapio.id,
    cardapio_origem_id: cardapio.id,
    usuario_dono_id: userId,
    data_personalizacao: new Date().toISOString(),
  });

  const mapReceitaItem = {};
  const novasReceitas = [];
  for (const r of receitas) {
    const { id: oldId, created_date: cd, updated_date: ud, created_by_id: cb, created_by: cbn, ...rrest } = r;
    const novoItem = await base44.entities.CardapioReceita.create({ ...rrest, cardapio_id: novoCardapio.id });
    mapReceitaItem[oldId] = novoItem.id;
    novasReceitas.push(novoItem);
  }

  const mapInsumo = {};
  const novosInsumos = [];
  for (const i of insumos) {
    const { id: oldId, created_date: cd, updated_date: ud, created_by_id: cb, created_by: cbn, ...irest } = i;
    const novoItem = await base44.entities.CardapioInsumo.create({ ...irest, cardapio_id: novoCardapio.id });
    mapInsumo[oldId] = novoItem.id;
    novosInsumos.push(novoItem);
  }

  const mapTag = {};
  const novasTags = [];
  for (const t of cardapioTags) {
    const { id: oldId, created_date: cd, updated_date: ud, created_by_id: cb, created_by: cbn, ...trest } = t;
    const novoItem = await base44.entities.CardapioTag.create({ ...trest, cardapio_id: novoCardapio.id });
    mapTag[oldId] = novoItem.id;
    novasTags.push(novoItem);
  }

  return {
    cardapioId: novoCardapio.id,
    novoCardapio,
    novasReceitas,
    novosInsumos,
    novasTags,
    mapReceitaItemId: (oldId) => mapReceitaItem[oldId] || oldId,
    mapInsumoId: (oldId) => mapInsumo[oldId] || oldId,
    mapTagId: (oldId) => mapTag[oldId] || oldId,
    forked: true,
  };
}