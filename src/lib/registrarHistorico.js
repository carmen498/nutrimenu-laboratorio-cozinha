import { base44 } from "@/api/base44Client";

// Registra uma entrada no histórico de alterações de uma receita. Falha
// silenciosamente (não deve travar o fluxo principal de salvamento do usuário).
export async function registrarHistorico(receitaId, receitaNome, camposAlterados) {
  try {
    await base44.functions.invoke("registrarHistoricoReceita", {
      receita_id: receitaId,
      receita_nome: receitaNome || "",
      campos_alterados: camposAlterados,
    });
  } catch (e) {
    // auditoria não deve bloquear a ação do usuário
  }
}