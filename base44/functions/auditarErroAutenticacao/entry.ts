import { createClientFromRequest } from "npm:@base44/sdk";
import { limparSensivel } from "./sanitizacao.js";

const TELAS = new Set(["login", "cadastro", "codigo_otp", "esqueci_senha", "redefinir_senha", "google"]);
const MAX_IP_MINUTO = 5;
const MAX_GLOBAL_MINUTO = 30;
const RETENCAO_DIAS = 30;

function ipCliente(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "indisponivel"
  );
}

async function sha256(valor: string): Promise<string> {
  const bytes = new TextEncoder().encode(valor);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function apagarExpirados(logs: any, agora = new Date()) {
  const limite = new Date(agora.getTime() - RETENCAO_DIAS * 24 * 60 * 60 * 1000).toISOString();
  for (;;) {
    const expirados = await logs.filter({ ocorreu_em: { $lt: limite } }, "ocorreu_em", 100);
    if (!expirados?.length) return;
    await Promise.all(expirados.map((registro: any) => logs.delete(registro.id)));
    if (expirados.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const logs = base44.asServiceRole.entities.LogErroAutenticacao;
    const body = await req.json().catch(() => ({}));

    // A mesma function nova executa a retenção pelo agendamento diário.
    if (body?.acao === "limpar_retencao") {
      await apagarExpirados(logs);
      return Response.json({ ok: true });
    }

    const tela = TELAS.has(String(body.tela)) ? String(body.tela) : "desconhecida";
    const emailInformado = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInformado) ? emailInformado : "";
    const erro = limparSensivel(body.erro);
    if (!erro) return Response.json({ ok: true });

    const agora = new Date();
    const umMinutoAtras = new Date(agora.getTime() - 60_000).toISOString();
    const ipHash = await sha256(ipCliente(req));

    // A própria tabela é a fonte dos dois limites; não há entidade auxiliar.
    const recentes = await logs.filter(
      { ocorreu_em: { $gte: umMinutoAtras } },
      "-ocorreu_em",
      MAX_GLOBAL_MINUTO + 1,
    );
    const totalGlobal = recentes?.length || 0;
    const totalIp = (recentes || []).filter((registro: any) => registro.ip_hash === ipHash).length;
    if (totalGlobal >= MAX_GLOBAL_MINUTO || totalIp >= MAX_IP_MINUTO) {
      return Response.json({ ok: true, limitado: true });
    }

    await logs.create({
      ocorreu_em: agora.toISOString(),
      tela_origem: tela,
      codigo_mensagem_original: erro,
      ...(email ? { email_digitado: email } : {}),
      ip_hash: ipHash,
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Falha isolada na auditoria de autenticação", {
      message: limparSensivel(error?.message || "erro"),
    });
    return Response.json({ ok: true });
  }
});
