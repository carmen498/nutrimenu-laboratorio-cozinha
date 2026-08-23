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

// Equivalências semânticas de alta confiança já aprovadas na Fase 10.2.
// Não são fuzzy: alias e destino são textos exatos normalizados. Se o destino
// canônico não existir de forma única, a evidência é descartada; se conflitar
// com nome canônico/sinônimo persistido, a classificação final fica manual.
export const ALIASES_SEGUROS_CUSTO = new Map<string, string>([
  [normIngrediente('Presunto'), normIngrediente('Embutido, presunto')],
  [normIngrediente('Cogumelo em conserva'), normIngrediente('Cogumelos em conserva')],
  [normIngrediente('Arroz arbório'), normIngrediente('Arroz arbóreo')],
  [normIngrediente('Abóbora'), normIngrediente('Abóbora, qualquer tipo')],
  [normIngrediente('Ovos'), normIngrediente('Ovos, unidade')],
  [normIngrediente('Peru'), normIngrediente('Peru, ave inteira')],
  [normIngrediente('Camarão médio'), normIngrediente('Camarão m')],
  [normIngrediente('Lombinho de suíno'), normIngrediente('Suíno, lombo')],
  [normIngrediente('Língua'), normIngrediente('Miúdos do boi, língua')],
  [normIngrediente('Mangericão'), normIngrediente('Manjericão')],
  [normIngrediente('Damascos'), normIngrediente('Damasco')],
  [normIngrediente('Gotas de chocolate'), normIngrediente('Chocolate em gotas')],
  [normIngrediente('Salsão'), normIngrediente('Aipo')],
  [normIngrediente('Mandioca'), normIngrediente('Aipim (mandioca/macaxeira)')],
  [normIngrediente('Bicarbonato'), normIngrediente('Bicarbonato de sódio')],
  [normIngrediente('Cerejas'), normIngrediente('Cereja')],
  [normIngrediente('Clara de ovo'), normIngrediente('Ovos, claras')],
  [normIngrediente('Claras de ovo'), normIngrediente('Ovos, claras')],
  [normIngrediente('Maracujás'), normIngrediente('Maracujá')],
  [normIngrediente('Morangos'), normIngrediente('Morango')],
  [normIngrediente('Sementes de chia'), normIngrediente('Chia')],
  [normIngrediente('Farinha de milho flocão'), normIngrediente('Farinha de milho flocada')],
  [normIngrediente('Milho verde em conserva'), normIngrediente('Milho em conserva')],
  [normIngrediente('Alcaparras à granel'), normIngrediente('Alcaparras')],
  [normIngrediente('Mondongo'), normIngrediente('Miúdos do boi, mondongo')],
  [normIngrediente('Maminha'), normIngrediente('Carne, maminha do alcatra')],
  [normIngrediente('Pêssegos'), normIngrediente('Pêssego')],
  [normIngrediente('Salsinha'), normIngrediente('Salsa')],
  [normIngrediente('Parmesão'), normIngrediente('Queijo parmesão')],
  [normIngrediente('Abobrinha zuccini'), normIngrediente('Abobrinha verde')],
  [normIngrediente('Peru 4kg'), normIngrediente('Peru, ave inteira')],
  [normIngrediente('Filé de frango'), normIngrediente('Frango, peito sem osso (filé)')],
  [normIngrediente('Fines-herbes'), normIngrediente('Ervas finas')],
  [normIngrediente('Patas'), normIngrediente('Miúdos do boi, patas (mocotó)')],
  [normIngrediente('Mini berinjelas'), normIngrediente('Berinjelas (mini )')],
  [normIngrediente('Linguiça de frango'), normIngrediente('Frango, linguiça')],
  [normIngrediente('Presunto de Parma'), normIngrediente('Embutido, presunto de parma')],
  [normIngrediente('Salame'), normIngrediente('Embutido, salame')],
  [normIngrediente('Lombo canadense'), normIngrediente('Embutido, lombo canadense')],
  [normIngrediente('Linguiça de porco'), normIngrediente('Suino, linguiça')],
  [normIngrediente('Picanha'), normIngrediente('Carne, picanha')],
]);

export function construirIndiceAliasesSeguros(nomeIndex: Map<string, Set<string>>) {
  const map = new Map<string, Set<string>>();
  for (const [alias, destinoNome] of ALIASES_SEGUROS_CUSTO.entries()) {
    const ids = [...(nomeIndex.get(destinoNome) || [])];
    if (ids.length === 1) map.set(alias, new Set(ids));
  }
  return map;
}

export function classificarDivergenciaIngrediente({
  item,
  ingredienteAtual,
  ingredienteMap,
  nomeIndex,
  sinonimoIndex,
  aliasSeguroIndex,
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
  const aliasesSeguros = new Set(aliasSeguroIndex?.get(nomeCache) || []);
  const candidatos = new Set<string>([...canonicos, ...sinonimos, ...aliasesSeguros]);
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
          alias_seguro: aliasesSeguros.has(idAtual),
        },
      };
    }
    // Sinônimo persistido sozinho é evidência suficiente para dizer que o cache
    // textual pode representar o ID atual, mas NÃO para trocar identidade entre
    // mestres. Reapontamento automático exige nome canônico exato ou alias seguro
    // previamente aprovado; isso evita generalizações como "Aspargos"→"frescos".
    if (!canonicos.has(destinoId) && !aliasesSeguros.has(destinoId)) {
      return {
        divergente: true,
        acao: 'manual',
        motivo: 'sinonimo_exato_outro_id_requer_curadoria',
        id_atual: idAtual,
        candidatos: [{ id: destinoId, nome: destino?.nome || '' }],
      };
    }
    return {
      divergente: true,
      acao: 'reapontar_id_exato',
      motivo: canonicos.has(destinoId) ? 'nome_canonico_exato_outro_id' : 'alias_seguro_outro_id',
      id_atual: idAtual,
      destino_id: destinoId,
      destino_nome: destino?.nome || '',
      evidencias: {
        nome_canonico: canonicos.has(destinoId),
        sinonimo_exato: sinonimos.has(destinoId),
        alias_seguro: aliasesSeguros.has(destinoId),
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
