import React, { useMemo, useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { IS_PRODUCTION } from "@/lib/mercadoPagoConfig";
import { converterDatasObjetoBrasilia } from "@/lib/fusoBrasilia";

function Linha({ ok, children, warning = false }) {
  const Icon = warning ? AlertTriangle : ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className={`w-4 h-4 mt-0.5 ${warning ? "text-amber-600" : ok ? "text-emerald-600" : "text-destructive"}`} />
      <span>{children}</span>
    </div>
  );
}

export default function GoLivePreflightAdmin() {
  const [data, setData] = useState(null);
  const [hmac, setHmac] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHmac, setLoadingHmac] = useState(false);
  const [error, setError] = useState("");

  const frontendAmbiente = IS_PRODUCTION ? "producao" : "sandbox";
  const ambienteCompativel = useMemo(
    () => Boolean(data?.ambiente) && data.ambiente === frontendAmbiente,
    [data, frontendAmbiente],
  );
  const goFinal = Boolean(data?.go_codigo && ambienteCompativel && hmac?.success === true);

  const executar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("preflightGoLive", {});
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Falha ao executar preflight.");
    } finally {
      setLoading(false);
    }
  };

  const testarHmac = async () => {
    setLoadingHmac(true);
    setError("");
    try {
      const res = await base44.functions.invoke("testarAssinaturaWebhookMP", {});
      setHmac(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Falha ao testar assinatura HMAC.");
      setHmac(null);
    } finally {
      setLoadingHmac(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> QA / Go-live</h2>
            <p className="text-sm text-muted-foreground">Preflight técnico real, sem exibir segredos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={testarHmac} disabled={loadingHmac}>
              {loadingHmac && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Testar HMAC
            </Button>
            <Button onClick={executar} disabled={loading}>
              {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Executar preflight
            </Button>
          </div>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </div>

      {data && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Resultado técnico</h3>
          <Linha ok={data.go_codigo}>Backend sem bloqueios de configuração</Linha>
          <Linha ok={ambienteCompativel}>
            Ambiente Mercado Pago: frontend={frontendAmbiente} / backend={data.ambiente || "não configurado"}
          </Linha>
          <Linha ok={hmac?.success === true}>Webhook HMAC {hmac?.success === true ? "validado" : "ainda não validado nesta sessão"}</Linha>
          <Linha ok={data.credenciais?.mercadopago_ambiente_atual_configurado}>Token do Mercado Pago para o ambiente atual</Linha>
          <Linha ok={data.credenciais?.mercadopago_webhook_secret}>Secret do webhook Mercado Pago</Linha>
          <Linha ok={data.credenciais?.resend_api_key}>Credencial de e-mail transacional</Linha>

          {(data.bloqueios || []).map((item) => <Linha key={item} ok={false}>{item}</Linha>)}
          {(data.avisos || []).map((item) => <Linha key={item} ok={true} warning>{item}</Linha>)}

          <div className={`mt-4 rounded-lg p-3 font-semibold ${goFinal ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {goFinal ? "GO TÉCNICO: preflight e HMAC aprovados." : "AINDA NÃO É GO FINAL: concluir preflight, HMAC e checklist operacional manual."}
          </div>
        </div>
      )}

      {data?.operacao_recente && (
        <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
          <h3 className="font-semibold">Sinais operacionais recentes</h3>
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(converterDatasObjetoBrasilia(data.operacao_recente), null, 2)}</pre>
        </div>
      )}
    </div>
  );
}