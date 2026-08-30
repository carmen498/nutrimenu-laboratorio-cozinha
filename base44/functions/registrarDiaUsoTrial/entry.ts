import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hojeSaoPauloISO } from "../../shared/acessoAssinatura.ts";
import { calcularExpiracaoInclusiva } from "../../shared/datasAssinatura.ts";

const LIMITE_DIAS_USO = 7;
const JANELA_DIAS = 30;

function fimJanelaUtc(dataISO: string) {
  return new Date(`${dataISO}T23:59:59.999-03:00`).toISOString();
}

async function garantirCustosTrial(base44: any, user: any, dataInicio: string, dataExpiracao: string) {
  const existentes = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({
    user_id: user.id,
    modulo: "laboratorio_custos",
  });
  const ativo = (existentes || []).find((a: any) => a.status === "ativo");
  if (ativo) return ativo;
  const trialAnterior = (existentes || []).find((a: any) => a.modalidade === "trial" || a.origem === "trial");
  if (trialAnterior) {
    await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.update(trialAnterior.id, {
      status: "ativo",
      inicio_em: new Date(`${dataInicio}T00:00:00-03:00`).toISOString(),
      fim_em: fimJanelaUtc(dataExpiracao),
      trial_ativado_em: trialAnterior.trial_ativado_em || new Date().toISOString(),
      observacao: `${trialAnterior.observacao || ""} Integrado ao trial Plataforma ZR 7 dias de uso em até 30 dias.`.trim(),
    });
    return trialAnterior;
  }
  return await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.create({
    user_id: user.id,
    modulo: "laboratorio_custos",
    status: "ativo",
    modalidade: "trial",
    plano_id: "custos_trial",
    origem: "trial",
    inicio_em: new Date(`${dataInicio}T00:00:00-03:00`).toISOString(),
    fim_em: fimJanelaUtc(dataExpiracao),
    trial_ativado_em: new Date().toISOString(),
    oferta_versao: "trial-plataforma-7-em-30-v1",
    observacao: "Trial automático compartilhado Cozinha + Custos: 7 dias de uso em até 30 dias.",
  });
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "admin" || user.status_assinatura !== "trial" || user.plano_atual !== "trial") {
      return Response.json({ success: true, aplicavel: false });
    }

    const hoje = hojeSaoPauloISO();
    const dataInicio = /^\d{4}-\d{2}-\d{2}$/.test(user.data_inicio || "") ? user.data_inicio : hoje;
    let dataExpiracao = user.data_expiracao;

    // Migração preguiçosa dos trials antigos de 7 dias: não presumimos dias usados no passado.
    if (user.trial_modelo !== "7_em_30") {
      dataExpiracao = calcularExpiracaoInclusiva(dataInicio, JANELA_DIAS);
      await base44.asServiceRole.entities.User.update(user.id, {
        trial_modelo: "7_em_30",
        trial_dias_uso: [],
        data_expiracao: dataExpiracao,
        status_assinatura: "trial",
      });
      user = { ...user, trial_modelo: "7_em_30", trial_dias_uso: [], data_expiracao: dataExpiracao };
    }

    await garantirCustosTrial(base44, user, dataInicio, dataExpiracao);

    if (dataExpiracao < hoje) {
      await base44.asServiceRole.entities.User.update(user.id, { status_assinatura: "vencido" });
      return Response.json({ error: "Janela de 30 dias do trial encerrada", code: "trial_window_expired" }, { status: 403 });
    }

    const usados = [...new Set((Array.isArray(user.trial_dias_uso) ? user.trial_dias_uso : []).filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))].sort();
    if (usados.includes(hoje)) {
      return Response.json({ success: true, aplicavel: true, dia_registrado: false, dias_usados: usados.length, dias_restantes: Math.max(0, LIMITE_DIAS_USO - usados.length), data_expiracao: dataExpiracao });
    }
    if (usados.length >= LIMITE_DIAS_USO) {
      await base44.asServiceRole.entities.User.update(user.id, { status_assinatura: "vencido" });
      return Response.json({ error: "Os 7 dias de uso do trial já foram utilizados", code: "trial_usage_exhausted", dias_usados: usados.length }, { status: 403 });
    }

    const novosDias = [...usados, hoje];
    await base44.asServiceRole.entities.User.update(user.id, { trial_dias_uso: novosDias });
    return Response.json({ success: true, aplicavel: true, dia_registrado: true, dias_usados: novosDias.length, dias_restantes: LIMITE_DIAS_USO - novosDias.length, data_expiracao: dataExpiracao });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
