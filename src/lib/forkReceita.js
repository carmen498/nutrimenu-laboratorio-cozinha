import { criarIngredienteReceita, criarReceitaTag } from '@/lib/secureChildEntities';
import { criarReceitaSegura } from '@/lib/secureRootEntities';
import {
  construirLinhagemDerivada,
  resolverReceitaRaizId,
  TIPOS_LINHAGEM_RECEITA,
} from '@/lib/receitaLineage';
import { base44 } from "@/api/base44Client";

/**
 * Garante que o usuário atual pode editar a receita diretamente.
 *
 * Fase 9:
 * - is_base define catálogo x pessoal;
 * - usuario_dono_id é a propriedade canônica;
 * - receita_origem_id é a origem imediata;
 * - receita_raiz_id preserva o ancestral original;
 * - forked_from_id permanece como alias legado da personalização.
 */
export async function garantirReceitaEditavel({ receita, itens = [], receitaTags = [], isAdmin, userId }) {
  if (!receita) return { receitaId: null, mapItemId: (x) => x, forked: false };

  if (isAdmin || receita.is_base === false) {
    return { receitaId: receita.id, mapItemId: (x) => x, mapTagId: (x) => x, forked: false };
  }

  const raizId = resolverReceitaRaizId(receita) || receita.id;
  let copiasExistentes = await base44.entities.Receita.filter({
    receita_raiz_id: raizId,
    usuario_dono_id: userId,
    linhagem_tipo: TIPOS_LINHAGEM_RECEITA.PERSONALIZACAO,
  }, "-data_personalizacao", 20);

  // Compatibilidade com forks criados antes da Fase 9.
  if (copiasExistentes.length === 0) {
    copiasExistentes = await base44.entities.Receita.filter({
      receita_origem_id: receita.id,
      usuario_dono_id: userId,
    }, "-data_personalizacao", 20);
  }

  if (copiasExistentes.length > 0) {
    return {
      receitaId: null,
      mapItemId: (x) => x,
      mapTagId: (x) => x,
      forked: false,
      blocked: true,
      existingCopyId: copiasExistentes[0].id,
    };
  }

  const {
    id: _oldId,
    created_date,
    updated_date,
    created_by_id,
    created_by,
    is_base,
    forked_from_id,
    receita_origem_id,
    receita_raiz_id,
    usuario_dono_id,
    data_personalizacao,
    linhagem_geracao,
    linhagem_tipo,
    linhagem_versao,
    linhagem_status,
    ...rest
  } = receita;

  const nova = await criarReceitaSegura({
    ...rest,
    __linhagem: construirLinhagemDerivada(receita, TIPOS_LINHAGEM_RECEITA.PERSONALIZACAO),
  });

  const idMap = {};
  const criados = [];
  for (const item of itens) {
    const { id: oldItemId, created_date: cd, updated_date: ud, created_by_id: cb, created_by: cbn, subreceita_parent_id, ...irest } = item;
    const novoItem = await criarIngredienteReceita({ ...irest, receita_id: nova.id });
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
    const novoTag = await criarReceitaTag({
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