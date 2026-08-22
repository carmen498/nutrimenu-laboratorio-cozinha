// Fonte única de verdade do Relatório de Pré-preparos para o Cardápio avulso
// (fora do fluxo de Evento/Planejamento). Mesma lógica de consolidação e o
// mesmo formato de saída de src/lib/prePreparosCalc.js, adaptado para ler
// diretamente de CardapioReceita em vez do cardapio_config do Planejamento.
import { base44 } from "@/api/base44Client";
import { resolverFatorCorrecao } from "@/lib/ingredienteReceitaCalc";

function fmtPeso(g) {
  const v = g || 0;
  if (v >= 1000) return (v / 1000).toFixed(2).replace(".", ",") + " kg";
  return Math.round(v) + " g";
}

function fmtBrutoParen(liquidoG, brutoG) {
  if (!brutoG || brutoG <= liquidoG + 0.001) return null;
  return `(pegar ${fmtPeso(brutoG)} bruto)`;
}

// Carrega receitas do cardápio + ingredientes por receita + mapa de Ingrediente
// (para preço e FC padrão). Somente leitura.
export async function carregarDadosPrePreparosCardapio(cardapioId) {
  const receitasCardapio = await base44.entities.CardapioReceita.filter({ cardapio_id: cardapioId }, "ordem", 200);
  const receitaIds = [...new Set((receitasCardapio || []).map(r => r.receita_id).filter(Boolean))];

  const receitaMap = {};
  for (const rid of receitaIds) {
    try {
      const rec = await base44.entities.Receita.get(rid);
      if (rec) receitaMap[rid] = rec;
    } catch { /* ignore */ }
  }

  const ingredientesPorReceita = {};
  for (const rid of receitaIds) {
    try {
      ingredientesPorReceita[rid] = await base44.entities.IngredienteReceita.filter({ receita_id: rid }, "ordem", 200);
    } catch {
      ingredientesPorReceita[rid] = [];
    }
  }

  const todosIngredientes = await base44.entities.Ingrediente.list("nome", 3000);
  const ingredienteMap = {};
  (todosIngredientes || []).forEach((i) => { ingredienteMap[i.id] = i; });

  return { receitasCardapio: receitasCardapio || [], receitaMap, ingredientesPorReceita, ingredienteMap };
}

export function montarPrePreparosCardapio(cardapio, dados) {
  const { receitasCardapio, receitaMap, ingredientesPorReceita, ingredienteMap } = dados;
  const totalPessoas = Number(cardapio.num_unidades) || 0;
  const numReceitas = receitasCardapio.length;

  const subReceitasMap = {};
  const ingredientesMap = {};

  receitasCardapio.forEach((cr) => {
    const receita = receitaMap[cr.receita_id];
    if (!receita) return;
    const rendimento = receita.rendimento_total || 0;
    const porcoesBase = receita.porcoes_base || 1;
    const qtdTotal = Number(cr.quantidade_total_g) || 0;
    const fatorReceita = rendimento > 0 ? qtdTotal / rendimento : 0;
    const ingrs = ingredientesPorReceita[cr.receita_id] || [];
    const nomeReceita = cr.receita_nome || receita.nome || "—";

    ingrs.forEach((ing) => {
      if (ing.tipo === "grupo") return;
      const pesoBase = (ing.quantidade_por_porcao || 0) * porcoesBase;
      const scaledQty = pesoBase * fatorReceita;

      if (ing.tipo === "subreceita") {
        const nome = (ing.subreceita_nome || "").trim();
        if (!nome) return;
        if (!subReceitasMap[nome]) subReceitasMap[nome] = { totalG: 0, usos: {} };
        subReceitasMap[nome].totalG += scaledQty;
        subReceitasMap[nome].usos[nomeReceita] = (subReceitasMap[nome].usos[nomeReceita] || 0) + scaledQty;
      } else if (ing.tipo === "ingrediente") {
        const prePreparo = (ing.pre_preparo || "").trim();
        if (!prePreparo) return;
        const nome = (ing.ingrediente_nome || "").trim();
        if (!nome) return;
        const key = `${nome.toLowerCase()}||${prePreparo.toLowerCase()}`;
        const ingRef = ing.ingrediente_id ? ingredienteMap[ing.ingrediente_id] : null;
        const fc = resolverFatorCorrecao(ing, ingRef).valor;
        const brutoQty = scaledQty * fc;
        if (!ingredientesMap[key]) {
          ingredientesMap[key] = { nome, prePreparo, totalG: 0, totalBrutoG: 0, usos: {} };
        }
        ingredientesMap[key].totalG += scaledQty;
        ingredientesMap[key].totalBrutoG += brutoQty;
        ingredientesMap[key].usos[nomeReceita] = (ingredientesMap[key].usos[nomeReceita] || 0) + scaledQty;
      }
    });
  });

  const subReceitas = Object.entries(subReceitasMap)
    .map(([nome, v]) => ({
      nome,
      totalFmt: fmtPeso(v.totalG),
      usadoEmTexto: "usado em: " + Object.entries(v.usos).map(([r, q]) => `${r} (${fmtPeso(q)})`).join(", "),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const ingredientes = Object.values(ingredientesMap)
    .map((v) => {
      const usosArr = Object.entries(v.usos);
      const receitaLabel = usosArr.length === 1 ? usosArr[0][0] : `${usosArr.length} receitas`;
      const usadoEmTexto = usosArr.length >= 2 ? "usado em: " + usosArr.map(([r]) => r).join(", ") : null;
      return {
        nome: v.nome,
        prePreparo: v.prePreparo,
        totalFmt: fmtPeso(v.totalG),
        brutoTexto: fmtBrutoParen(v.totalG, v.totalBrutoG),
        receitaLabel,
        usadoEmTexto,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome) || a.prePreparo.localeCompare(b.prePreparo));

  return {
    totalPessoas,
    numReceitas,
    diagnosticoTexto: 'Nenhuma flag "Preparar antes" encontrada nas sub-receitas — todas as sub-receitas referenciadas pelas receitas do cardápio foram tratadas como pré-preparo.',
    subReceitas,
    ingredientes,
    vazio: subReceitas.length === 0 && ingredientes.length === 0,
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
  };
}
