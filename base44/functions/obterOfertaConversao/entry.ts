// Devolve (e, na primeira visita elegível, inicia) a oferta de 48 h de primeira
// assinatura para o usuário logado. Chamada pela tela de Planos.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolverOfertaConversao } from "../../shared/ofertaConversao.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const oferta = await resolverOfertaConversao(base44, user, { ativarSeElegivel: true });
    return Response.json(oferta);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}