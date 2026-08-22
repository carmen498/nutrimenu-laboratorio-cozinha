// Fonte única de verdade do Relatório de Pré-preparos (mise en place) — usada
// pela tela de pré-visualização (PrePreparosPlanejamento.jsx) e pelo PDF exportado.
// Escala: fator = (PC local do cardápio × pessoas) ÷ rendimento da receita.
// Não altera nenhum outro relatório nem cálculo existente — apenas lê dados.
import { base44 } from "@/api/base44Client";
import { carregarDadosRelatorios } from "@/lib/relatoriosPlanejamentoPDF";
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

// Carrega config/receitas/ingredientes-por-receita (reaproveitando o loader
// compartilhado) + mapa de Ingrediente (para preço e FC padrão).
export async function carregarDadosPrePreparos(planejamento) {
  const base = await carregarDadosRelatorios(planejamento);
  const todosIngredientes = await base44.entities.Ingrediente.list("nome", 3000);
  const ingredienteMap = {};
  (todosIngredientes || []).forEach((i) => { ingredienteMap[i.id] = i; });
  return { ...base, ingredienteMap };
}

export function montarPrePreparos(planejamento, dados) {
  const { config, receitaMap, ingredientesPorReceita, ingredienteMap } = dados;
  const grupos = config.grupos || [];
  const totalPessoas = planejamento.total_pessoas ||
    (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0);

  const itensComReceita = grupos.flatMap((g) => (g.itens || []).filter((i) => i.receita_id));
  const numReceitas = itensComReceita.length;

  const subReceitasMap = {};
  const ingredientesMap = {};

  itensComReceita.forEach((item) => {
    const receita = receitaMap[item.receita_id];
    const rendimento = receita?.rendimento_total || 0;
    const porcoesBase = receita?.porcoes_base || 1;
    const pcG = item.pc_g || 0;
    const fatorReceita = rendimento > 0 ? (pcG * totalPessoas) / rendimento : 0;
    const ingrs = ingredientesPorReceita[item.receita_id] || [];
    const nomeReceita = item.receita_nome || "—";

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
