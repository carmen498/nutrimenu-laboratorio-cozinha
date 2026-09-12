// Endpoint consumido pelo SERVIDOR do Guia Técnico ZR (zr.nutrimenu.com.br).
// O navegador do leitor faz login pelo SDK e entrega o token ao servidor do Guia;
// o servidor do Guia repassa esse token aqui (header Authorization: Bearer <token>)
// e recebe as faixas compradas ANTES de servir o capítulo.
// Nenhuma chave desta plataforma é necessária no navegador.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { faixasGuiaTecnicoZR } from "../../shared/acessoGuiaTecnicoZR.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized", faixas: [] }, { status: 401 });

    const faixas = await faixasGuiaTecnicoZR(base44, user.id);
    return Response.json({ usuario_id: user.id, email: user.email, faixas });
  } catch (error) {
    return Response.json({ error: error.message, faixas: [] }, { status: 500 });
  }
}