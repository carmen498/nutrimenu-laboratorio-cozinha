import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { exigirAcessoLaboratorioCustos } from "../../shared/acessoLaboratorioCustos.ts";

const TIPOS_ITEM = new Set(["ingredientes", "embalagem", "mao_obra", "despesa_rateada", "imposto", "taxa_cartao", "comissao", "perda", "outro"]);
const n = (v: any) => {
  const value = Number(v);
  return Number.isFinite(value) ? value : 0;
};
const nonNeg = (v: any) => Math.max(0, n(v));
const perto = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

export default async function(req: Request): Promise<Response> {
  let base44: any = null;
  let calculoCriado: any = null;
  const itensCriados: any[] = [];
  try {
    base44 = createClientFromRequest(req);
    const { user, response } = await exigirAcessoLaboratorioCustos(base44);
    if (response) return response;

    const body = await req.json().catch(() => null);
    const calculo = body?.calculo;
    const itens = Array.isArray(body?.itens) ? body.itens : [];
    if (!calculo || !calculo.origem_id) return Response.json({ error: "Origem do cálculo ausente", code: "invalid_cost_payload" }, { status: 400 });
    if (!(nonNeg(calculo.quantidade_produzida) > 0)) return Response.json({ error: "Quantidade de produção inválida", code: "invalid_quantity" }, { status: 400 });
    if (itens.length === 0 || itens.length > 50) return Response.json({ error: "Composição de custo inválida", code: "invalid_items" }, { status: 400 });

    const receita = await base44.entities.Receita.get(calculo.origem_id).catch(() => null);
    if (!receita) return Response.json({ error: "Receita não encontrada ou sem acesso", code: "recipe_not_accessible" }, { status: 404 });

    const itensLimpos = itens.map((item: any, index: number) => {
      if (!TIPOS_ITEM.has(item?.tipo) || !String(item?.descricao || "").trim()) throw new Error(`Item ${index + 1} inválido`);
      return {
        tipo: item.tipo,
        descricao: String(item.descricao).trim().slice(0, 160),
        origem: String(item.origem || "").trim().slice(0, 160),
        formula: String(item.formula || "").trim().slice(0, 300),
        quantidade: nonNeg(item.quantidade),
        valor_unitario: nonNeg(item.valor_unitario),
        valor_total: nonNeg(item.valor_total),
        ordem: Math.trunc(n(item.ordem)),
        snapshot_detalhes: String(item.snapshot_detalhes || "").trim().slice(0, 2000),
      };
    });

    const custoTotal = nonNeg(calculo.custo_total);
    const somaItens = itensLimpos.reduce((s: number, item: any) => s + item.valor_total, 0);
    if (!perto(custoTotal, somaItens)) {
      return Response.json({ error: "A composição não fecha com o custo total", code: "cost_composition_mismatch", custo_total: custoTotal, soma_itens: somaItens }, { status: 400 });
    }

    const quantidade = nonNeg(calculo.quantidade_produzida);
    const custoUnitario = nonNeg(calculo.custo_unitario);
    if (!perto(custoUnitario, custoTotal / quantidade)) {
      return Response.json({ error: "Custo unitário inconsistente", code: "unit_cost_mismatch" }, { status: 400 });
    }

    const custoIngredientes = nonNeg(calculo.custo_ingredientes_snapshot);
    const custoInsumos = nonNeg(calculo.custo_insumos_tecnicos_snapshot);
    const custoEsquecidos = nonNeg(calculo.custo_esquecidos_snapshot);
    const custoTecnico = nonNeg(calculo.custo_tecnico_snapshot);
    if (!perto(custoTecnico, custoIngredientes + custoInsumos + custoEsquecidos)) {
      return Response.json({ error: "Snapshot técnico inconsistente", code: "technical_snapshot_mismatch" }, { status: 400 });
    }

    const totalPorcoes = nonNeg(calculo.total_porcoes_snapshot);
    const custoPorPorcao = nonNeg(calculo.custo_por_porcao);
    if (totalPorcoes > 0 && !perto(custoPorPorcao, custoTotal / totalPorcoes)) {
      return Response.json({ error: "Custo por porção inconsistente", code: "portion_cost_mismatch" }, { status: 400 });
    }

    const agora = new Date().toISOString();
    const categoria = receita?.categorias?.[0] || receita?.categoria || "";
    const payloadCalculo = {
      user_id: user.id,
      tipo_origem: "receita",
      origem_id: receita.id,
      origem_nome_snapshot: receita.nome || "Receita",
      origem_versao_snapshot: String(receita.updated_date || receita.data_personalizacao || receita.created_date || ""),
      categoria_snapshot: categoria,
      foto_url_snapshot: receita.foto_url || "",
      quantidade_produzida: quantidade,
      unidade_producao: String(calculo.unidade_producao || "lotes").slice(0, 40),
      rendimento_snapshot: nonNeg(calculo.rendimento_snapshot),
      rendimento_unidade_snapshot: String(calculo.rendimento_unidade_snapshot || "").slice(0, 30),
      total_porcoes_snapshot: totalPorcoes,
      modelo_tecnico_versao: Math.max(1, Math.trunc(n(calculo.modelo_tecnico_versao) || 1)),
      custo_ingredientes_snapshot: custoIngredientes,
      custo_insumos_tecnicos_snapshot: custoInsumos,
      custo_esquecidos_snapshot: custoEsquecidos,
      custo_tecnico_snapshot: custoTecnico,
      custo_embalagens: nonNeg(calculo.custo_embalagens),
      custo_mao_obra: nonNeg(calculo.custo_mao_obra),
      custo_rateado: nonNeg(calculo.custo_rateado),
      custo_total: custoTotal,
      custo_unitario: custoUnitario,
      custo_por_porcao: custoPorPorcao,
      preco_venda_informado: nonNeg(calculo.preco_venda_informado),
      preco_sugerido: nonNeg(calculo.preco_sugerido),
      markup_aplicado: nonNeg(calculo.markup_aplicado),
      margem_estimada: n(calculo.margem_estimada),
      formacao_preco_metodo: calculo.formacao_preco_metodo === "margem" ? "margem" : "informado",
      margem_desejada_pct: nonNeg(calculo.margem_desejada_pct),
      taxa_cartao_pct: nonNeg(calculo.taxa_cartao_pct),
      impostos_pct: nonNeg(calculo.impostos_pct),
      taxas_variaveis_pct: nonNeg(calculo.taxas_variaveis_pct),
      custo_fixo_adicional_unitario: nonNeg(calculo.custo_fixo_adicional_unitario),
      observacao: String(calculo.observacao || "").trim().slice(0, 1000),
      status: "finalizado",
      data_calculo: agora,
      versao_calculo: 1,
      calculo_origem_id: calculo.calculo_origem_id ? String(calculo.calculo_origem_id).slice(0, 100) : "",
    };

    calculoCriado = await base44.asServiceRole.entities.CalculoCusto.create(payloadCalculo);
    for (const item of itensLimpos) {
      const criado = await base44.asServiceRole.entities.CalculoCustoItem.create({ user_id: user.id, calculo_id: calculoCriado.id, ...item });
      itensCriados.push(criado);
    }

    return Response.json({ success: true, calculo_id: calculoCriado.id, data_calculo: agora, itens: itensCriados.length });
  } catch (error) {
    try {
      if (base44 && calculoCriado) {
        for (const item of itensCriados.reverse()) await base44.asServiceRole.entities.CalculoCustoItem.delete(item.id).catch(() => null);
        await base44.asServiceRole.entities.CalculoCusto.delete(calculoCriado.id).catch(() => null);
      }
    } catch (_) {}
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return Response.json({ error: message, code: "cost_save_failed" }, { status: 500 });
  }
}
