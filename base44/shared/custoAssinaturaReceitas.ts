import { gerarAssinaturaCusto } from './custoAssinatura.ts';

const txt = (v: any) => v == null ? '' : String(v).trim();
const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const positivo = (v: any) => num(v) > 0 ? num(v) : 0;

const norm = (v: any) => txt(v)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

function fnv1a64(input: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0');
}

function n(v: any) {
  return num(v).toFixed(10);
}

export function calcularPesoPrePreparoAssinatura(receita: any, itens: any[]) {
  const porcoes = positivo(receita?.porcoes_base) || 1;
  const parentsComFilhos = new Set((itens || []).map((i: any) => txt(i?.subreceita_parent_id)).filter(Boolean));
  const parentsCacheV2 = new Set((itens || [])
    .filter((i: any) => i?.subreceita_parent_id && i?.subreceita_cache === true && num(i?.subreceita_cache_versao) >= 2)
    .map((i: any) => txt(i.subreceita_parent_id)));

  return (itens || []).reduce((s: number, item: any) => {
    if (!item || item.tipo === 'grupo') return s;
    const parentId = txt(item.subreceita_parent_id);
    if (parentId) return parentsCacheV2.has(parentId) ? s : s + positivo(item.quantidade_por_porcao) * porcoes;
    if (item.tipo === 'subreceita') {
      if (parentsCacheV2.has(txt(item.id))) return s + positivo(item.quantidade_por_porcao) * porcoes;
      if (parentsComFilhos.has(txt(item.id))) return s;
    }
    return s + positivo(item.quantidade_por_porcao) * porcoes;
  }, 0);
}

export function rendimentoEfetivoAssinatura(receita: any, itens: any[]) {
  return positivo(receita?.peso_pos_preparo_total)
    || positivo(receita?.rendimento_total)
    || calcularPesoPrePreparoAssinatura(receita, itens);
}

function assinaturaExpansaoSubreceita({ receitaId, receitaMap, itensMap, pilha = [] }: any): string {
  if (!receitaId) return 'origem-ausente';
  if (pilha.includes(receitaId)) return `ciclo:${[...pilha, receitaId].join('>')}`;
  const receita = receitaMap.get(receitaId);
  if (!receita) return `origem-ausente:${receitaId}`;

  const itens = (itensMap.get(receitaId) || []).filter((i: any) => !i?.subreceita_parent_id && i?.tipo !== 'grupo');
  const linhas = [
    'EXP|v1',
    `R|${receitaId}|porcoes=${n(receita?.porcoes_base || 1)}|rendimento=${n(rendimentoEfetivoAssinatura(receita, itensMap.get(receitaId) || []))}|unidade=${txt(receita?.unidade_base || 'g')}`,
  ];

  for (const item of itens) {
    if (item.tipo === 'subreceita') {
      linhas.push([
        'S', txt(item.subreceita_id), n(item.quantidade_por_porcao), txt(item.unidade_quantidade),
        assinaturaExpansaoSubreceita({ receitaId: txt(item.subreceita_id), receitaMap, itensMap, pilha: [...pilha, receitaId] }),
      ].join('|'));
      continue;
    }
    linhas.push([
      'I', txt(item.ingrediente_id), norm(item.ingrediente_nome), n(item.quantidade_por_porcao),
      n(item.fator_correcao_override), txt(item.custo_comportamento), txt(item.unidade_quantidade),
    ].join('|'));
  }

  return `exp-v1-${fnv1a64(linhas.sort().join('\n'))}`;
}

export function criarGeradorAssinaturaCustoReceita({
  receitaMap,
  itensMap,
  insumosMap,
  esquecidosMap,
  ingredienteMap,
  resolverPrecoPorReceita,
}: any) {
  const memo = new Map<string, string>();

  return function gerarParaReceita(receita: any) {
    if (!receita?.id) return '';
    const contexto = receita.is_base === false ? 'proprietario' : 'global';
    const memoKey = `${receita.id}|${contexto}`;
    if (memo.has(memoKey)) return memo.get(memoKey)!;

    const itens = itensMap.get(receita.id) || [];
    const assinatura = gerarAssinaturaCusto({
      receita,
      itens,
      insumos: insumosMap.get(receita.id) || [],
      esquecidos: esquecidosMap.get(receita.id) || [],
      contexto,
      rendimento: rendimentoEfetivoAssinatura(receita, itens),
      resolverIngrediente: (id: string) => ingredienteMap.get(id) || null,
      resolverPreco: (ingrediente: any) => resolverPrecoPorReceita(receita, ingrediente),
      resolverAssinaturaSubreceita: (subreceitaId: string) => assinaturaExpansaoSubreceita({
        receitaId: subreceitaId,
        receitaMap,
        itensMap,
        pilha: [receita.id],
      }),
    });
    memo.set(memoKey, assinatura);
    return assinatura;
  };
}
