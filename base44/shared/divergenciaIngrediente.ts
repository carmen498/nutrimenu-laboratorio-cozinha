// Fase 10.4.1 — classificação determinística de divergências ID × nome.
// A identidade canônica é ingrediente_id; ingrediente_nome é apenas cache.
// Nenhum fuzzy matching é permitido nesta camada.

export const normIngrediente = (v: any) => (v == null ? '' : String(v).trim())
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

export function construirIndiceNomes(ingredientes: any[] = []) {
  const map = new Map<string, Set<string>>();
  for (const ingrediente of ingredientes || []) {
    const key = normIngrediente(ingrediente?.nome);
    const id = String(ingrediente?.id || '').trim();
    if (!key || !id) continue;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(id);
  }
  return map;
}

export function construirIndiceSinonimos(sinonimos: any[] = []) {
  const map = new Map<string, Set<string>>();
  for (const row of sinonimos || []) {
    const key = normIngrediente(row?.sinonimo);
    const id = String(row?.ingrediente_id || '').trim();
    if (!key || !id) continue;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(id);
  }
  return map;
}

export function classificarDivergenciaIngrediente({
  item,
  ingredienteAtual,
  ingredienteMap,
  nomeIndex,
  sinonimoIndex,
}: any = {}) {
  const nomeCache = normIngrediente(item?.ingrediente_nome);
  const nomeMestreAtual = normIngrediente(ingredienteAtual?.nome);
  const idAtual = String(item?.ingrediente_id || '').trim();

  if (!idAtual || !ingredienteAtual) {
    return {
      divergente: false,
      acao: 'fora_escopo_id_ausente',
      motivo: 'ingrediente_atual_nao_encontrado',
      id_atual: idAtual || null,
    };
  }
  if (!nomeCache || nomeCache === nomeMestreAtual) {
    return { divergente: false, acao: 'sem_divergencia', id_atual: idAtual };
  }

  const canonicos = new Set(nomeIndex?.get(nomeCache) || []);
  const sinonimos = new Set(sinonimoIndex?.get(nomeCache) || []);
  const candidatos = new Set<string>([...canonicos, ...sinonimos]);
  const candidatosExistentes = [...candidatos].filter((id) => ingredienteMap?.has(id));
  const unicos = [...new Set(candidatosExistentes)];

  if (unicos.length === 1) {
    const destinoId = unicos[0];
    const destino = ingredienteMap.get(destinoId);
    if (destinoId === idAtual) {
      return {
        divergente: true,
        acao: 'normalizar_nome_cache',
        motivo: canonicos.has(idAtual) ? 'nome_canonico_mesmo_id' : 'sinonimo_exato_mesmo_id',
        id_atual: idAtual,
        destino_id: idAtual,
        destino_nome: destino?.nome || ingredienteAtual?.nome || '',
        evidencias: {
          nome_canonico: canonicos.has(idAtual),
          sinonimo_exato: sinonimos.has(idAtual),
        },
      };
    }
    return {
      divergente: true,
      acao: 'reapontar_id_exato',
      motivo: canonicos.has(destinoId) ? 'nome_canonico_exato_outro_id' : 'sinonimo_exato_outro_id',
      id_atual: idAtual,
      destino_id: destinoId,
      destino_nome: destino?.nome || '',
      evidencias: {
        nome_canonico: canonicos.has(destinoId),
        sinonimo_exato: sinonimos.has(destinoId),
      },
    };
  }

  return {
    divergente: true,
    acao: 'manual',
    motivo: unicos.length > 1 ? 'evidencia_exata_conflitante' : 'sem_evidencia_exata',
    id_atual: idAtual,
    candidatos: unicos.map((id) => ({ id, nome: ingredienteMap?.get(id)?.nome || '' })),
  };
}
