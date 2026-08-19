// Função TEMPORÁRIA de diagnóstico: registra o user-agent real de quem acessa
// a página inicial, para identificar por que o Outlook da Carmen não está sendo
// reconhecido pela detecção de navegador interno em index.html.
// Pública (sem auth) porque é chamada antes do usuário estar logado.
// Remover esta função e a chamada em index.html depois que o diagnóstico terminar.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const ua = url.searchParams.get("ua") || req.headers.get("user-agent") || "";
    const urlAcessada = url.searchParams.get("url") || "";

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.LogUserAgentDiagnostico.create({
      user_agent: ua,
      url_acessada: urlAcessada,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}