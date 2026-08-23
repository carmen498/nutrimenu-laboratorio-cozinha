import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { invalidarCustosPorDependencias } from '../../shared/invalidacaoCusto.ts';

// ── Conversor embutido (mesmo JSON do frontend) ──
const DATA = {"utensilios_base":{"itens":[{"medida":"colher de cafezinho","aliases":["colher café","colherinha"],"ml":2},{"medida":"colher de chá","aliases":["col. chá","colher chá"],"ml":5},{"medida":"colher de sobremesa","aliases":["col. sobremesa"],"ml":10},{"medida":"colher de sopa","aliases":["col. sopa","colher sopa","c.s."],"ml":15},{"medida":"xícara de café","aliases":["xíc. café","xícara café"],"ml":50},{"medida":"xícara de chá","aliases":["xíc. chá","xícara chá","xícara","1 xíc."],"ml":150},{"medida":"copo americano","aliases":["copo","copo americano"],"ml":200},{"medida":"copo duplo","aliases":["copo requeijão","copo grande"],"ml":250},{"medida":"xícara grande","aliases":["xícara americana"],"ml":240},{"medida":"pitada","aliases":["uma pitada"],"ml":null,"g":0.5},{"medida":"gota","aliases":["gotas"],"ml":0.05}]},"conversoes_por_ingrediente":{"itens":[{"ingrediente":"Farinha de trigo","aliases":["farinha","farinha branca","farinha de trigo especial"],"conversoes":[{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10},{"medida":"colher de chá","g":3},{"medida":"copo americano","g":160}]},{"ingrediente":"Farinha de rosca","aliases":["farinha de pão","farinha de rosca"],"conversoes":[{"medida":"xícara de chá","g":100},{"medida":"colher de sopa","g":8}]},{"ingrediente":"Farinha de milho","aliases":["fubá","farinha de milho fina","farinha de milho média","farinha de milho grossa"],"conversoes":[{"medida":"xícara de chá","g":130},{"medida":"colher de sopa","g":10}]},{"ingrediente":"Amido de milho","aliases":["maisena","amido","fécula de milho"],"conversoes":[{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10},{"medida":"colher de chá","g":3}]},{"ingrediente":"Aveia em flocos","aliases":["aveia","flocos de aveia","aveia em flocos finos","aveia em flocos grossos"],"conversoes":[{"medida":"xícara de chá","g":80},{"medida":"colher de sopa","g":8}]},{"ingrediente":"Açúcar refinado","aliases":["açúcar","açúcar branco","açúcar comum"],"conversoes":[{"medida":"xícara de chá","g":180},{"medida":"colher de sopa","g":12},{"medida":"colher de chá","g":4},{"medida":"copo americano","g":240}]},{"ingrediente":"Açúcar de confeiteiro","aliases":["açúcar impalpável","açúcar de glaçúcar","açúcar fino"],"conversoes":[{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10}]},{"ingrediente":"Açúcar mascavo","aliases":["açúcar mascavo","açúcar demerara"],"conversoes":[{"medida":"xícara de chá","g":200},{"medida":"colher de sopa","g":14}]},{"ingrediente":"Mel","aliases":["mel de abelha","mel puro"],"conversoes":[{"medida":"colher de sopa","g":20},{"medida":"colher de chá","g":7},{"medida":"xícara de chá","g":300}]},{"ingrediente":"Chocolate em pó","aliases":["achocolatado em pó","chocolate em pó 50%","chocolate em pó solúvel"],"conversoes":[{"medida":"xícara de chá","g":100},{"medida":"colher de sopa","g":8},{"medida":"colher de chá","g":3}]},{"ingrediente":"Cacau em pó","aliases":["cacau","cacau puro","cacau 100%","pó de cacau"],"conversoes":[{"medida":"xícara de chá","g":85},{"medida":"colher de sopa","g":7},{"medida":"colher de chá","g":2}]},{"ingrediente":"Manteiga","aliases":["manteiga sem sal","manteiga com sal","margarina"],"conversoes":[{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5},{"medida":"xícara de chá","g":220}]},{"ingrediente":"Óleo","aliases":["óleo de soja","óleo vegetal","óleo de girassol","óleo de canola"],"conversoes":[{"medida":"colher de sopa","g":12},{"medida":"colher de chá","g":4},{"medida":"xícara de chá","g":200},{"medida":"copo americano","g":180}]},{"ingrediente":"Azeite de oliva","aliases":["azeite","azeite extravirgem"],"conversoes":[{"medida":"colher de sopa","g":12},{"medida":"colher de chá","g":4},{"medida":"xícara de chá","g":200}]},{"ingrediente":"Creme de leite fresco","aliases":["nata","creme de leite","creme de leite fresco"],"conversoes":[{"medida":"colher de sopa","g":15},{"medida":"xícara de chá","g":240},{"medida":"copo americano","g":200}]},{"ingrediente":"Leite","aliases":["leite integral","leite desnatado","leite semidesnatado","leite líquido"],"conversoes":[{"medida":"xícara de chá","g":240},{"medida":"copo americano","g":200},{"medida":"colher de sopa","g":15}]},{"ingrediente":"Leite em pó","aliases":["leite em pó integral","leite em pó desnatado"],"conversoes":[{"medida":"xícara de chá","g":120},{"medida":"colher de sopa","g":10}]},{"ingrediente":"Iogurte","aliases":["iogurte natural","iogurte grego"],"conversoes":[{"medida":"xícara de chá","g":240},{"medida":"colher de sopa","g":20}]},{"ingrediente":"Sal","aliases":["sal refinado","sal grosso","sal marinho"],"conversoes":[{"medida":"colher de chá","g":5},{"medida":"colher de sopa","g":15},{"medida":"pitada","g":0.5}]},{"ingrediente":"Fermento em pó","aliases":["fermento químico","pó royal","fermento para bolo"],"conversoes":[{"medida":"colher de chá","g":4},{"medida":"colher de sopa","g":12}]},{"ingrediente":"Fermento biológico seco","aliases":["fermento seco","fermento instantâneo"],"conversoes":[{"medida":"colher de chá","g":3},{"medida":"colher de sopa","g":9}]},{"ingrediente":"Bicarbonato de sódio","aliases":["bicarbonato"],"conversoes":[{"medida":"colher de chá","g":5},{"medida":"colher de sopa","g":14}]},{"ingrediente":"Canela em pó","aliases":["canela"],"conversoes":[{"medida":"colher de chá","g":2.5},{"medida":"colher de sopa","g":7}]},{"ingrediente":"Orégano","aliases":["orégano seco","orégano desidratado"],"conversoes":[{"medida":"colher de chá","g":1.5},{"medida":"colher de sopa","g":4}]},{"ingrediente":"Páprica","aliases":["páprica doce","páprica defumada","colorau"],"conversoes":[{"medida":"colher de chá","g":2.5},{"medida":"colher de sopa","g":7}]},{"ingrediente":"Pimenta-do-reino","aliases":["pimenta do reino","pimenta moída","pimenta em grão"],"conversoes":[{"medida":"colher de chá","g":2},{"medida":"colher de sopa","g":6}]},{"ingrediente":"Ervas finas","aliases":["fines herbes","fines-herbes","mix de ervas"],"conversoes":[{"medida":"colher de chá","g":1},{"medida":"colher de sopa","g":3}]},{"ingrediente":"Ovo","aliases":["ovo de galinha","ovos"],"conversoes":[{"medida":"unidade P","g":40},{"medida":"unidade M","g":50},{"medida":"unidade G","g":60},{"medida":"unidade GG","g":70},{"medida":"unidade","g":50}]},{"ingrediente":"Gema de ovo","aliases":["gema","gemas"],"conversoes":[{"medida":"unidade","g":18}]},{"ingrediente":"Clara de ovo","aliases":["clara","claras"],"conversoes":[{"medida":"unidade","g":33}]},{"ingrediente":"Cebola","aliases":["cebola roxa","cebola branca"],"conversoes":[{"medida":"unidade P","g":70},{"medida":"unidade M","g":100},{"medida":"unidade G","g":150},{"medida":"unidade","g":100}]},{"ingrediente":"Alho","aliases":["dente de alho","alho picado"],"conversoes":[{"medida":"dente","g":5},{"medida":"unidade","g":5},{"medida":"colher de sopa","g":10},{"medida":"colher de chá","g":3}]},{"ingrediente":"Tomate","aliases":["tomate italiano","tomate caqui","tomate cereja"],"conversoes":[{"medida":"unidade P","g":80},{"medida":"unidade M","g":120},{"medida":"unidade G","g":160},{"medida":"unidade","g":120}]},{"ingrediente":"Limão","aliases":["limão taiti","limão siciliano","limão cravo"],"conversoes":[{"medida":"unidade P","g":60},{"medida":"unidade M","g":80},{"medida":"unidade G","g":100},{"medida":"unidade","g":80},{"medida":"suco de 1 unidade","g":30}]},{"ingrediente":"Cenoura","aliases":["cenoura crua"],"conversoes":[{"medida":"unidade P","g":60},{"medida":"unidade M","g":80},{"medida":"unidade G","g":120},{"medida":"unidade","g":80}]},{"ingrediente":"Batata","aliases":["batata inglesa","batata comum"],"conversoes":[{"medida":"unidade P","g":100},{"medida":"unidade M","g":150},{"medida":"unidade G","g":200},{"medida":"unidade","g":150}]},{"ingrediente":"Banana","aliases":["banana prata","banana nanica","banana da terra"],"conversoes":[{"medida":"unidade P","g":80},{"medida":"unidade M","g":100},{"medida":"unidade G","g":130},{"medida":"unidade","g":100}]},{"ingrediente":"Maçã","aliases":["maçã fuji","maçã gala"],"conversoes":[{"medida":"unidade M","g":150},{"medida":"unidade G","g":200},{"medida":"unidade","g":150}]},{"ingrediente":"Queijo parmesão","aliases":["parmesão ralado","queijo parmesão ralado"],"conversoes":[{"medida":"colher de sopa","g":10},{"medida":"xícara de chá","g":100}]},{"ingrediente":"Extrato de tomate","aliases":["extrato de tomate concentrado"],"conversoes":[{"medida":"colher de sopa","g":18},{"medida":"colher de chá","g":6}]},{"ingrediente":"Molho de soja","aliases":["shoyu","soja"],"conversoes":[{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5}]},{"ingrediente":"Água","aliases":["água fria","água quente","água morna"],"conversoes":[{"medida":"xícara de chá","g":240},{"medida":"copo americano","g":200},{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5}]},{"ingrediente":"Vinagre","aliases":["vinagre de vinho","vinagre de maçã","vinagre branco"],"conversoes":[{"medida":"colher de sopa","g":15},{"medida":"colher de chá","g":5}]}]},"fracoes":{"1/2":0.5,"1/3":0.333,"1/4":0.25,"3/4":0.75,"2/3":0.667,"1 e 1/2":1.5,"1 e 1/4":1.25,"1 e 3/4":1.75}};

