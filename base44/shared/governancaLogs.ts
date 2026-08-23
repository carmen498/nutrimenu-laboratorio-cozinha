export const VERSAO_POLITICA_RETENCAO = "2026-08-23-v1";

export function mascararEmail(email: unknown): string {
  const valor = String(email || "").trim().toLowerCase();
  const [local, dominio] = valor.split("@");
  if (!local || !dominio) return "***";
  const prefixo = local.slice(0, Math.min(2, local.length));
  return `${prefixo}***@${dominio}`;
}

export function mascararTelefone(telefone: unknown): string {
  const digits = String(telefone || "").replace(/\D/g, "");
  if (!digits) return "***";
  return `***${digits.slice(-4)}`;
}

export function resumirErroOperacional(erro: unknown): string {
  let texto = "";
  if (typeof erro === "string") texto = erro;
  else if (erro && typeof erro === "object") {
    const e = erro as Record<string, unknown>;
    texto = String(e.message || e.error || e.detail || "");
  }

  return texto
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email-redigido]")
    .replace(/\b\+?\d[\d\s().-]{8,}\d\b/g, "[telefone-redigido]")
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{24,}\b/g, "[segredo-redigido]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export async function registrarLogEmail(
  base44: any,
  params: {
    usuarioId?: string | null;
    email: string;
    tipo: string;
    resultado: { ok?: boolean; detalhe_completo?: unknown; error?: unknown };
  },
): Promise<void> {
  const status = params.resultado?.ok ? "enviado" : "falhou";
  await base44.asServiceRole.entities.LogEmail.create({
    usuario_id: params.usuarioId || "",
    destinatario_email: mascararEmail(params.email),
    tipo: params.tipo,
    enviado_em: new Date().toISOString(),
    status,
    detalhe_erro: status === "falhou"
      ? resumirErroOperacional(params.resultado?.detalhe_completo || params.resultado?.error)
      : undefined,
  });
}

export async function registrarLogWhatsapp(
  base44: any,
  params: {
    usuarioId?: string | null;
    telefone: string;
    tipo: string;
    modoTeste: boolean;
    status: "enviado" | "falhou" | "simulado";
  },
): Promise<void> {
  await base44.asServiceRole.entities.LogWhatsapp.create({
    usuario_id: params.usuarioId || "",
    destinatario_telefone: mascararTelefone(params.telefone),
    tipo: params.tipo,
    modo_teste: params.modoTeste,
    status: params.status,
  });
}
