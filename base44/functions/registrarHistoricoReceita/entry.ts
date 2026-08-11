import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Campos rastreados da Receita e seus rótulos amigáveis para o resumo do histórico.
// Campos calculados automaticamente (custo_total, custo_por_porcao, custo_insumos,
// updated_date) são deliberadamente excluídos para não gerar ruído a cada recálculo.
const RECEITA_FIELD_LABELS = {
  nome: "Nome",
  categorias: "Categorias",
  porcoes_base: "Nº de Porções",
  rendimento_total: "Rendimento",
  unidade_base: "Unidade",
  modo_preparo: "Modo de preparo",
  descritivo_menu: "Descritivo",
  foto_url: "Foto",
  per_capita_g: "Per capita",
  nota: "Nota",
  cor_predominante: "Cor predominante",
  destaque: "Destaque",
  mostrar_fc: "Exibição FC",
  mostrar_medida_caseira: "Medida caseira",
};

function valuesEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a || []) === JSON.stringify(b || []);
  }
  return (a ?? "") === (b ?? "");
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload || {};

    if (!event) return Response.json({ skipped: true });

    if (event.entity_name === "Receita" && event.type === "update") {
      if (!data || !old_data) return Response.json({ skipped: true });
      const alterados = [];
      for (const [field, label] of Object.entries(RECEITA_FIELD_LABELS)) {
        if (!valuesEqual(data[field], old_data[field])) alterados.push(label);
      }
      if (alterados.length === 0) return Response.json({ skipped: true });

      await base44.asServiceRole.entities.HistoricoAlteracaoReceita.create({
        receita_id: data.id,
        receita_nome: data.nome || "",
        campos_alterados: alterados,
      });
      return Response.json({ logged: true });
    }

    if (
      event.entity_name === "IngredienteReceita" &&
      ["create", "update", "delete"].includes(event.type)
    ) {
      const source = data || old_data;
      if (!source || !source.receita_id) return Response.json({ skipped: true });

      let receitaNome = "";
      try {
        const receita = await base44.asServiceRole.entities.Receita.get(source.receita_id);
        receitaNome = receita?.nome || "";
      } catch (e) {
        receitaNome = "";
      }

      await base44.asServiceRole.entities.HistoricoAlteracaoReceita.create({
        receita_id: source.receita_id,
        receita_nome: receitaNome,
        campos_alterados: ["Ingredientes"],
      });
      return Response.json({ logged: true });
    }

    return Response.json({ skipped: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}