// ── Helpers ──
const normalizarMedida = (txt) => {
  const lower = (txt || "").toLowerCase().trim();
  for (const u of DATA.utensilios_base.itens) {
    for (const alias of u.aliases) { if (lower.includes(alias.toLowerCase())) return u.medida; }
    if (lower.includes(u.medida.toLowerCase())) return u.medida;
  }
  for (const ing of DATA.conversoes_por_ingrediente.itens) {
    for (const conv of ing.conversoes) { if (lower.includes(conv.medida.toLowerCase())) return conv.medida; }
  }
  if (/\bunidade\b/.test(lower)) return "unidade";
  if (/\bdente\b/.test(lower)) return "dente";
  return lower;
};

const parseFracao = (txt) => {
  const lower = (txt || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(DATA.fracoes)) { if (lower.includes(k)) return v; }
  const m1 = lower.match(/^(\d+)\s+e\s+(\d+)\/(\d+)$/);
  if (m1) return parseInt(m1[1]) + parseInt(m1[2]) / parseInt(m1[3]);
  const m2 = lower.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m2) return parseInt(m2[1]) + parseInt(m2[2]) / parseInt(m2[3]);
  const f = lower.match(/^(\d+)\/(\d+)$/);
  if (f) return parseInt(f[1]) / parseInt(f[2]);
  const n = parseFloat(txt);
  return isNaN(n) ? null : n;
};

