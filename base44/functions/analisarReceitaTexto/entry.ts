import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// READ-ONLY function: parses one or MULTIPLE structured recipe texts (each
// occurrence of a "RECEITA:" line starts a new recipe block) and resolves
// each ingredient line against Ingrediente (exact name) or SinonimosIngredientes.
// Also flags recipes whose name already exists in Receita (never overwritten).
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

    const stripAccents = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isSeparatorLine = (line) => /^[=\-_*]{3,}$/.test(line.trim());

    const allLines = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
      .filter((l) => !isSeparatorLine(l));

    // ── Split into blocks: each "RECEITA:" line starts a new recipe block ──
    const blocks = [];
    let current = null;
    for (const raw of allLines) {
      const line = raw.trim();
      if (!line) continue;
      const upperNoAcc = stripAccents(line).toUpperCase();
      if (upperNoAcc.startsWith('RECEITA:')) {
        current = [line];
        blocks.push(current);
      } else if (current) {
        current.push(line);
      }
      // lines appearing before the first "RECEITA:" are ignored
    }

    if (blocks.length === 0) {
      return Response.json({ error: 'Não foi possível identificar nenhuma receita (linha RECEITA:)' }, { status: 400 });
    }

    // ── Per-block parser (same logic as the original single-recipe parser) ──
    const parseBlock = (lines) => {
      let nome = '';
      let categoria = '';
      let porcao = 0;
      const ingredienteLinhas = [];
      const preparoLinhas = [];
      const notaLinhas = [];
      let section = 'header'; // 'header' | 'ingredientes' | 'preparo' | 'nota'

      for (const line of lines) {
        const upperNoAcc = stripAccents(line).toUpperCase();

        if (upperNoAcc.startsWith('RECEITA:')) {
          nome = line.slice(line.indexOf(':') + 1).trim();
          continue;
        }
        if (upperNoAcc.startsWith('CATEGORIA:')) {
          categoria = line.slice(line.indexOf(':') + 1).trim();
          continue;
        }
        // PC: é o campo atual (grava em per_capita_g). PORÇÃO:/PORÇÕES: é o nome
        // antigo do mesmo campo — mantido como alias, NUNCA como número de porções.
        if (upperNoAcc.startsWith('PC:') || upperNoAcc.startsWith('PORCAO:') || upperNoAcc.startsWith('PORCOES:')) {
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
          const parts = line.split('|').map((p) => p.trim());
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

      return {
        nome,
        categoria,
        porcao,
        ingredienteLinhas,
        modo_preparo: preparoLinhas.join('\n'),
        nota: notaLinhas.join('\n'),
      };
    };

    const parsedBlocks = blocks.map(parseBlock);

    // ── READ-ONLY lookups (shared across all blocks) ──
    // Paginado até o fim: um limite fixo deixava de fora ingredientes/receitas
    // comuns que caem fora da primeira página, gerando falsos "pendentes".
    const fetchAll = async (entityClient, sort, pageSize = 1000) => {
      let all = [];
      let skip = 0;
      let lastLen = pageSize;
      while (lastLen === pageSize) {
        const page = await entityClient.list(sort, pageSize, skip);
        all = all.concat(page);
        lastLen = page.length;
        skip += pageSize;
      }
      return all;
    };
    const ingredientesDb = await fetchAll(base44.entities.Ingrediente, '-nome');
    const sinonimos = await fetchAll(base44.entities.SinonimosIngredientes, '-created_date');
    const receitasExistentes = await fetchAll(base44.entities.Receita, '-nome');

    const porNome = {};
    ingredientesDb.forEach((ing) => {
      if (ing.nome) porNome[ing.nome.toLowerCase().trim()] = ing;
    });
    const porSinonimo = {};
    sinonimos.forEach((s) => {
      if (s.sinonimo) porSinonimo[s.sinonimo.toLowerCase().trim()] = s.ingrediente_id;
    });
    const ingredientesById = {};
    ingredientesDb.forEach((ing) => { ingredientesById[ing.id] = ing; });
    const nomesReceitasExistentes = new Set(
      receitasExistentes.filter((r) => r.nome).map((r) => r.nome.toLowerCase().trim())
    );

    const resolveIngrediente = (nomeTexto) => {
      const key = nomeTexto.toLowerCase().trim();
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
      return { matched, viaSinonimo };
    };

    const receitas = parsedBlocks.map((pb) => {
      if (!pb.nome) {
        return { nome: '(sem nome)', erro: 'Não foi possível identificar o nome da receita (linha RECEITA:)', ingredientes: [] };
      }
      if (pb.ingredienteLinhas.length === 0) {
        return { nome: pb.nome, erro: 'Nenhum ingrediente encontrado (seção INGREDIENTES:)', ingredientes: [] };
      }
      const ingredientes = pb.ingredienteLinhas.map((linha) => {
        const { matched, viaSinonimo } = resolveIngrediente(linha.nome_texto);
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
      return {
        nome: pb.nome,
        categoria: pb.categoria,
        porcao: pb.porcao,
        ingredientes,
        modo_preparo: pb.modo_preparo,
        nota: pb.nota,
        existe: nomesReceitasExistentes.has(pb.nome.toLowerCase().trim()),
      };
    });

    return Response.json({ receitas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});