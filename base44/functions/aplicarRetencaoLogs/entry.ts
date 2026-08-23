import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  VERSAO_POLITICA_RETENCAO,
  mascararEmail,
  mascararTelefone,
} from "../../shared/governancaLogs.ts";

const LOTE = 200;
const MAX_LOTES = 25;
const DIAS_MINIMIZACAO_CONTATO = 30;

const REGRAS_RETENCAO = [
  { entidade: "LogWebhookMercadoPago", dias: 90, classe: "tecnico" },
  { entidade: "LogUserAgentDiagnostico", dias: 90, classe: "legado" },
  { entidade: "LogEmail", dias: 180, classe: "comunicacao" },
  { entidade: "LogWhatsapp", dias: 180, classe: "comunicacao" },
  { entidade: "LogAtualizacaoPrecos", dias: 365, classe: "operacional" },
  { entidade: "AtualizacaoLotePrecosLog", dias: 365, classe: "operacional" },
  { entidade: "NormalizacaoCustoReceitaLog", dias: 365, classe: "operacional" },
  { entidade: "NormalizacaoLinhagemReceitaLog", dias: 365, classe: "operacional" },
  { entidade: "PreenchimentoPerCapitaLog", dias: 365, classe: "operacional" },
  { entidade: "SaneamentoCustoPendenciaLog", dias: 365, classe: "operacional" },
  { entidade: "SincronizacaoSubreceitaLog", dias: 365, classe: "operacional" },
  { entidade: "SaneamentoMedidaCaseiraLog", dias: 730, classe: "auditoria" },
  { entidade: "CorrecaoPorcoesBaseLog", dias: 730, classe: "auditoria" },
  { entidade: "CorrecaoRendimentoLog", dias: 730, classe: "auditoria" },
  { entidade: "RelatorioFaxinaCategoriasReceitas", dias: 730, classe: "auditoria" },
  { entidade: "HistoricoAlteracaoReceita", dias: 730, classe: "auditoria" },
  { entidade: "LogRetencaoDados", dias: 730, classe: "governanca" },
] as const;

