import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FIXO_KEYWORDS = [
  "sal", "pimenta", "colorau", "páprica", "orégano", "manjericão",
  "tomilho", "alecrim", "louro", "noz moscada", "canela", "cravo",
  "curry", "açafrão", "ervas", "tempero", "condimento",
  "flor de sal", "azeitona", "alcaparra", "ciboulette",
  "salsinha", "cebolinha", "cheiro verde"
];

const FIXO_PREPARO_KEYWORDS = [
  "salpicar", "finalizar", "decorar", "polvilhar", "gratinar", "a gosto"
];

function isFixo(item) {
  const nome = (item.ingrediente_nome || "").toLowerCase().trim();
  const prePreparo = (item.pre_preparo || "").toLowerCase().trim();

  // N/A → proporcional
  if (nome === "n/a" || nome === "") return false;

  // Azeite só é fixo quando pré-preparo = finalizar
  if (nome.includes("azeite")) {
    return prePreparo.includes("finalizar");
  }

  // Verifica nome do ingrediente
  for (const kw of FIXO_KEYWORDS) {
    if (nome.includes(kw)) return true;
  }

  // Verifica pré-preparo
  for (const kw of FIXO_PREPARO_KEYWORDS) {
    if (prePreparo.includes(kw)) return true;
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allItems = await base44.asServiceRole.entities.IngredienteReceita.filter({});
    let proporcionalCount = 0;
    let fixoCount = 0;
    const updates = [];

    for (const item of allItems) {
      const fixo = isFixo(item);
      if (fixo && item.proporcional !== false) {
        updates.push(base44.asServiceRole.entities.IngredienteReceita.update(item.id, { proporcional: false }));
        fixoCount++;
      } else if (!fixo && item.proporcional === false) {
        updates.push(base44.asServiceRole.entities.IngredienteReceita.update(item.id, { proporcional: true }));
        proporcionalCount++;
      } else if (fixo) {
        fixoCount++;
      } else {
        proporcionalCount++;
      }
    }

    await Promise.all(updates);

    return Response.json({
      total: allItems.length,
      proporcional: proporcionalCount,
      fixo: fixoCount,
      alterados: updates.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});