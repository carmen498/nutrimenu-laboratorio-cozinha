import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { calcularExpiracaoInclusiva } from "../../shared/datasAssinatura.ts";

const NONCE = "migrar-trials-7-em-30-20260830-48c1d55f-16d1-45d7-a7b6-e60c8b2d4b63";

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.nonce !== NONCE) return Response.json({ error: "not_found" }, { status: 404 });
    const base44 = createClientFromRequest(req);
    const usuarios = await base44.asServiceRole.entities.User.list("-created_date", 1000);
    const trials = (usuarios || []).filter((u: any) => u.role !== "admin" && u.plano_atual === "trial" && ["trial", "vencido"].includes(u.status_assinatura));
    const resultados: any[] = [];

    for (const user of trials) {
      const inicio = /^\d{4}-\d{2}-\d{2}$/.test(user.data_inicio || "") ? user.data_inicio : new Date().toISOString().slice(0, 10);
      const expiracao = calcularExpiracaoInclusiva(inicio, 30);
      await base44.asServiceRole.entities.User.update(user.id, {
        status_assinatura: "trial",
        data_expiracao: expiracao,
        trial_modelo: "7_em_30",
        trial_dias_uso: Array.isArray(user.trial_dias_uso) ? user.trial_dias_uso : [],
      });

      const acessos = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: "laboratorio_custos" });
      const ativo = (acessos || []).find((a: any) => a.status === "ativo");
      if (!ativo) {
        const trialAntigo = (acessos || []).find((a: any) => a.modalidade === "trial" || a.origem === "trial");
        if (trialAntigo) {
          await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.update(trialAntigo.id, {
            status: "ativo",
            inicio_em: new Date(`${inicio}T00:00:00-03:00`).toISOString(),
            fim_em: new Date(`${expiracao}T23:59:59.999-03:00`).toISOString(),
            trial_ativado_em: trialAntigo.trial_ativado_em || new Date().toISOString(),
            oferta_versao: "trial-plataforma-7-em-30-v1",
            observacao: `${trialAntigo.observacao || ""} Migrado para trial Plataforma ZR 7 dias de uso em até 30 dias.`.trim(),
          });
        } else {
          await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.create({
            user_id: user.id,
            modulo: "laboratorio_custos",
            status: "ativo",
            modalidade: "trial",
            plano_id: "custos_trial",
            origem: "trial",
            inicio_em: new Date(`${inicio}T00:00:00-03:00`).toISOString(),
            fim_em: new Date(`${expiracao}T23:59:59.999-03:00`).toISOString(),
            trial_ativado_em: new Date().toISOString(),
            oferta_versao: "trial-plataforma-7-em-30-v1",
            observacao: "Migrado para trial automático compartilhado Cozinha + Custos: 7 dias de uso em até 30 dias.",
          });
        }
      }
      resultados.push({ user_id: user.id, data_inicio: inicio, data_expiracao: expiracao });
    }
    return Response.json({ success: true, migrados: resultados.length, resultados });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
