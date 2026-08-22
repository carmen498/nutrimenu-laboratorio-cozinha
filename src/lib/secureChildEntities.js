import { base44 } from '@/api/base44Client';

const parentCache = new Map();

async function carregarPai(tipo, id) {
  if (!id) throw new Error(`ID do ${tipo} pai é obrigatório.`);

  const chave = `${tipo}:${id}`;
  if (!parentCache.has(chave)) {
    const entity = tipo === 'receita' ? base44.entities.Receita : base44.entities.Cardapio;
    parentCache.set(chave, entity.get(id));
  }

  try {
    return await parentCache.get(chave);
  } catch (error) {
    parentCache.delete(chave);
    throw error;
  }
}

function metadadosDoPai(pai) {
  const isBase = pai?.is_base === true;
  return {
    is_base: isBase,
    usuario_dono_id: isBase ? null : (pai?.usuario_dono_id || pai?.created_by_id || null),
  };
}

async function criarFilhoReceita(entityName, payload) {
  const pai = await carregarPai('receita', payload?.receita_id);
  const dados = { ...payload };

  // Fase 4: todo novo IngredienteReceita nasce com unidade canônica. Fluxos
  // antigos não precisam conhecer o novo campo; o helper deriva da receita-pai.
  if (entityName === 'IngredienteReceita' && !dados.unidade_quantidade) {
    dados.unidade_quantidade = pai?.unidade_base === 'ml' ? 'ml' : 'g';
  }

  return base44.entities[entityName].create({
    ...dados,
    ...metadadosDoPai(pai),
  });
}

async function criarFilhoCardapio(entityName, payload) {
  const pai = await carregarPai('cardapio', payload?.cardapio_id);
  return base44.entities[entityName].create({
    ...payload,
    ...metadadosDoPai(pai),
  });
}

export const criarIngredienteReceita = (payload) => criarFilhoReceita('IngredienteReceita', payload);
export const criarReceitaTag = (payload) => criarFilhoReceita('ReceitaTag', payload);
export const criarInsumoReceita = (payload) => criarFilhoReceita('InsumoReceita', payload);
export const criarIngredienteEsquecidoReceita = (payload) => criarFilhoReceita('IngredienteEsquecidoReceita', payload);

export const criarCardapioReceita = (payload) => criarFilhoCardapio('CardapioReceita', payload);
export const criarCardapioInsumo = (payload) => criarFilhoCardapio('CardapioInsumo', payload);
export const criarCardapioTag = (payload) => criarFilhoCardapio('CardapioTag', payload);

export function invalidarCacheFilhoSeguro(tipo, id) {
  parentCache.delete(`${tipo}:${id}`);
}