const buscarConversaoIngrediente = (ingNome, medidaNome) => {
  if (!ingNome || !medidaNome) return null;
  const lower = ingNome.toLowerCase().trim();
  for (const item of DATA.conversoes_por_ingrediente.itens) {
    const allNames = [item.ingrediente, ...item.aliases];
    if (!allNames.some(a => lower.includes(a.toLowerCase()))) continue;
    for (const conv of item.conversoes) {
      if (conv.medida === medidaNome) return { g: conv.g, ingrediente: item.ingrediente };
    }
    for (const conv of item.conversoes) {
      if (medidaNome.includes(conv.medida) || conv.medida.includes(medidaNome)) return { g: conv.g, ingrediente: item.ingrediente };
    }
  }
  return null;
};

const buscarUtensilioBase = (medidaNome) => {
  if (!medidaNome) return null;
  if (medidaNome === "pitada") return 0.5;
  if (medidaNome === "gota") return 0.05;
  for (const u of DATA.utensilios_base.itens) {
    if (u.medida === medidaNome) return u.ml;
    for (const alias of u.aliases) { if (alias.toLowerCase() === medidaNome.toLowerCase()) return u.ml; }
  }
  return null;
};

// Detecta se o ingrediente parece ser líquido (óleos, leites, águas, etc.)
const LIQUIDO_ALIASES = ["óleo","oleo","azeite","leite","creme de leite","nata","iogurte","água","agua","vinagre","mel","shoyu","molho","suco","caldo"];
const pareceLiquido = (nome) => {
  const lower = (nome || "").toLowerCase();
  return LIQUIDO_ALIASES.some(a => lower.includes(a));
};

