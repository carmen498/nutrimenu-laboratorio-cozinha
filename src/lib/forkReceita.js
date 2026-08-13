import { base44 } from "@/api/base44Client";

/**
 * Garante que o usuário atual pode editar a receita diretamente.
 *
 * - Admins sempre editam a receita original diretamente (sem cópia).
 * - Não-admins editando uma receita já pessoal (is_base=false) editam direto.
 * - Não-admins editando uma receita do catálogo (is_base=true):
 *   - Se já existir uma cópia pessoal desta receita (receita_origem_id + usuario_dono_id),
 *     NÃO cria outra — retorna blocked=true e existingCopyId para o chamador avisar o usuário.
 *   - Caso contrário, faz uma cópia completa (receita + ingredientes + tags), marcada
 *     is_base=false, forked_from_id/receita_origem_id apontando para a original,
 *     usuario_dono_id = usuário atual e data_personalizacao = agora. A edição deve
 *     ser aplicada pelo chamador na receita/id retornados — nunca na original.
 *
 * Retorna { receitaId, mapItemId, forked, blocked, existingCopyId }.
 */
export async function garantirReceitaEditavel({ receita, itens = [], receitaTags = [], isAdmin, userId }) {
  if (!receita) return { receitaId: null, mapItemId: (x) => x, forked: false };

  if (isAdmin || receita.is_base === false) {
    return { receitaId: receita.id, mapItemId: (x) => x, mapTagId: (x) => x, forked: false };
  }

  const copiasExistentes = await base44.entities.Receita.filter({
    receita_origem_id: receita.id,
    usuario_dono_id: userId,
  });
  if (copiasExistentes.length > 0) {
    return { receitaId: null, mapItemId: (x) => x, mapTagId: (x) => x, forked: false, blocked: true, existingCopyId: copiasExistentes[0].id };
  }

  const { id: _oldId, created_date, updated_date, created_by_id, created_by, is_base, forked_from_id, receita_origem_id, usuario_dono_id, data_personalizacao, ...rest } = receita;
  const nova = await base44.entities.Receita.create({
    ...rest,
    is_base: false,
    forked_from_id: receita.id,
    receita_origem_id: receita.id,
    usuario_dono_id: userId,
    data_personalizacao: new Date().toISOString(),
  });

  const idMap = {};
  const criados = [];
  for (const item of itens) {
    const { id: oldItemId, created_date: cd, updated_date: ud, created_by_id: cb, created_by: cbn, subreceita_parent_id, ...irest } = item;
    const novoItem = await base44.entities.IngredienteReceita.create({ ...irest, receita_id: nova.id });
    idMap[oldItemId] = novoItem.id;
    criados.push({ novoItem, subreceita_parent_id });
  }

  const parentUpdates = criados
    .filter(({ subreceita_parent_id }) => subreceita_parent_id && idMap[subreceita_parent_id])
    .map(({ novoItem, subreceita_parent_id }) => ({ id: novoItem.id, subreceita_parent_id: idMap[subreceita_parent_id] }));
  if (parentUpdates.length > 0) {
    await base44.entities.IngredienteReceita.bulkUpdate(parentUpdates);
  }

  const tagIdMap = {};
  for (const rt of receitaTags) {
    const novoTag = await base44.entities.ReceitaTag.create({
      receita_id: nova.id,
      tag_id: rt.tag_id,
      tag_nome: rt.tag_nome,
      tag_grupo: rt.tag_grupo,
      tag_cor: rt.tag_cor,
    });
    tagIdMap[rt.id] = novoTag.id;
  }

  return {
    receitaId: nova.id,
    mapItemId: (oldItemId) => idMap[oldItemId] || oldItemId,
    mapTagId: (oldTagId) => tagIdMap[oldTagId] || oldTagId,
    forked: true,
  };
}