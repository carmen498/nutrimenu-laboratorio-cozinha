import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PixForm({ plano, email, onClose }) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("criarPagamentoMercadoPago", {
        plano,
        forma_pagamento: "pix",
        payer: { email, cpf },
      });
      setResultado(res.data);
    } catch (err) {
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
        <Button variant="ghost" className="w-full" onClick={onClose}>
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
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Gerar QR Code PIX
      </Button>
    </form>
  );
}