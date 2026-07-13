import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// READ-ONLY function: parses a structured recipe text and resolves each
// ingredient line against Ingrediente (exact name) or SinonimosIngredientes.
// NEVER creates, updates or deletes anything — pure parsing + lookup.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const texto = body.texto;
    if (!texto || !texto.trim()) {
      return Response.json({ error: 'Texto vazio' }, { status: 400 });
    }

    const lines = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    const stripAccents = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let nome = '';
    let categoria = '';
    let porcao = 0;
    const ingredienteLinhas = [];
    const preparoLinhas = [];
    let notaLinhas = [];

    // Section: 'header' | 'ingredientes' | 'preparo' | 'nota'
    let section = 'header';

    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const upperNoAcc = stripAccents(line).toUpperCase();

      if (upperNoAcc.startsWith('RECEITA:')) {
        nome = line.slice(line.indexOf(':') + 1).trim();
        continue;
      }
      if (upperNoAcc.startsWith('CATEGORIA:')) {
        categoria = line.slice(line.indexOf(':') + 1).trim();
        continue;
      }
      if (upperNoAcc.startsWith('PORCAO:') || upperNoAcc.startsWith('PORCOES:')) {
        const val = line.slice(line.indexOf(':') + 1).trim();
        porcao = parseFloat(val.replace(',', '.')) || 0;
        continue;
      }
      if (upperNoAcc === 'INGREDIENTES:' || upperNoAcc === 'INGREDIENTES') {
        section = 'ingredientes';
        continue;
      }
      if (upperNoAcc.startsWith('MODO DE PREPARO')) {
        section = 'preparo';
        continue;
      }
      if (upperNoAcc.startsWith('NOTA:')) {
        section = 'nota';
        const val = line.slice(line.indexOf(':') + 1).trim();
        if (val) notaLinhas.push(val);
        continue;
      }

      if (section === 'ingredientes') {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 3) continue; // ignore malformed lines
        const nomeTexto = parts[0];
        if (stripAccents(nomeTexto).toUpperCase() === 'TOTAL') continue; // TOTAL line ignored
        const prePreparo = parts[1] || '';
        const quantidade = parseFloat((parts[2] || '0').replace(',', '.')) || 0;
        ingredienteLinhas.push({ nome_texto: nomeTexto, pre_preparo: prePreparo, quantidade_g: quantidade });
      } else if (section === 'preparo') {
        preparoLinhas.push(line);
      } else if (section === 'nota') {
        notaLinhas.push(line);
      }
    }

    if (!nome) return Response.json({ error: 'Não foi possível identificar o nome da receita (linha RECEITA:)' }, { status: 400 });
    if (ingredienteLinhas.length === 0) return Response.json({ error: 'Nenhum ingrediente encontrado (seção INGREDIENTES:)' }, { status: 400 });

    // ── READ-ONLY lookups ──
    const ingredientesDb = await base44.entities.Ingrediente.list('-nome', 500);
    const sinonimos = await base44.entities.SinonimosIngredientes.list('-created_date', 2000);

    const porNome = {};
    ingredientesDb.forEach(ing => {
      if (ing.nome) porNome[ing.nome.toLowerCase().trim()] = ing;
    });
    const porSinonimo = {};
    sinonimos.forEach(s => {
      if (s.sinonimo) porSinonimo[s.sinonimo.toLowerCase().trim()] = s.ingrediente_id;
    });
    const ingredientesById = {};
    ingredientesDb.forEach(ing => { ingredientesById[ing.id] = ing; });

    const ingredientes = ingredienteLinhas.map(linha => {
      const key = linha.nome_texto.toLowerCase().trim();
      const keyNoParen = key.replace(/\s*\([^)]*\)/g, '').trim();
      let matched = porNome[key] || (keyNoParen !== key ? porNome[keyNoParen] : null);
      let viaSinonimo = false;
      if (!matched) {
        const ingId = porSinonimo[key] || (keyNoParen !== key ? porSinonimo[keyNoParen] : null);
        if (ingId && ingredientesById[ingId]) {
          matched = ingredientesById[ingId];
          viaSinonimo = true;
        }
      }
      return {
        nome_texto: linha.nome_texto,
        pre_preparo: linha.pre_preparo,
        quantidade_g: linha.quantidade_g,
        resolvido: !!matched,
        ingrediente_id: matched ? matched.id : null,
        ingrediente_nome: matched ? matched.nome : null,
        via_sinonimo: viaSinonimo,
      };
    });

    return Response.json({
      nome,
      categoria,
      porcao,
      ingredientes,
      modo_preparo: preparoLinhas.join('\n'),
      nota: notaLinhas.join('\n'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});