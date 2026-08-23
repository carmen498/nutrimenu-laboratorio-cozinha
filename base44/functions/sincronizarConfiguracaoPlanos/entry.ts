import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  CONFIGURACAO_RENOVACAO_CANONICA,
  configuracaoRenovacaoValida,
} from "../../shared/configuracaoPlanoRenovacao.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const corrigirValorCobranca = body?.corrigir_valor_cobranca === true;
    const configs = await base44.asServiceRole.entities.ConfiguracaoPlano.filter({ plano_id: "renovacao" });

    if ((configs || []).length > 1) {
      return Response.json({
        error: "Há mais de uma configuração para o plano renovacao. Corrija a duplicidade antes de sincronizar.",
        code: "configuracao_renovacao_duplicada",
        quantidade: configs.length,
      }, { status: 409 });
    }

    if (!configs?.length) {
      const criada = await base44.asServiceRole.entities.ConfiguracaoPlano.create({ ...CONFIGURACAO_RENOVACAO_CANONICA });
      return Response.json({ ok: true, acao: "criada", configuracao: criada });
    }

    const atual = configs[0];
    if (configuracaoRenovacaoValida(atual)) {
      return Response.json({ ok: true, acao: "mantida", configuracao: atual });
    }

    if (!(Number(atual.valor_cobranca) > 0)) {
      if (!corrigirValorCobranca) {
        return Response.json({
          error: "A configuração de Renovação existe, mas valor_cobranca é inválido. Reexecute autorizando a correção do valor.",
          code: "valor_renovacao_invalido",
          requer_corrigir_valor_cobranca: true,
        }, { status: 409 });
      }
      const atualizada = await base44.asServiceRole.entities.ConfiguracaoPlano.update(atual.id, {
        valor_cobranca: CONFIGURACAO_RENOVACAO_CANONICA.valor_cobranca,
      });
      return Response.json({ ok: true, acao: "valor_cobranca_corrigido", configuracao: atualizada });
    }

    return Response.json({
      error: "A configuração de Renovação está incompleta. Ajuste nome/preço exibido pelo painel; valores válidos não são sobrescritos automaticamente.",
      code: "configuracao_renovacao_incompleta",
    }, { status: 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return Response.json({ error: message }, { status: 500 });
  }
}
