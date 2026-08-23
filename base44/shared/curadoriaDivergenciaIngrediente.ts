import { normIngrediente } from './divergenciaIngrediente.ts';

export const DECISOES_DIVERGENCIA = [
  'confirmar_id_atual',
  'reapontar_ingrediente',
  'manter_pendente',
] as const;

const STOP = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'COM', 'SEM', 'E', 'AO', 'AOS', 'A', 'O', 'PARA']);

export const tokensIngrediente = (v: any) => normIngrediente(v)
  .split(' ')
  .filter((t) => t.length > 1 && !STOP.has(t))
  .map((t) => (t.length > 3 && t.endsWith('S') ? t.slice(0, -1) : t));

export function scoreCandidatoDivergencia(nomeBusca: string, candidato: any, categoriaOrigem = '') {
  const a = normIngrediente(nomeBusca);
  const b = normIngrediente(candidato?.nome);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const ta = new Set(tokensIngrediente(a));
  const tb = new Set(tokensIngrediente(b));
  if (!ta.size || !tb.size) return 0;
  let comuns = 0;
  for (const t of ta) if (tb.has(t)) comuns++;
  if (!comuns) return 0;
  const uniao = new Set([...ta, ...tb]).size || 1;
  let score = (comuns / uniao) * 60;
  if (a.includes(b) || b.includes(a)) score += 22;
  if (categoriaOrigem && String(candidato?.categoria || '') === categoriaOrigem) score += 8;
  return Math.min(99, score);
}

export function sugestoesDivergencia(nome: string, ingredientes: any[], categoria = '', excluirId = '', exatos: any[] = []) {
  const porId = new Map<string, any>();
  for (const c of exatos || []) {
    if (!c?.id || c.id === excluirId) continue;
    const ingrediente = ingredientes.find((i: any) => i?.id === c.id);
    if (ingrediente) porId.set(c.id, { ...ingrediente, score: 100, evidencia: 'exata' });
  }
  for (const ingrediente of ingredientes || []) {
    if (!ingrediente?.id || ingrediente.id === excluirId || porId.has(ingrediente.id)) continue;
    const score = scoreCandidatoDivergencia(nome, ingrediente, categoria);
    if (score < 12) continue;
    porId.set(ingrediente.id, { ...ingrediente, score: Number(score.toFixed(1)), evidencia: 'similaridade' });
  }
  return [...porId.values()]
    .sort((a, b) => Number(b.score) - Number(a.score) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
    .slice(0, 10)
    .map((i) => ({ id: i.id, nome: i.nome, categoria: i.categoria || null, score: i.score, evidencia: i.evidencia }));
}

export function validarDecisaoDivergencia({ decisao, ingredienteDestinoId, ingredienteOrigemId, observacao }: any = {}) {
  if (!DECISOES_DIVERGENCIA.includes(decisao)) return 'Decisão inválida.';
  if (decisao === 'reapontar_ingrediente' && !String(ingredienteDestinoId || '').trim()) return 'Selecione o ingrediente mestre de destino.';
  if (decisao === 'reapontar_ingrediente' && String(ingredienteDestinoId) === String(ingredienteOrigemId || '')) {
    return 'O destino é o mesmo ID atual; use “confirmar ID atual”.';
  }
  if (decisao !== 'manter_pendente' && String(observacao || '').trim().length < 8) {
    return 'Informe uma justificativa técnica com pelo menos 8 caracteres.';
  }
  return '';
}
