import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { exigirAssinaturaAtiva } from "../../shared/acessoAssinatura.ts";

// Invocado pelo frontend após uma alteração real. O registro é persistido via
// service role para impedir que o usuário crie/edite/apague diretamente entradas
// de auditoria. O autor é persistido explicitamente em usuario_id.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, response } = await exigirAssinaturaAtiva(base44);
    if (response) return response;

    const payload = await req.json();
    const { receita_id, campos_alterados } = payload || {};

    if (!receita_id || !Array.isArray(campos_alterados) || campos_alterados.length === 0) {
      return Response.json({ skipped: true });
    }

    // Confirma que a receita é visível/editável no contexto do usuário. Uma chamada
    // fabricada não pode gerar histórico para uma receita à qual ele não tem acesso.
    const receita = await base44.entities.Receita.get(receita_id).catch(() => null);
    if (!receita) {
      return Response.json({ error: "Receita não encontrada ou sem acesso" }, { status: 404 });
    }

    const campos = campos_alterados
      .filter((campo: unknown) => typeof campo === "string")
      .map((campo: string) => campo.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);
    if (campos.length === 0) return Response.json({ skipped: true });

    await base44.asServiceRole.entities.HistoricoAlteracaoReceita.create({
      receita_id,
      receita_nome: receita.nome || "",
      usuario_id: user.id,
      usuario_nome: user.full_name || user.nome_completo || "",
      campos_alterados: campos,
    });

    return Response.json({ logged: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}