// Main: parse medida_caseira text → total grams
const converterMedidaCaseira = (medidaCaseira, ingredienteNome) => {
  if (!medidaCaseira) return null;
  // Normalize: remove parentheses, standardize plurals
  const txt = medidaCaseira.toLowerCase().trim()
    .replace(/[\(\)]/g, " ")
    .replace(/colheres\b/g, "colher")
    .replace(/xícaras\b/g, "xícara")
    .replace(/copos\b/g, "copo")
    .replace(/unidades\b/g, "unidade")
    .replace(/gotas\b/g, "gota")
    .replace(/pitadas\b/g, "pitada")
    .replace(/\s+/g, " ");

  // Check if already a numeric value (plain number, or with g/ml suffix)
  const plainNum = parseFloat(txt);
  if (!isNaN(plainNum) && /^[\d.]+$/.test(txt)) return null; // pure number, already grams
  if (/^[\d.]+\s*(g|ml|kg|l)\s*$/i.test(txt)) return null; // "200g", "8ml", etc — already converted

  // Check if already mass/volume with extra text: "200 gramas de manteiga", "200 g de chocolate"
  const massaPattern = /^([\d.,]+)\s*(g|gramas?|kg|kilos?|ml|litros?|l)\b/i;
  const massaMatch = txt.match(massaPattern);
  if (massaMatch) {
    const valor = parseFloat(massaMatch[1].replace(',', '.'));
    if (!isNaN(valor)) {
      const unit = massaMatch[2].toLowerCase();
      let totalG = valor;
      if (unit === 'kg' || unit.startsWith('kilo')) totalG = valor * 1000;
      if (unit === 'l' || unit.startsWith('litro')) totalG = valor * 1000;
      return { totalG, gPorUnidade: totalG, tipo: "ja_em_gramas", display: `${medidaCaseira} → ${totalG}g (já em peso)` };
    }
  }

  // Parse quantity
  let quantidade = 1;
  const qMatch = txt.match(/^([\d/,.\s]+(?:e\s+)?[\d/]*)\s/);
  if (qMatch) {
    const qStr = qMatch[1].trim();
    const parsed = parseFracao(qStr);
    if (parsed !== null) quantidade = parsed;
  }

  const medidaCanonica = normalizarMedida(txt);

  // If canonical measure is still the raw text (no utensil matched), try "unidade"
  let medidaFinal = medidaCanonica;
  if (medidaCanonica === txt && /^\d+\s+\w+/.test(txt)) {
    medidaFinal = "unidade";
  }

  // Try ingredient-specific
  const ingConv = buscarConversaoIngrediente(ingredienteNome || "", medidaFinal);
  if (ingConv) {
    return {
      totalG: quantidade * ingConv.g,
      gPorUnidade: ingConv.g,
      tipo: "exata",
      display: `${quantidade} ${medidaFinal} de ${ingConv.ingrediente} → ${(quantidade * ingConv.g).toFixed(1)}g`
    };
  }

  // Fallback: utensílio base
  const mlBase = buscarUtensilioBase(medidaFinal);
  if (mlBase !== null) {
    const isLiquid = pareceLiquido(ingredienteNome || "");
    const totalG = quantidade * mlBase;
    return {
      totalG,
      gPorUnidade: mlBase,
      tipo: isLiquid ? "liquido" : "solido_estimado",
      display: `${quantidade} ${medidaFinal} → ~${totalG.toFixed(1)}g${isLiquid ? " (ml≈g)" : " ⚠️"}`
    };
  }

  // Unknown
  return {
    totalG: null,
    gPorUnidade: null,
    tipo: "desconhecida",
    display: `${txt} → ?`
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const log = [];
    const naoConvertidos = [];

    // Load requests from body
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const limite = body.limite || 200;
    const pular = body.pular || 0;

    // Load recipes (paginated)
    const receitas = await base44.asServiceRole.entities.Receita.list("-nome", limite);
    const receitasSlice = receitas.slice(pular, pular + 15);
    log.push(`📋 Processando ${receitasSlice.length} receitas (pular=${pular}, total=${receitas.length})`);

    // Load all ingredients for price lookup
    const todosIngredientes = await base44.asServiceRole.entities.Ingrediente.list("-nome", 1000);
    const ingMap = {};
    for (const ing of todosIngredientes) ingMap[ing.id] = ing;

    let totalConvertidas = 0;
    let totalItens = 0;
    let processadas = 0;

    for (const receita of receitasSlice) {
      processadas++;
      
      // Small delay every 3 receitas
      if (processadas % 3 === 0) {
        await new Promise(r => setTimeout(r, 600));
      }
      const porcoesBase = receita.porcoes_base || 1;
      const itens = await base44.asServiceRole.entities.IngredienteReceita.filter({ receita_id: receita.id });
      
      if (itens.length === 0) continue;
      
      totalItens += itens.length;
      let rendimentoTotal = 0;
      let teveAlteracao = false;

      for (const item of itens) {
        if (item.tipo === "grupo") continue;
        if (item.ingrediente_nome === "N/A") continue;

        const medidaCaseira = item.medida_caseira || "";
        const ingNome = item.ingrediente_nome || "";

        // Try conversion
        const conv = converterMedidaCaseira(medidaCaseira, ingNome);

        let novoTotalG = null;
        let novaQtdPorPorcao = item.quantidade_por_porcao;

        if (conv && conv.totalG !== null) {
          // Converted successfully
          novoTotalG = conv.totalG;
          novaQtdPorPorcao = conv.totalG / porcoesBase;
          teveAlteracao = true;
          totalConvertidas++;

          // Update IngredienteReceita
          await base44.asServiceRole.entities.IngredienteReceita.update(item.id, {
            quantidade_por_porcao: Math.round(novaQtdPorPorcao * 100) / 100,
          });

          log.push(`✅ [${receita.nome}] ${ingNome}: ${conv.display} | qtd/porção: ${novaQtdPorPorcao.toFixed(2)}g`);
        } else if (conv && conv.totalG === null && conv.tipo === "desconhecida") {
          // Could not convert
          novoTotalG = item.quantidade_por_porcao * porcoesBase;
          naoConvertidos.push({
            receita: receita.nome,
            ingrediente: ingNome,
            medida_original: medidaCaseira,
            motivo: "Medida ou ingrediente não encontrados na tabela"
          });
        } else {
          // Already in grams (plain number), use existing value
          novoTotalG = item.quantidade_por_porcao * porcoesBase;
        }

        // Accumulate rendimento
        if (novoTotalG !== null) rendimentoTotal += novoTotalG;

      }

      // O conversor altera composição/rendimento, mas não calcula custo. Fase 10.3:
      // qualquer custo persistido anterior fica explicitamente inválido e o
      // recálculo posterior passa pelo Motor de Custos Canônico.
      if (teveAlteracao) {
        await base44.asServiceRole.entities.Receita.update(receita.id, {
          rendimento_total: Math.round(rendimentoTotal * 100) / 100,
        });
        const invalidacao = await invalidarCustosPorDependencias({
          entities: base44.asServiceRole.entities,
          receitaIds: [receita.id],
          motivo: 'conversao_medida_alterou_composicao',
          origem: 'converter_medidas_receitas',
        });
        log.push(`📊 [${receita.nome}] rendimento recalculado: ${rendimentoTotal.toFixed(1)}g | ${invalidacao.receitas_invalidadas || 0} cache(s) invalidado(s)`);
      }
    }

    log.push(`\n📈 TOTAL: ${totalItens} itens analisados | ${totalConvertidas} conversões realizadas`);

    if (naoConvertidos.length > 0) {
      log.push(`\n⚠️ NÃO CONVERTIDOS (${naoConvertidos.length} itens para revisão manual):`);
      for (const nc of naoConvertidos) {
        log.push(`  - [${nc.receita}] ${nc.ingrediente}: "${nc.medida_original}" — ${nc.motivo}`);
      }
    }

    const proximoPular = pular + receitasSlice.length;
    const temMais = proximoPular < receitas.length;

    return Response.json({
      success: true,
      processadas: receitasSlice.length,
      totalReceitasNoApp: receitas.length,
      totalItens,
      totalConvertidas,
      naoConvertidos: naoConvertidos.length,
      naoConvertidosDetalhes: naoConvertidos,
      temMais,
      proximoLote: temMais ? { pular: proximoPular } : null,
      log,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});