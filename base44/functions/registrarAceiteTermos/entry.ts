import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { VERSAO_TERMOS_ATUAL, VERSAO_PRIVACIDADE_ATUAL } from "../../shared/versaoDocumentosLegais.ts";
import { normalizarOrigemCadastro, ORIGEM_LABORATORIO } from "../../shared/origemCadastro.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (body.aceitou_termos !== true || body.aceitou_privacidade !== true) {
      return Response.json({ error: "Confirmação explícita dos documentos legais é obrigatória" }, { status: 400 });
    }

    // Se a versão vigente já foi aceita, a operação é idempotente. Uma versão
    // anterior não serve como aceite da versão atual: o usuário deve confirmar
    // novamente pela interface antes de este endpoint ser chamado.
    if (
      user.termos_aceitos_em
      && user.termos_versao_aceita === VERSAO_TERMOS_ATUAL
      && user.privacidade_versao_aceita === VERSAO_PRIVACIDADE_ATUAL
    ) {
      return Response.json({
        success: true,
        already_recorded: true,
        versao: user.termos_versao_aceita,
      });
    }

    const aceitoEm = new Date().toISOString();

    // Origem de cadastro: o frontend grava no sessionStorage quando o usuário
    // passa pela ponte /entrar-no-guia. Quem não vier pela ponte não envia
    // o campo — neste caso, origem = laboratorio_cozinha (cadastro direto).
    const origemRecebida = normalizarOrigemCadastro(body.origem_cadastro);
    const origemCadastro = origemRecebida || ORIGEM_LABORATORIO;

    await base44.asServiceRole.entities.User.update(user.id, {
      termos_aceitos_em: aceitoEm,
      termos_versao_aceita: VERSAO_TERMOS_ATUAL,
      privacidade_versao_aceita: VERSAO_PRIVACIDADE_ATUAL,
      origem_cadastro: origemCadastro,
    });

    return Response.json({
      success: true,
      already_recorded: false,
      aceito_em: aceitoEm,
      versao: VERSAO_TERMOS_ATUAL,
      privacidade_versao: VERSAO_PRIVACIDADE_ATUAL,
      origem_cadastro: origemCadastro,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}