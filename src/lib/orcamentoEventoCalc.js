// Fonte única de verdade para o Orçamento do Evento (documento comercial do
// cliente). Recebe APENAS o preço por pessoa já definido (nunca custo, PC,
// margem, kg ou quantidades de bebidas) — garante que nenhum dado interno
// possa vazar para a tela ou para o PDF.

function fmtRs(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function montarOrcamentoEvento({ planejamento, dados, precoPorPessoa, validadeDias = 10 }) {
  const { config, receitaMap } = dados;
  const totalPessoas = planejamento.total_pessoas ||
    (planejamento.qtd_homens || 0) + (planejamento.qtd_mulheres || 0) + (planejamento.qtd_criancas || 0);

  const grupos = (config?.grupos || []).filter((g) => (g.itens || []).length > 0);
  const pratos = grupos.flatMap((g) =>
    (g.itens || []).map((item) => ({
      id: `${g.nome}-${item.receita_id}`,
      nome: item.receita_nome || "",
      descritivo: receitaMap?.[item.receita_id]?.descritivo_menu || "",
    }))
  );

  // Bebidas (e doces) — apenas os nomes dos itens ativos na Etapa 4, em linha corrida.
  const docesBebidas = config?.doces_bebidas || [];
  const bebidasLinha = docesBebidas.map((i) => i.item).filter(Boolean).join(" · ");

  const tipoLabel = [
    planejamento.tipo_planejamento,
    planejamento.tipo_servico,
    planejamento.horario_inicio ? `início ${planejamento.horario_inicio}` : null,
    planejamento.duracao_horas ? `${planejamento.duracao_horas}h de duração` : null,
  ].filter(Boolean).join(" · ");

  const preco = precoPorPessoa || 0;
  const total = preco * totalPessoas;

  return {
    nome: planejamento.nome || "",
    numPessoas: totalPessoas,
    dataEmissao: new Date().toLocaleDateString("pt-BR"),
    validadeDias,
    tipoLabel,
    pratos,
    temBebidas: !!bebidasLinha,
    bebidasLinha,
    observacoesComerciais: planejamento.observacoes_orcamento || "",
    precoPorPessoaFmt: fmtRs(preco),
    totalFmt: fmtRs(total),
    total,
  };
}