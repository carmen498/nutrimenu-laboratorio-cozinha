import { createClientFromRequest } from "npm:@base44/sdk";

const TELAS = new Set(["login", "cadastro", "codigo_otp", "esqueci_senha", "redefinir_senha", "google"]);
const MAX_IP_MINUTO = 5;
const MAX_GLOBAL_MINUTO = 30;

function limparSensivel(valor: unknown): string {
  let texto = String(valor || "").slice(0, 2000);
  texto = texto
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REMOVIDO]")
    .replace(/\b(otp|one[_ -]?time[_ -]?code|password|senha|passphrase|token|access[_ -]?token|refresh[_ -]?token|session|cookie|authorization|credential|credencial|secret)\b\s*[:=]\s*[^\s,;}]*/gi, "$1=[REMOVIDO]")
    .replace(/\b\d{6}\b/g, "[CÓDIGO REMOVIDO]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b/g, "[TOKEN REMOVIDO]")
    .replace(/[A-Fa-f0-9]{32,}/g, "[CREDENCIAL REMOVIDA]");
  return texto.replace(/\s+/g, " ").trim().slice(0, 500);
}

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

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const tela = TELAS.has(String(body.tela)) ? String(body.tela) : "desconhecida";
    const emailInformado = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInformado) ? emailInformado : "";
    const erro = limparSensivel(body.erro);
    if (!erro) return Response.json({ ok: true });

    const agora = new Date();
    const janela = agora.toISOString().slice(0, 16);
    const ipHash = await sha256(ipCliente(req));
    const limiteEntity = base44.asServiceRole.entities.LimiteAuditoriaAutenticacao;
    const atuais = await limiteEntity.filter({ janela_minuto: janela }, "-created_date", MAX_GLOBAL_MINUTO + 1);
    const totalGlobal = (atuais || []).reduce((s: number, r: any) => s + Number(r.quantidade || 0), 0);
    const registroIp = (atuais || []).find((r: any) => r.ip_hash === ipHash);
    if (totalGlobal >= MAX_GLOBAL_MINUTO || Number(registroIp?.quantidade || 0) >= MAX_IP_MINUTO) {
      return Response.json({ ok: true, limitado: true });
    }
    if (registroIp) {
      await limiteEntity.update(registroIp.id, { quantidade: Number(registroIp.quantidade || 0) + 1 });
    } else {
      await limiteEntity.create({ janela_minuto: janela, ip_hash: ipHash, quantidade: 1 });
    }

    await base44.asServiceRole.entities.LogErroAutenticacao.create({
      ocorreu_em: agora.toISOString(),
      tela_origem: tela,
      codigo_mensagem_original: erro,
      ...(email ? { email_digitado: email } : {}),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Falha isolada na auditoria de autenticação", {
      message: String(error?.message || "erro").slice(0, 160),
    });
    return Response.json({ ok: true });
  }
});