function dataRegistro(registro: any): number {
  const valor = registro?.created_date || registro?.executado_em || registro?.data_execucao || registro?.enviado_em;
  const ms = valor ? Date.parse(String(valor)) : Number.NaN;
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function limiteDias(dias: number): number {
  return Date.now() - dias * 24 * 60 * 60 * 1000;
}

async function listarPagina(entity: any, skip: number): Promise<any[]> {
  return await entity.filter({}, "created_date", LOTE, skip);
}

async function contarAntigos(entity: any, dias: number): Promise<{ total: number; truncado: boolean }> {
  const limite = limiteDias(dias);
  let total = 0;
  let skip = 0;

  for (let lote = 0; lote < MAX_LOTES; lote++) {
    const registros = await listarPagina(entity, skip);
    if (!registros?.length) return { total, truncado: false };

    for (const registro of registros) {
      if (dataRegistro(registro) < limite) total++;
    }

    if (registros.length < LOTE) return { total, truncado: false };
    skip += registros.length;
  }

  return { total, truncado: true };
}

async function excluirAntigos(entity: any, dias: number): Promise<{ excluidos: number; truncado: boolean }> {
  const limite = limiteDias(dias);
  let excluidos = 0;

  for (let lote = 0; lote < MAX_LOTES; lote++) {
    const registros = await entity.list("created_date", LOTE);
    if (!registros?.length) return { excluidos, truncado: false };

    const antigos = registros.filter((registro: any) => dataRegistro(registro) < limite);
    if (!antigos.length) return { excluidos, truncado: false };

    for (const registro of antigos) {
      await entity.delete(registro.id);
      excluidos++;
    }

    if (antigos.length < LOTE) return { excluidos, truncado: false };
  }

  return { excluidos, truncado: true };
}

async function minimizarContatosLegados(base44: any, aplicar: boolean): Promise<number> {
  const limite = limiteDias(DIAS_MINIMIZACAO_CONTATO);
  let total = 0;

  const processar = async (nome: "LogEmail" | "LogWhatsapp") => {
    const entity = (base44.asServiceRole.entities as any)[nome];
    let skip = 0;

    for (let lote = 0; lote < MAX_LOTES; lote++) {
      const registros = await listarPagina(entity, skip);
      if (!registros?.length) break;

      for (const registro of registros) {
        if (dataRegistro(registro) >= limite) continue;
        const patch: Record<string, unknown> = {};

        if (nome === "LogEmail") {
          const atual = String(registro.destinatario_email || "");
          if (atual && !atual.includes("***")) patch.destinatario_email = mascararEmail(atual);
          if (registro.detalhe_erro) patch.detalhe_erro = "";
        } else {
          const atual = String(registro.destinatario_telefone || "");
          if (atual && !atual.startsWith("***")) patch.destinatario_telefone = mascararTelefone(atual);
        }

        if (Object.keys(patch).length) {
          total++;
          if (aplicar) await entity.update(registro.id, patch);
        }
      }

      if (registros.length < LOTE) break;
      skip += registros.length;
    }
  };

  await processar("LogEmail");
  await processar("LogWhatsapp");
  return total;
}

async function minimizarPagamentos(base44: any, aplicar: boolean): Promise<number> {
  const entity = base44.asServiceRole.entities.Pagamento;
  const limite = limiteDias(DIAS_MINIMIZACAO_CONTATO);
  let total = 0;
  let skip = 0;

  for (let lote = 0; lote < MAX_LOTES; lote++) {
    const registros = await listarPagina(entity, skip);
    if (!registros?.length) break;

    for (const pagamento of registros) {
      if (dataRegistro(pagamento) >= limite) continue;
      if (pagamento.dados_transitorios_limpos_em) continue;

      const possuiTransitórios = Boolean(
        pagamento.qr_code ||
        pagamento.qr_code_base64 ||
        pagamento.detalhe_erro ||
        pagamento.idempotency_key
      );
      if (!possuiTransitórios) continue;

      total++;
      if (aplicar) {
        await entity.update(pagamento.id, {
          qr_code: "",
          qr_code_base64: "",
          detalhe_erro: "",
          idempotency_key: "",
          dados_transitorios_limpos_em: new Date().toISOString(),
        });
      }
    }

    if (registros.length < LOTE) break;
    skip += registros.length;
  }

  return total;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const modo = body?.modo === "aplicar" ? "aplicar" : "simular";
    const aplicar = modo === "aplicar";
    const resultados: Record<string, unknown> = {};
    let totalExcluido = 0;

    for (const regra of REGRAS_RETENCAO) {
      const entity = (base44.asServiceRole.entities as any)[regra.entidade];
      if (!entity) {
        resultados[regra.entidade] = { erro: "entidade_indisponivel", dias: regra.dias, classe: regra.classe };
        continue;
      }

      if (aplicar) {
        const r = await excluirAntigos(entity, regra.dias);
        totalExcluido += r.excluidos;
        resultados[regra.entidade] = { dias: regra.dias, classe: regra.classe, excluidos: r.excluidos, truncado: r.truncado };
      } else {
        const r = await contarAntigos(entity, regra.dias);
        resultados[regra.entidade] = { dias: regra.dias, classe: regra.classe, candidatos_exclusao: r.total, truncado: r.truncado };
      }
    }

    const contatosMinimizados = await minimizarContatosLegados(base44, aplicar);
    const pagamentosMinimizados = await minimizarPagamentos(base44, aplicar);
    const totalMinimizado = contatosMinimizados + pagamentosMinimizados;

    const resumo = {
      versao_politica: VERSAO_POLITICA_RETENCAO,
      modo,
      total_excluido: totalExcluido,
      total_minimizado: totalMinimizado,
      contatos_legados_minimizados: contatosMinimizados,
      pagamentos_transitorios_minimizados: pagamentosMinimizados,
      pagamentos_preservados: true,
      resultados,
    };

    if (aplicar) {
      await base44.asServiceRole.entities.LogRetencaoDados.create({
        executado_em: new Date().toISOString(),
        executado_por_id: user.id,
        modo,
        versao_politica: VERSAO_POLITICA_RETENCAO,
        total_excluido: totalExcluido,
        total_minimizado: totalMinimizado,
        resultados_json: JSON.stringify(resumo),
      });
    }

    return Response.json(resumo);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro ao aplicar política de retenção";
    return Response.json({ error: mensagem }, { status: 500 });
  }
}
