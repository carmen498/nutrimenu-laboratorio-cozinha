// Fonte única de dados do Dossiê do Evento — relatório-mestre executivo do
// Planejamento (Etapas 1-4). Apenas leitura/derivação — reaproveita os mesmos
// helpers de custo (Cardápio) e de Doces & Bebidas usados nas telas, para
// garantir paridade exata. NÃO altera nenhum cálculo existente e NUNCA
// reaproveita um total pré-computado de outra tela: cada bloco é somado a
// partir das próprias linhas mostradas no dossiê.
import { carregarDadosRelatorios } from "@/lib/relatoriosPlanejamentoPDF";
import { custoPorKgPronto } from "@/lib/custoReceita";
import { calcRsTotalFinal, qtdFinalEfetiva, unidadeCustoLabel } from "@/lib/docesBebidasCalc";

export async function carregarDadosDossie(planejamento) {
  return carregarDadosRelatorios(planejamento);
}

export function montarDossie(planejamento, dados) {
  const { config, receitaMap, ingredientesPorReceita } = dados;
  const totalPessoas = planejamento.total_pessoas ||
    (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0);

  // 1. Cabeçalho unificado
  const cabecalho = {
    nome: planejamento.nome || "—",
    totalPessoas,
    tipo: planejamento.tipo_planejamento || null,
    tipoServico: planejamento.tipo_servico || null,
    horarioInicio: planejamento.horario_inicio || null,
    duracaoHoras: planejamento.duracao_horas || null,
  };

  // 2. Clientes e per capitas (omite grupos com 0)
  const clientes = [];
  if (planejamento.qtd_homens > 0) {
    const pc = planejamento.per_capita_homens_g || 0;
    clientes.push({ label: "Homens", n: planejamento.qtd_homens, pc, kg: (planejamento.qtd_homens * pc) / 1000 });
  }
  if (planejamento.qtd_mulheres > 0) {
    const pc = planejamento.per_capita_mulheres_g || 0;
    clientes.push({ label: "Mulheres", n: planejamento.qtd_mulheres, pc, kg: (planejamento.qtd_mulheres * pc) / 1000 });
  }
  if (planejamento.qtd_criancas > 0) {
    const pc = planejamento.per_capita_criancas_g || 0;
    clientes.push({ label: "Crianças", n: planejamento.qtd_criancas, pc, kg: (planejamento.qtd_criancas * pc) / 1000 });
  }

  // 3. Planejamento de comida
  const baseKg = planejamento.total_base_kg || 0;
  const margemPct = planejamento.margem_seguranca_pct || 0;
  const planejadoKg = planejamento.total_com_margem_kg || 0;
  const margemKg = planejadoKg - baseKg;

  const grupos = (config?.grupos || []).filter(g => (g.itens || []).length > 0);
  const cardapioKg = grupos.reduce((s, g) => s + (g.itens || []).reduce((s2, i) => s2 + (i.qtd_kg || 0), 0), 0);
  const divergenciaPct = planejadoKg > 0 ? Math.abs(cardapioKg - planejadoKg) / planejadoKg * 100 : 0;
  const alertaPlanejado = planejadoKg > 0 && divergenciaPct > 5;

  const planejamentoComida = { baseKg, margemPct, margemKg, planejadoKg, cardapioKg, alertaPlanejado };

  // 4. Tabela cardápio (custo recalculado por receita — mesma fórmula da Ficha de Custos)
  let itensCardapio = [];
  grupos.forEach(g => {
    (g.itens || []).forEach(item => {
      const rec = receitaMap[item.receita_id];
      const custoKg = custoPorKgPronto(rec, ingredientesPorReceita?.[item.receita_id]);
      const qtdKg = item.qtd_kg || 0;
      const custo = custoKg * qtdKg;
      itensCardapio.push({
        grupo: g.nome,
        nome: item.receita_nome || "—",
        pcG: item.pc_g || 0,
        qtdKg,
        custo,
        semCusto: custoKg === 0,
      });
    });
  });
  const custoTotalComida = itensCardapio.reduce((s, i) => s + i.custo, 0);
  itensCardapio = itensCardapio.map(i => ({ ...i, pct: custoTotalComida > 0 ? (i.custo / custoTotalComida) * 100 : 0 }));
  const maxPct = itensCardapio.length ? Math.max(...itensCardapio.map(i => i.pct)) : 0;
  const totalKgComida = itensCardapio.reduce((s, i) => s + i.qtdKg, 0);
  const temPratoSemCusto = itensCardapio.some(i => i.semCusto);

  // 5. Doces & Bebidas — cada linha calculada de forma independente; o total
  // exibido é SEMPRE a soma dessas mesmas linhas (nunca um total em cache).
  const docesBebidasRaw = config?.doces_bebidas || [];
  const itensDoces = docesBebidasRaw.map(item => {
    const rs = calcRsTotalFinal(item, totalPessoas);
    const qtd = qtdFinalEfetiva(item, totalPessoas);
    return {
      nome: item.item || "—",
      pcMedio: item.media,
      unidade: item.unidade,
      qtd,
      unidadeQtd: unidadeCustoLabel(item.unidade),
      rs,
      semCusto: rs == null,
    };
  });
  const custoTotalDoces = itensDoces.reduce((s, i) => s + (i.rs || 0), 0);
  const temDoces = itensDoces.length > 0;

  // 6. Indicadores finais
  const custoPorPessoa = totalPessoas > 0 ? custoTotalComida / totalPessoas : 0;

  return {
    cabecalho,
    clientes,
    planejamentoComida,
    itensCardapio,
    maxPct,
    totalKgComida,
    custoTotalComida,
    temPratoSemCusto,
    itensDoces,
    custoTotalDoces,
    temDoces,
    custoPorPessoa,
    totalPessoas,
  };
}