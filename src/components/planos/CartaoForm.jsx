import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { carregarMercadoPagoSdk, MERCADOPAGO_PUBLIC_KEY } from "@/lib/mercadoPagoConfig";
import { maxParcelasPlano } from "@/lib/parcelamentoPlanos";

export default function CartaoForm({ plano, email, onClose, onSuccess, aceiteTermos = false }) {
  const parcelasOpcoes = Array.from({ length: maxParcelasPlano(plano) }, (_, i) => i + 1);
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tentativaPagamentoRef = useRef(null);

  useEffect(() => {
    // Pré-carrega somente quando o formulário de cartão é realmente aberto.
    carregarMercadoPagoSdk().catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!aceiteTermos) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para concluir a contratação.");
      return;
    }
    setLoading(true);
    try {
      const MercadoPago = await carregarMercadoPagoSdk();
      const mp = new MercadoPago(MERCADOPAGO_PUBLIC_KEY);

      const [mes, ano] = validade.split("/").map((v) => v.trim());
      const cardNumberLimpo = numero.replace(/\s/g, "");
      const cpfLimpo = cpf.replace(/\D/g, "");
      if (cpfLimpo.length !== 11) {
        throw new Error("Informe um CPF válido do titular do cartão.");
      }

      const metodos = await mp.getPaymentMethods({ bin: cardNumberLimpo.slice(0, 6) });
      const paymentMethodId = metodos?.results?.[0]?.id;
      if (!paymentMethodId) {
        throw new Error("Não foi possível identificar a bandeira do cartão.");
      }

      const cardToken = await mp.createCardToken({
        cardNumber: cardNumberLimpo,
        cardholderName: nome,
        cardExpirationMonth: mes,
        cardExpirationYear: ano?.length === 2 ? `20${ano}` : ano,
        securityCode: cvv,
        identificationType: "CPF",
        identificationNumber: cpfLimpo,
      });

      if (!tentativaPagamentoRef.current) tentativaPagamentoRef.current = crypto.randomUUID();
      const res = await base44.functions.invoke("criarPagamentoMercadoPago", {
        plano,
        tentativa_id: tentativaPagamentoRef.current,
        forma_pagamento: "cartao",
        aceite_termos: true,
        token: cardToken.id,
        installments: parseInt(parcelas, 10),
        payment_method_id: paymentMethodId,
        payer: { email, cpf: cpfLimpo },
      });

      onSuccess(res.data);
    } catch (err) {
      const status = err?.response?.data?.status;
      if (["rejected", "cancelled", "estornado"].includes(status)) tentativaPagamentoRef.current = null;
      const respostaErro = err?.response?.data;
      const mensagem = respostaErro?.error || err.message || "Erro ao processar o pagamento.";
      const orientacao = respostaErro?.orientacao;
      setError(orientacao ? `${mensagem}. ${orientacao}` : mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cartao-numero">Número do cartão</Label>
        <Input
          id="cartao-numero"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="0000 0000 0000 0000"
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cartao-nome">Nome impresso no cartão</Label>
        <Input
          id="cartao-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cartao-validade">Validade (MM/AA)</Label>
          <Input
            id="cartao-validade"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            placeholder="MM/AA"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cartao-cvv">CVV</Label>
          <Input
            id="cartao-cvv"
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            placeholder="000"
            required
            autoComplete="off"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cartao-cpf">CPF do titular</Label>
        <Input
          id="cartao-cpf"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Parcelas</Label>
        <Select value={parcelas} onValueChange={setParcelas}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parcelasOpcoes.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full h-11" disabled={loading || !aceiteTermos}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Pagar
      </Button>
    </form>
  );
}