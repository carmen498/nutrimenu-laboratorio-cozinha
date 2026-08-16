import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";

// Retorna um mapa { created_by_id: quantidade_de_receitas_criadas }
export async function contarReceitasPorUsuario() {
  const receitas = await fetchAllPages(base44.entities.Receita, "-created_date");
  const contagem = {};
  for (const r of receitas) {
    if (!r.created_by_id) continue;
    contagem[r.created_by_id] = (contagem[r.created_by_id] || 0) + 1;
  }
  return contagem;
}