import { createClientFromRequest } from "npm:@base44/sdk";
import { limparSensivel } from "./sanitizacao.js";

const TELAS = new Set(["login", "cadastro", "codigo_otp", "esqueci_senha", "redefinir_senha", "google"]);
const MAX_IP_MINUTO = 5;
const MAX_GLOBAL_MINUTO = 30;
const RETENCAO_LOG_DIAS = 30;
const RETENCAO_LIMITE_MINUTOS = 5;

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

async function apagarEmLotes(entity: any, filtro: Record<string, unknown>, ordenacao: string) {
  for (;;) {
    const expirados = await entity.filter(filtro, ordenacao, 100);
    if (!expirados?.length) return;
    await Promise.all(expirados.map((registro: any) => entity.delete(registro.id)));
    if (expirados.length < 100) return;
  }
}

async function limparRetencao(logs: any, limites: any, agora = new Date()) {
  const limiteLogs = new Date(
    agora.getTime() - RETENCAO_LOG_DIAS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const limiteJanelas = new Date(
    agora.getTime() - RETENCAO_LIMITE_MINUTOS * 60 * 1000,
  ).toISOString().slice(0, 16);

  await Promise.all([
    apagarEmLotes(logs, { ocorreu_em: { $lt: limiteLogs } }, "ocorreu_em"),
    apagarEmLotes(limites, { janela_minuto: { $lt: limiteJanelas } }, "janela_minuto"),
  ]);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const logs = base44.asServiceRole.entities.LogErroAutenticacao;
    const limites = base44.asServiceRole.entities.LimiteAuditoriaAutenticacao;
    const body = await req.json().catch(() => ({}));
    const args = body?.args ?? body;

    if (args?.acao === "limpar_retencao") {
      await limparRetencao(logs, limites);
      return Response.json({ ok: true });
    }

    const tela = TELAS.has(String(args.tela)) ? String(args.tela) : "desconhecida";
    const emailInformado = String(args.email || "").trim().toLowerCase().slice(0, 254);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInformado) ? emailInformado : "";
    const erro = limparSensivel(args.erro);
    if (!erro) return Response.json({ ok: true });

    const agora = new Date();
    const janela = agora.toISOString().slice(0, 16);
    const ipHash = await sha256(ipCliente(req));

    const atuais = await limites.filter(
      { janela_minuto: janela },
      "-created_date",
      MAX_GLOBAL_MINUTO + 1,
    );
    const totalGlobal = (atuais || []).reduce(
      (soma: number, registro: any) => soma + Number(registro.quantidade || 0),
      0,
    );
    const registroIp = (atuais || []).find((registro: any) => registro.ip_hash === ipHash);
    if (totalGlobal >= MAX_GLOBAL_MINUTO || Number(registroIp?.quantidade || 0) >= MAX_IP_MINUTO) {
      return Response.json({ ok: true, limitado: true });
    }

    if (registroIp) {
      await limites.update(registroIp.id, {
        quantidade: Number(registroIp.quantidade || 0) + 1,
      });
    } else {
      await limites.create({ janela_minuto: janela, ip_hash: ipHash, quantidade: 1 });
    }

    await logs.create({
      ocorreu_em: agora.toISOString(),
      tela_origem: tela,
      codigo_mensagem_original: erro,
      ...(email ? { email_digitado: email } : {}),
      ip_hash: ipHash,
    });

    // Retenção oportunística: mesmo sem agenda ativa, cada erro desconhecido
    // remove logs >30 dias e janelas de limite >5 minutos. Como o cliente não
    // aguarda esta function, o fluxo de autenticação nunca fica bloqueado.
    await limparRetencao(logs, limites, agora);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Falha isolada na auditoria de autenticação", {
      message: limparSensivel(error?.message || "erro"),
    });
    return Response.json({ ok: true });
  }
});
