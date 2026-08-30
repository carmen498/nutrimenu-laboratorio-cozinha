// Função de diagnóstico: confirma que a validação HMAC do webhook do Mercado Pago
// funciona com o MERCADOPAGO_WEBHOOK_SECRET atual, usando um payload 100% simulado
// (nenhum dado real é lido ou alterado). Gera uma assinatura válida com o secret atual
// e confere que validarAssinatura aceita; depois testa uma assinatura errada e confere
// que é rejeitada.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { validarAssinatura } from "../../shared/validarAssinaturaMercadoPago.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const secretBruto = secrets.get("MERCADOPAGO_WEBHOOK_SECRET");
    const secret = (secretBruto || "").trim();
    if (!secret) {
      return Response.json({ error: "MERCADOPAGO_WEBHOOK_SECRET não configurado" }, { status: 500 });
    }

    const ambiente = (secrets.get("AMBIENTE") || "").trim().toLowerCase();
    const ambienteValido = ambiente === "producao" || ambiente === "sandbox";
    if (!ambienteValido) {
      return Response.json({
        error: 'AMBIENTE deve ser exatamente "producao" ou "sandbox"',
        configuracao_ambiente_valida: false,
      }, { status: 500 });
    }
    const accessToken = ambiente === "producao"
      ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
      : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
    const credencialAmbienteConfigurada = Boolean((accessToken || "").trim());

    // IDs de notificações de payment chegam como número no JSON real.
    // O teste usa esse formato para impedir regressão no toLowerCase/normalização.
    const dataIdSimulado = 123456789012;
    const requestIdSimulado = "req-teste-simulado";
    const tsSimulado = Math.floor(Date.now() / 1000).toString();
    const manifest = `id:${String(dataIdSimulado).toLowerCase()};request-id:${requestIdSimulado};ts:${tsSimulado};`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
    const v1Correto = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Teste 1: assinatura correta, gerada agora mesmo com o secret atual — deve validar.
    const reqValido = new Request("https://exemplo.com/webhook", {
      headers: {
        "x-signature": `ts=${tsSimulado},v1=${v1Correto}`,
        "x-request-id": requestIdSimulado,
      },
    });
    const resultadoValido = await validarAssinatura(reqValido, dataIdSimulado);

    // Teste 2: assinatura propositalmente errada — deve ser rejeitada.
    const reqInvalido = new Request("https://exemplo.com/webhook", {
      headers: {
        "x-signature": `ts=${tsSimulado},v1=0000000000000000000000000000000000000000000000000000000000000000`,
        "x-request-id": requestIdSimulado,
      },
    });
    const resultadoInvalido = await validarAssinatura(reqInvalido, dataIdSimulado);

    return Response.json({
      success: ambienteValido && credencialAmbienteConfigurada && resultadoValido.valida && !resultadoInvalido.valida,
      ambiente_mercadopago: ambiente,
      configuracao_ambiente_valida: ambienteValido,
      credencial_ambiente_configurada: credencialAmbienteConfigurada,
      teste_id_numerico_normalizado: resultadoValido.valida,
      teste_assinatura_correta_deveria_ser_valida: resultadoValido.valida,
      teste_assinatura_errada_deveria_ser_invalida: !resultadoInvalido.valida,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}