import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const INTERVALO_POLLING_MS = 4000;
const TEMPO_MAXIMO_POLLING_MS = 10 * 60 * 1000; // 10 minutos

export default function PixForm({ plano, addonPlanoId = null, somenteAddon = false, email, onClose, onSuccess, aceiteTermos = false }) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [statusFinal, setStatusFinal] = useState(null); // 'rejected' | 'cancelled'
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const tentativaPagamentoRef = useRef(null);

  const pararPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  // Garante que o polling para se a tela/diálogo for desmontado (ex: usuário fechou).
  useEffect(() => pararPolling, []);

  const iniciarPolling = (pagamentoId) => {
    intervalRef.current = setInterval(async () => {
      try {
        const pagamento = await base44.entities.Pagamento.get(pagamentoId);
        if (pagamento.status === "approved") {
          pararPolling();
          onSuccess?.();
        } else if (pagamento.status === "rejected" || pagamento.status === "cancelled") {
          pararPolling();
          tentativaPagamentoRef.current = null;
          setStatusFinal(pagamento.status);
        }
      } catch {
        // Erro pontual na consulta — tenta de novo no próximo ciclo.
      }
    }, INTERVALO_POLLING_MS);

    timeoutRef.current = setTimeout(pararPolling, TEMPO_MAXIMO_POLLING_MS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!aceiteTermos) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para concluir a contratação.");
      return;
    }
    setLoading(true);
    try {
      if (!tentativaPagamentoRef.current) tentativaPagamentoRef.current = crypto.randomUUID();
      const res = await base44.functions.invoke("criarPagamentoMercadoPago", {
        plano,
        ...(addonPlanoId ? { addon_plano_id: addonPlanoId } : {}),
        somente_addon: somenteAddon,
        tentativa_id: tentativaPagamentoRef.current,
        forma_pagamento: "pix",
        aceite_termos: true,
        payer: { email, cpf },
      });
      setResultado(res.data);
      if (res.data?.pagamentoId) iniciarPolling(res.data.pagamentoId);
    } catch (err) {
      const status = err?.response?.data?.status;
      if (["rejected", "cancelled", "estornado"].includes(status)) tentativaPagamentoRef.current = null;
      setError(err?.response?.data?.error || err.message || "Erro ao gerar o PIX.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = () => {
    if (!resultado?.qrCode) return;
    navigator.clipboard.writeText(resultado.qrCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleFechar = () => {
    pararPolling();
    onClose();
  };

  const handleTentarNovamente = () => {
    tentativaPagamentoRef.current = null;
    setStatusFinal(null);
    setResultado(null);
  };

  if (statusFinal) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <XCircle className="w-12 h-12 text-destructive" />
        <p className="font-medium text-foreground">
          {statusFinal === "rejected" ? "Pagamento recusado" : "Pagamento cancelado"}
        </p>
        <p className="text-sm text-muted-foreground">
          {statusFinal === "rejected"
            ? "Não foi possível confirmar o pagamento PIX. Você pode gerar um novo código para tentar de novo."
            : "O código PIX expirou ou foi cancelado. Gere um novo código para tentar de novo."}
        </p>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="w-full" onClick={handleTentarNovamente}>
            Tentar novamente
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleFechar}>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        {resultado.qrCodeBase64 && (
          <img
            src={`data:image/png;base64,${resultado.qrCodeBase64}`}
            alt="QR Code PIX"
            className="w-48 h-48 border border-border rounded-lg"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        {resultado.qrCode && (
          <Button variant="outline" className="w-full" onClick={handleCopiar}>
            {copiado ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copiado ? "Copiado!" : "Copiar código PIX"}
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Escaneie o QR Code ou copie o código para pagar no app do seu banco.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Aguardando confirmação do pagamento...
        </div>
        <Button variant="ghost" className="w-full" onClick={handleFechar}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pix-cpf">CPF</Label>
        <Input
          id="pix-cpf"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          required
          autoComplete="off"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full h-11" disabled={loading || !aceiteTermos}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Gerar QR Code PIX
      </Button>
    </form>
  );
}