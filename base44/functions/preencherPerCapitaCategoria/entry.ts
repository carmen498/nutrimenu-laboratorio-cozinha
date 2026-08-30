import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// PC padrão (g) por categoria principal (primeira categoria cadastrada na receita).
const PC_POR_CATEGORIA = {
  "Carnes Bovinas e Suínos": 150,
  "Aves": 150,
  "Peixes e Frutos do Mar": 150,
  "Ovos": 120,
  "Massas, Pastelão e Quiches": 120,
  "Arroz e Risotos": 120,
  "Sopas e Caldos": 400,
  "Leguminosas": 120,
  "Salgadinhos": 80,
  "Pães e Bolos": 80,
  "Sobremesas": 100,
  "Molhos": 50,
  "Acompanhamentos": 120,
  "Pratos Principais": 250,
  "Entradas": 80,
  "Lanche": 150,
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { dry_run: dryRun = false } = await req.json().catch(() => ({}));

    const receitas = await base44.asServiceRole.entities.Receita.list('nome', 5000);

    const semPC = receitas.filter((r) => !(Number(r.per_capita_g) > 0));

    const aplicados = [];
    const semCategoriaDefinida = [];
    const updates = [];

    for (const r of semPC) {
      const categoriaPrincipal = (r.categorias && r.categorias[0]) || "";
      const pc = PC_POR_CATEGORIA[categoriaPrincipal];

      if (!pc) {
        semCategoriaDefinida.push({
          receita_id: r.id,
          receita_nome: r.nome,
          categoria: categoriaPrincipal || "(sem categoria)",
        });
        continue;
      }

      updates.push({ id: r.id, per_capita_g: pc });
      aplicados.push({
        receita_id: r.id,
        receita_nome: r.nome,
        categoria: categoriaPrincipal,
        pc_aplicado: pc,
      });
    }

    if (updates.length > 0 && !dryRun) {
      await base44.asServiceRole.entities.Receita.bulkUpdate(updates);
    }

    const resumoMap = new Map();
    for (const a of aplicados) {
      const key = a.categoria;
      if (!resumoMap.has(key)) resumoMap.set(key, { categoria: key, pc_aplicado: a.pc_aplicado, quantidade: 0 });
      resumoMap.get(key).quantidade += 1;
    }
    const resumoPorCategoria = Array.from(resumoMap.values()).sort((a, b) => a.categoria.localeCompare(b.categoria));

    const log = dryRun ? null : await base44.asServiceRole.entities.PreenchimentoPerCapitaLog.create({
      data_execucao: new Date().toISOString(),
      total_processado: semPC.length,
      total_aplicado: aplicados.length,
      total_sem_categoria_definida: semCategoriaDefinida.length,
      aplicados,
      sem_categoria_definida: semCategoriaDefinida,
      resumo_por_categoria: resumoPorCategoria,
    });

    return Response.json({
      log_id: log?.id || null,
      dry_run: dryRun,
      total_processado: semPC.length,
      total_aplicado: aplicados.length,
      total_sem_categoria_definida: semCategoriaDefinida.length,
      aplicados,
      sem_categoria_definida: semCategoriaDefinida,
      resumo_por_categoria: resumoPorCategoria,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}